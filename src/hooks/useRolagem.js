import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { rolarNotacao } from '../lib/diceNotation'
import { rolarDados } from '../lib/dice'
import { aplicarCritico } from '../lib/criticoEngine'
import { resolverRolagem, paradaComVantagem, escolherRollUnder } from '../lib/resolutionEngine'

// Troca os valores nos índices dados (imutável) — usado na rerolagem (23.4)
function replaceAt(arr, indices, novos) {
  const out = [...(arr || [])]
  indices.forEach((idx, k) => { if (idx >= 0 && idx < out.length) out[idx] = novos[k] })
  return out
}

/**
 * Hook central de rolagem.
 *
 * Uso:
 *   const { registrarRolagem, rolando, erro } = useRolagem()
 *   const resultado = await registrarRolagem({ mesaId, fichaId, rotulo, notacao })
 *
 * Fluxo:
 *   1. rolarNotacao() executa localmente e retorna imediatamente (para a animação)
 *   2. O resultado é inserido na tabela `rolagens` no Supabase
 *   3. O Realtime notifica os outros jogadores — o autor já tem o resultado
 */
export function useRolagem() {
  const { session } = useAuth()
  const [autorNome, setAutorNome] = useState('')
  const [rolando, setRolando] = useState(false)
  const [erro, setErro] = useState('')

  // Busca o username do perfil uma vez por sessão
  useEffect(() => {
    if (!session?.user?.id) return
    supabase
      .from('profiles')
      .select('username')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        if (data?.username) setAutorNome(data.username)
      })
  }, [session?.user?.id])

  /**
   * @param {Object} params
   * @param {string}  params.mesaId   — ID da mesa (obrigatório)
   * @param {string}  [params.fichaId]  — ID da ficha, ou null para rolagem genérica
   * @param {string}  [params.rotulo]   — Ex: "Teste de Força", "Dano — Espada"
   * @param {string}  params.notacao  — Ex: "2d6+3", "1d20"
   * @returns {Promise<{ notacao, individuais, mantidos, descartados, modificador, total }>}
   */
  async function registrarRolagem({ mesaId, fichaId = null, rotulo = null, notacao, sessaoId = null, percentual = 0, critico = null, som = null }) {
    setErro('')
    setRolando(true)

    // 1. Rola localmente — sincronamente, resultado já disponível para a animação
    let resultado
    try {
      resultado = rolarNotacao(notacao)
    } catch (err) {
      setErro(err.message || 'Notação inválida.')
      setRolando(false)
      throw err
    }

    // Fase 22.4 — crítico: multiplica dados+fixos ANTES dos percentuais (contrato:
    // dados+fixos → multiplicador crítico → percentuais → piso).
    let criticoInfo = null
    if (critico?.multiplicador) {
      const dadosTotal = (resultado.mantidos || []).reduce((s, v) => s + (Number(v) || 0), 0)
      const fixos = resultado.total - dadosTotal
      const sub = aplicarCritico({ dadosTotal, fixos, multiplicador: critico.multiplicador, modo: critico.modo })
      criticoInfo = { multiplicador: critico.multiplicador, modo: critico.modo || 'total', antes: resultado.total }
      resultado = { ...resultado, total: sub }
    }

    // Fase 18.3 — percentual de rolagem: aplica sobre o TOTAL (após vant/desv e fixos), piso.
    // Aritmética inteira (× (100+p)/100) p/ evitar o erro de ponto flutuante do × (1+p/100).
    if (percentual) {
      const totalBase = resultado.total
      resultado = {
        ...resultado,
        total: Math.floor(totalBase * (100 + percentual) / 100),
        total_base: totalBase,
        percentual,
      }
    }

    // 2. Persiste no Supabase (aguarda para garantir que o feed dos outros jogadores funcione)
    try {
      const payload = {
        mesa_id: mesaId,
        autor_id: session.user.id,
        autor_nome: autorNome || session.user.email,
        ficha_id: fichaId || null,
        rotulo: rotulo || null,
        notacao: resultado.notacao,
        resultados: {
          dados: resultado.dados,
          individuais: resultado.individuais,
          mantidos: resultado.mantidos,
          descartados: resultado.descartados,
          modificador: resultado.modificador,
          ...(percentual ? { percentual, total_base: resultado.total_base } : {}),
          ...(criticoInfo ? { critico: criticoInfo } : {}),
          // FV.5b — decisão de som já resolvida no cliente que rolou (o preset
          // certo depende de dados só ele tem: item/habilidade da própria ficha)
          ...(som ? { som } : {}),
        },
        total: resultado.total,
      }
      // Só inclui sessao_id quando há sessão (evita depender da coluna antes do ALTER)
      if (sessaoId) payload.sessao_id = sessaoId
      const { error } = await supabase.from('rolagens').insert(payload)
      if (error) throw error
    } catch (err) {
      // A rolagem local aconteceu — apenas exibe o erro sem quebrar a animação
      setErro(err.message || 'Erro ao salvar rolagem no servidor.')
    } finally {
      setRolando(false)
    }

    return resultado
  }

  /**
   * Fase 23.3 — rolagem nos MODOS de resolução (sucessos/roll_under/faixas). O
   * modo soma segue por registrarRolagem (intocado). `valor` é o número que o
   * atributo/perícia contribui: parada (sucessos), alvo (roll_under) ou
   * modificador (faixas). `dificuldade` é o ajuste ad-hoc da rolagem.
   */
  async function registrarResolvida({ mesaId, fichaId = null, sessaoId = null, rotulo = null, resolucao, valor = 0, dificuldade = null, especiaisQtd = 0, vantagem = 'normal' }) {
    setErro('')
    setRolando(true)
    const modo = resolucao?.modo || 'soma'
    const faces = Number(resolucao?.dado) || 10
    let dadosNum = []
    let especiais_idx = []
    let difParam = null
    let notacaoStr = ''
    let dados3D = null
    let descartadoRU = null // 23.6 — o dado não usado no roll_under com vant/desv
    const sufVant = vantagem === 'vantagem' ? ' [vantagem]' : vantagem === 'desvantagem' ? ' [desvantagem]' : ''

    try {
      if (modo === 'sucessos') {
        // Vantagem por modo (23.6): ±2 dados na parada
        const qtd = paradaComVantagem(Number(valor) || 0, vantagem)
        dadosNum = rolarDados(qtd, faces)
        const esp = Math.max(0, Math.min(Math.floor(Number(especiaisQtd) || 0), qtd))
        especiais_idx = Array.from({ length: esp }, (_, i) => i)
        difParam = dificuldade != null && dificuldade !== '' ? Number(dificuldade) : (resolucao.dificuldade_padrao ?? 6)
        notacaoStr = `${qtd}d${faces} (dif ${difParam})${sufVant}`
      } else if (modo === 'roll_under') {
        // Vantagem por modo (23.6): rola 2, pega o menor (vant.) / maior (desv.)
        if (vantagem === 'normal') {
          dadosNum = rolarDados(1, faces)
        } else {
          const { usado, descartado } = escolherRollUnder(rolarDados(2, faces), vantagem)
          descartadoRU = descartado
          dadosNum = [usado]
        }
        difParam = dificuldade != null && dificuldade !== '' ? Number(dificuldade) : (Number(valor) || 0)
        notacaoStr = `1d${faces} ≤ ${difParam}${sufVant}`
      } else if (modo === 'faixas') {
        const nb = resolucao.notacao_base || '2d6'
        const rolado = rolarNotacao(nb)
        dadosNum = rolado.mantidos
        dados3D = rolado.dados
        difParam = Number(valor) || 0
        notacaoStr = `${nb}${difParam > 0 ? `+${difParam}` : difParam < 0 ? `${difParam}` : ''}`
      } else {
        difParam = Number(valor) || 0
      }
    } catch (err) {
      setErro(err.message || 'Notação inválida.')
      setRolando(false)
      throw err
    }

    const estruturado = resolverRolagem({ config: resolucao, dados: dadosNum, dificuldade: difParam, especiais_idx })

    // Dados p/ o 3D no feed + total de compatibilidade (rolagens.total)
    let total
    let dadosFeed
    if (modo === 'sucessos') {
      dadosFeed = (estruturado.dados || []).map(d => ({ lados: faces, valor: d.valor, descartado: false, sucesso: d.sucesso, especial: d.especial, explosao: d.explosao }))
      total = estruturado.sucessos
    } else if (modo === 'roll_under') {
      dadosFeed = [{ lados: faces, valor: estruturado.valor, descartado: false }]
      if (descartadoRU != null) dadosFeed.push({ lados: faces, valor: descartadoRU, descartado: true })
      total = estruturado.valor
    } else if (modo === 'faixas') {
      dadosFeed = dados3D || []
      total = estruturado.total
    } else {
      dadosFeed = []
      total = difParam
    }

    // paramsOriginais: o necessário p/ rerolar (23.4) — a parada ORIGINAL (pré-explosão)
    const paramsOriginais = { config: resolucao, dados: dadosNum, dificuldade: difParam, especiais_idx, faces }
    const resultadoLocal = { notacao: notacaoStr, dados: dadosFeed, mantidos: dadosNum, descartados: [], modificador: 0, total, modo, estruturado, paramsOriginais }

    try {
      const payload = {
        mesa_id: mesaId,
        autor_id: session.user.id,
        autor_nome: autorNome || session.user.email,
        ficha_id: fichaId || null,
        rotulo: rotulo || null,
        notacao: notacaoStr,
        resultados: { dados: dadosFeed, mantidos: dadosNum, descartados: [], modificador: 0 },
        total,
        modo,
        resultado_estruturado: estruturado,
      }
      if (sessaoId) payload.sessao_id = sessaoId
      const { error } = await supabase.from('rolagens').insert(payload)
      if (error) throw error
    } catch (err) {
      setErro(err.message || 'Erro ao salvar rolagem no servidor.')
    } finally {
      setRolando(false)
    }

    return resultadoLocal
  }

  /**
   * Fase 23.4 — rerola os dados nos índices escolhidos (na parada ORIGINAL),
   * re-resolve o contrato inteiro e registra uma NOVA rolagem marcada (↻). O
   * débito do pool acontece ANTES, no chamador (RerolagemBox).
   */
  async function rerolarResolvida({ mesaId, fichaId = null, sessaoId = null, rotulo = null, paramsOriginais, indices = [] }) {
    setErro('')
    setRolando(true)
    const { config: resolucao, faces } = paramsOriginais
    const modo = resolucao?.modo || 'soma'
    const novos = indices.map(() => rolarDados(1, faces)[0])
    const estruturado = resolverRolagem({ ...paramsOriginais, dados: replaceAt(paramsOriginais.dados, indices, novos) })

    let total
    let dadosFeed
    if (modo === 'sucessos') {
      dadosFeed = (estruturado.dados || []).map(d => ({ lados: faces, valor: d.valor, descartado: false, sucesso: d.sucesso, especial: d.especial, explosao: d.explosao }))
      total = estruturado.sucessos
    } else {
      dadosFeed = (estruturado.dados || []).map(d => ({ lados: faces, valor: d.valor, descartado: false }))
      total = estruturado.total ?? estruturado.valor ?? 0
    }
    const notacaoStr = `↻ rerolagem (${indices.length} dado${indices.length === 1 ? '' : 's'})`

    const resultadoLocal = { notacao: notacaoStr, dados: dadosFeed, mantidos: replaceAt(paramsOriginais.dados, indices, novos), descartados: [], modificador: 0, total, modo, estruturado, paramsOriginais: null }

    try {
      const payload = {
        mesa_id: mesaId, autor_id: session.user.id, autor_nome: autorNome || session.user.email,
        ficha_id: fichaId || null,
        rotulo: rotulo ? `↻ ${rotulo}` : '↻ Rerolagem',
        notacao: notacaoStr,
        resultados: { dados: dadosFeed, mantidos: resultadoLocal.mantidos, descartados: [], modificador: 0 },
        total, modo, resultado_estruturado: { ...estruturado, rerolada: true },
      }
      if (sessaoId) payload.sessao_id = sessaoId
      const { error } = await supabase.from('rolagens').insert(payload)
      if (error) throw error
    } catch (err) {
      setErro(err.message || 'Erro ao salvar rerolagem.')
    } finally {
      setRolando(false)
    }
    return resultadoLocal
  }

  /**
   * Registra um EVENTO já resolvido no feed (sem rolar de novo) — usado por
   * efeitos pontuais de habilidade como cura e vida temporária (Fase 12.4).
   * O chamador já calculou o total (e os dados, se rolou); aqui só persiste.
   *
   * @param {Object} params
   * @param {string} params.mesaId
   * @param {string} [params.fichaId]
   * @param {string} params.rotulo  — ex: "Cura — Segundo Fôlego"
   * @param {string} [params.notacao] — ex: "1d10+2" ou "" para fixo
   * @param {number} params.total   — quantidade final (curada / vida temp)
   * @param {Array}  [params.dados] — [{lados, valor, descartado}] se houve rolagem
   */
  async function registrarEvento({ mesaId, fichaId = null, rotulo, notacao = '', total, dados = [], sessaoId = null, aplicavel = null, som = null }) {
    try {
      const payload = {
        mesa_id: mesaId,
        autor_id: session.user.id,
        autor_nome: autorNome || session.user.email,
        ficha_id: fichaId || null,
        rotulo: rotulo || null,
        notacao: notacao || '',
        resultados: {
          dados,
          individuais: dados.map(d => d.valor),
          mantidos: dados.filter(d => !d.descartado).map(d => d.valor),
          descartados: dados.filter(d => d.descartado).map(d => d.valor),
          modificador: 0,
          // F14.6 — marca dano/cura de poder para o mestre aplicar a um alvo no combate
          ...(aplicavel ? { aplicavel } : {}),
          // FV.5b — som da ação já resolvido no cliente que registrou o evento
          ...(som ? { som } : {}),
        },
        total,
      }
      if (sessaoId) payload.sessao_id = sessaoId
      const { error } = await supabase.from('rolagens').insert(payload)
      if (error) throw error
    } catch (err) {
      setErro(err.message || 'Erro ao registrar evento.')
    }
  }

  return { registrarRolagem, registrarResolvida, rerolarResolvida, registrarEvento, rolando, erro, autorNome }
}
