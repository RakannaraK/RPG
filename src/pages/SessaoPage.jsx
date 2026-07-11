import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useSistema } from '../hooks/useSistema'
import { useUpdateFicha } from '../hooks/useFicha'
import { usePresencaSessao } from '../hooks/usePresencaSessao'
import { useSessaoFichas } from '../hooks/useSessaoFichas'
import { usePools } from '../hooks/usePools'
import { planejarTurno } from '../lib/custoHabilidade'
import { useEncontro } from '../hooks/useEncontro'
import { useRolagem } from '../hooks/useRolagem'
import { calcularDescanso } from '../lib/restEngine'
import { planejarDefesa } from '../lib/defesaEngine'
import { ordenarPorIniciativa } from '../lib/iniciativa'
import PresencaBar from '../components/sessao/PresencaBar'
import PainelFichas from '../components/sessao/PainelFichas'
import CombatePanel from '../components/sessao/CombatePanel'
import DescansoGrupo from '../components/sessao/DescansoGrupo'
import FeedRolagens from '../components/dados/FeedRolagens'
import Sininho from '../components/notificacoes/Sininho'

/**
 * Fase 13 — tela da sessão ao vivo.
 *  13.2 — cabeçalho + presença (feito aqui)
 *  13.3 — painel de fichas em tempo real (placeholder abaixo)
 *  13.4 — feed compartilhado (placeholder abaixo)
 */
export default function SessaoPage() {
  const { id: mesaId, sessaoId } = useParams()
  const { session } = useAuth()
  const navigate = useNavigate()

  const [sessao, setSessao] = useState(null)
  const [isMestre, setIsMestre] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [avisoTurno, setAvisoTurno] = useState('') // 20.5 — cobrança de custo por turno
  const [sugestaoDano, setSugestaoDano] = useState(null) // F14.6 — dano de poder a aplicar num alvo

  const { conectados } = usePresencaSessao(sessaoId, mesaId)

  // Sistema da mesa (para o motor de modificadores no painel de fichas)
  const { sistema, racas, classes, habilidades, atributos, pericias } = useSistema(mesaId)
  const { pools } = usePools(sistema?.id) // 20.1
  // construirCard lê formula_modificador/formula_proficiencia do bundle — sem elas,
  // as fórmulas do painel de sessão rodariam sem a regra do sistema.
  const formulaModificador = sistema?.config_layout?.formula_modificador || ''
  const formulaProficiencia = sistema?.config_layout?.formula_proficiencia || ''
  const configSlots = sistema?.config_layout?.slots || null
  const sistemaBundle = useMemo(
    () => ({
      racas, classes, habilidades, atributos, pericias, pools,
      formula_modificador: formulaModificador,
      formula_proficiencia: formulaProficiencia,
      slots: configSlots,
    }),
    [racas, classes, habilidades, atributos, pericias, pools, formulaModificador, formulaProficiencia, configSlots]
  )
  const camposCombate = sistema?.config_layout?.campos_combate || []
  const descansos = sistema?.config_layout?.descansos || []
  const defesaAtiva = sistema?.config_layout?.defesa_ativa || null // 22.6
  const { cards, loading: loadingCards, error: erroCards, conectado } = useSessaoFichas(mesaId, sistemaBundle)

  // Encontro de combate (Fase 14)
  const encontroApi = useEncontro(sessaoId, mesaId)
  const { registrarRolagem, registrarEvento } = useRolagem()
  const { updateFicha } = useUpdateFicha()

  // Iniciativa (14.2): 1d{padrão} + campo de combate cujo nome contenha "inici"
  const dadoPadrao = sistema?.config_layout?.dado_padrao || 20
  const campoIniciativa = camposCombate.find(c => /inici/i.test(c.nome || '')) || null
  // Campo de CA (para condições que afetam a CA, 14.4)
  const campoCa = camposCombate.find(cc => {
    const n = (cc.nome || '').trim().toLowerCase()
    return n === 'ca' || n.includes('armadura') || n.includes('defesa')
  }) || null

  async function handleRolarIniciativa(c) {
    let mod = 0
    if (c.ficha_id && campoIniciativa) {
      const card = cards.find(cd => cd.id === c.ficha_id)
      mod = Number(card?.combate?.[campoIniciativa.id]) || 0
    }
    const notacao = mod > 0 ? `1d${dadoPadrao}+${mod}` : mod < 0 ? `1d${dadoPadrao}${mod}` : `1d${dadoPadrao}`
    const res = await registrarRolagem({ mesaId, sessaoId, rotulo: `Iniciativa — ${c.nome}`, notacao })
    await encontroApi.atualizarCombatente(c.id, { iniciativa: res.total })
  }

  async function handleRolarIniciativaTodos() {
    for (const c of encontroApi.combatentes) {
      await handleRolarIniciativa(c)
    }
  }

  function handleSetIniciativa(id, val) {
    return encontroApi.atualizarCombatente(id, { iniciativa: val === '' ? null : Number(val) })
  }

  // Ordem de iniciativa dos combatentes (mesma dos turnos). Usada p/ achar quem
  // age agora (custo por turno 20.5; atacante da defesa ativa 22.6).
  const ordemIniciativa = () => ordenarPorIniciativa(encontroApi.combatentes)

  // Aplica dano (delta<0) ou cura (delta>0) a um combatente (14.5).
  // Jogador → HP da ficha (vida temp consumida antes); inimigo → HP do combatente.
  // rotuloCustom (22.6) substitui a narração padrão do feed, se informado.
  async function handleAplicarHp(c, delta, rotuloCustom = null) {
    if (!delta) return
    try {
      if (c.ficha_id) {
        const card = cards.find(cd => cd.id === c.ficha_id)
        if (!card) return
        const max = card.hpMax || card.hpMaxBase || 0
        let hp = card.hpAtual ?? 0
        if (delta < 0) {
          let dano = -delta
          let temp = card.ficha?.vida_temp_atual ?? 0
          const patch = {}
          if (temp > 0) {
            const consumido = Math.min(temp, dano)
            temp -= consumido; dano -= consumido
            patch.vida_temp_atual = temp
          }
          patch.hp_atual = hp - dano
          await updateFicha(c.ficha_id, patch)
        } else {
          await updateFicha(c.ficha_id, { hp_atual: max > 0 ? Math.min(max, hp + delta) : hp + delta })
        }
      } else {
        let hp = c.hp_atual ?? 0
        const max = c.hp_maximo
        const novo = delta > 0 && max != null ? Math.min(max, hp + delta) : hp + delta
        await encontroApi.atualizarCombatente(c.id, { hp_atual: novo })
      }
      await registrarEvento({
        mesaId, sessaoId, fichaId: c.ficha_id || null,
        rotulo: rotuloCustom || `${c.nome} ${delta < 0 ? `sofreu ${-delta} de dano` : `recuperou ${delta} de vida`}`,
        notacao: '', total: Math.abs(delta), dados: [],
      })
    } catch {
      // silenciado — sem permissão (RLS) ou falha de rede não deve quebrar a UI
    }
  }

  // ---- Defesa ativa (22.6) — fluxo assíncrono no combate ----
  // O mestre PEDE a defesa: grava o pedido no combatente-alvo (Realtime). O
  // atacante é quem age agora (turno atual). Consome o dano de poder pendente.
  async function handlePedirDefesa(alvo, { ataque, dano }) {
    const idx = encontroApi.encontro?.turno_atual ?? 0
    const atacante = ordemIniciativa()[idx] || null
    const pendente = {
      ataque: Number(ataque) || 0,
      dano: Number(dano) || 0,
      atacante_combatente_id: atacante && atacante.id !== alvo.id ? atacante.id : null,
      atacante_nome: atacante && atacante.id !== alvo.id ? atacante.nome : null,
      solicitado_em: new Date().toISOString(),
      resposta: null,
    }
    await encontroApi.atualizarCombatente(alvo.id, { defesa_pendente: pendente })
    setSugestaoDano(null)
  }

  // O DEFENSOR responde: grava a escolha + total no PRÓPRIO combatente (mesma
  // permissão de definir a iniciativa). O mestre então resolve.
  async function handleResponderDefesa(alvo, resposta) {
    const dp = alvo.defesa_pendente
    if (!dp) return
    await encontroApi.atualizarCombatente(alvo.id, {
      defesa_pendente: { ...dp, resposta: { ...resposta, respondido_em: new Date().toISOString() } },
    })
  }

  // O MESTRE resolve: o motor puro decide dano/condição/narração; aqui só os
  // efeitos (HP, condição no atacante, feed). Sem resposta = dano cheio. Limpa.
  async function handleResolverDefesa(alvo) {
    const dp = alvo.defesa_pendente
    if (!dp) return
    const plano = planejarDefesa(dp, defesaAtiva || {}, alvo.nome)
    if (!plano) return

    if (plano.condicao) {
      try {
        await encontroApi.aplicarCondicao(plano.condicao.combatente_id, {
          nome: plano.condicao.nome, descricao: plano.condicao.descricao, duracaoRodadas: plano.condicao.duracao_rodadas,
        })
      } catch { /* RLS — segue sem a condição */ }
    }
    if (plano.danoFinal > 0) await handleAplicarHp(alvo, -plano.danoFinal, plano.narracao)
    else await registrarEvento({ mesaId, sessaoId, fichaId: alvo.ficha_id || null, rotulo: plano.narracao, notacao: '', total: 0, dados: [] })
    await encontroApi.atualizarCombatente(alvo.id, { defesa_pendente: null })
  }

  const handleCancelarDefesa = (alvo) => encontroApi.atualizarCombatente(alvo.id, { defesa_pendente: null })

  // F14.6 — dano de poder rolado por um jogador vira sugestão para o mestre lançar
  // num alvo do combate. Só o mestre; o próprio handleAplicarHp já registra no feed.
  function aoNovaRolagem(rolagem) {
    if (!isMestre || !sessao?.ativa) return
    const ap = rolagem?.resultados?.aplicavel
    if (ap?.tipo === 'dano' && Number(ap.valor) > 0) {
      setSugestaoDano({ valor: Number(ap.valor), origem: ap.origem || '', autor: rolagem.autor_nome || '' })
    }
  }

  async function aplicarSugestaoDano(combatente) {
    if (!sugestaoDano) return
    await handleAplicarHp(combatente, -sugestaoDano.valor)
    setSugestaoDano(null)
  }

  // Descanso do grupo (15.4): calcula e aplica por ficha; retorna resumo por personagem.
  // Requer RLS de UPDATE em fichas e habilidades_ficha para o mestre (senão só o próprio dono).
  async function handleDescansoGrupo(tipo) {
    const fichaIds = cards.map(c => c.id)
    let habsRows = []
    if (fichaIds.length) {
      const { data } = await supabase.from('habilidades_ficha').select('*').in('ficha_id', fichaIds)
      habsRows = data || []
    }
    const itens = []
    for (const card of cards) {
      const hfList = habsRows
        .filter(r => r.ficha_id === card.id)
        .map(r => ({ ...r, habilidade: habilidades.find(h => h.id === r.habilidade_id) || null }))
      const resultado = calcularDescanso({
        tipoDescanso: tipo,
        ficha: card.ficha,
        valoresFinais: { vida_max: card.hpMax },
        habilidadesFicha: hfList,
        // 17.5 — contexto p/ fórmulas do descanso (nível/vida; atributos não estão no card)
        contexto: {
          nivel: card.ficha?.nivel ?? 1,
          vida_atual: card.ficha?.hp_atual ?? 0,
          vida_max: card.hpMax ?? 0,
          atributos: {}, recursos: {},
          formulaModificador: sistema?.config_layout?.formula_modificador || '',
        },
      })
      const patch = { hp_atual: resultado.vida.para }
      if (resultado.vida_temp.para !== resultado.vida_temp.de) patch.vida_temp_atual = resultado.vida_temp.para
      try { await updateFicha(card.id, patch) } catch { /* RLS */ }
      for (const r of resultado.recursos) {
        try { await supabase.from('habilidades_ficha').update({ recurso_atual: r.para }).eq('id', r.habilidadeFichaId) } catch { /* RLS */ }
      }
      try {
        await supabase.from('descansos_log').insert({
          ficha_id: card.id, sessao_id: sessaoId, tipo_descanso: tipo.nome,
          recuperado: { vida: resultado.vida.recuperado, recursos: resultado.recursos },
        })
      } catch { /* log opcional */ }
      itens.push({ nome: card.nome, resumo: resultado.resumo })
    }
    await registrarEvento({
      mesaId, sessaoId,
      rotulo: `O grupo fez um ${tipo.nome} — todos recuperados`,
      notacao: '', total: 0, dados: [],
    })
    return itens
  }

  // Avança turno e avisa no feed as condições que expiraram na virada de rodada (14.4)
  async function handleProximoTurno() {
    const res = await encontroApi.proximoTurno()
    for (const cond of res?.expiradas || []) {
      await registrarEvento({
        mesaId, sessaoId,
        rotulo: `${cond.nome} expirou em ${cond.combatenteNome}`,
        notacao: '', total: 0, dados: [],
      })
    }
    await cobrarCustoDoTurno(res?.turno)
  }

  /**
   * Fase 20.5 — ao entrar o turno de um personagem, cobra os custos recorrentes
   * das habilidades ativas dele (transformações). Quem não paga, desativa.
   *
   * O mestre não pode escrever no pools_ficha de outro jogador (RLS), então o
   * plano é calculado aqui pelo motor puro e persistido pela RPC SECURITY DEFINER.
   */
  async function cobrarCustoDoTurno(indiceTurno) {
    if (indiceTurno == null) return
    const combatente = ordemIniciativa()[indiceTurno]
    const fichaId = combatente?.ficha_id
    if (!fichaId) return

    const card = cards.find(c => c.id === fichaId)
    const ct = card?.custosTurno
    if (!ct?.habilidadesAtivas?.length) return

    const plano = planejarTurno(ct.habilidadesAtivas, {
      atualDoPool: id => ct.atualPorPool[id] ?? 0,
      poolsPorId: ct.poolsPorId,
      contexto: ct.contexto,
    })
    if (plano.debitos.length === 0 && plano.desativar.length === 0) return

    try {
      const { error: err } = await supabase.rpc('pagar_custo_turno', {
        p_ficha_id: fichaId,
        p_debitos: plano.debitos,
        p_desativar: plano.desativar,
      })
      if (err) throw err
    } catch (err) {
      // Não quebra o combate, mas avisa o mestre que o custo por turno não foi cobrado.
      const nome = card?.nome || 'o personagem'
      setAvisoTurno(`Custo por turno de ${nome} não foi cobrado: ${err.message || 'erro na cobrança'}. Ajuste os recursos na mão.`)
      return
    }

    for (const aviso of plano.avisos) {
      await registrarEvento({ mesaId, sessaoId, rotulo: aviso, notacao: '', total: 0, dados: [] })
    }
  }

  // Aba ativa no mobile (no desktop painel e feed aparecem lado a lado)
  const [abaMobile, setAbaMobile] = useState('fichas')

  useEffect(() => {
    async function carregar() {
      setLoading(true)
      setError('')
      try {
        const { data, error: err } = await supabase
          .from('sessoes')
          .select('*')
          .eq('id', sessaoId)
          .maybeSingle()
        if (err) throw err
        // RLS: não-membros não recebem a sessão
        if (!data) throw new Error('Sessão não encontrada ou você não tem acesso a ela.')
        setSessao(data)
        // Gestor = criador OU co-mestre (controles de combate/descanso) — Fase 16.5
        const { data: mesaData } = await supabase
          .from('mesas')
          .select('criador_id')
          .eq('id', mesaId)
          .maybeSingle()
        let gestor = mesaData?.criador_id === session.user.id
        if (!gestor) {
          const { data: membro } = await supabase
            .from('membros_mesa')
            .select('role')
            .eq('mesa_id', mesaId)
            .eq('usuario_id', session.user.id)
            .maybeSingle()
          gestor = membro?.role === 'co-mestre'
        }
        setIsMestre(gestor)
      } catch (err) {
        setError(err.message || 'Erro ao carregar sessão.')
      } finally {
        setLoading(false)
      }
    }
    if (session && sessaoId) carregar()
  }, [session, sessaoId, mesaId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-950 via-slate-900 to-black">
        <div className="text-purple-400 text-lg">Carregando sessão...</div>
      </div>
    )
  }

  if (error || !sessao) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-950 via-slate-900 to-black">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || 'Sessão não encontrada.'}</p>
          <button
            onClick={() => navigate(`/mesa/${mesaId}`)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            Voltar à mesa
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-slate-900 to-black">
      {/* Cabeçalho */}
      <header className="border-b border-purple-800 px-4 sm:px-6 py-4 sticky top-0 z-20 bg-slate-950/80 backdrop-blur">
        <div className="max-w-7xl mx-auto flex items-center gap-4 flex-wrap">
          <button
            onClick={() => navigate(`/mesa/${mesaId}`)}
            className="text-purple-400 hover:text-white transition-colors text-sm shrink-0"
          >
            ← Sair da sessão
          </button>
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-white font-bold text-xl leading-tight truncate">
              {sessao.titulo || 'Sessão'}
            </h1>
            {sessao.ativa ? (
              <span className="inline-flex items-center gap-1.5 text-red-300 text-[11px] font-bold uppercase tracking-wider shrink-0">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                Ao vivo
              </span>
            ) : (
              <span className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider shrink-0">
                Encerrada
              </span>
            )}
          </div>
          <div className="ml-auto shrink-0 flex items-center gap-3">
            <Sininho />
            <span
              className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${
                conectado ? 'text-emerald-300' : 'text-amber-300'
              }`}
              title={conectado ? 'Tempo real conectado' : 'Reconectando ao tempo real...'}
            >
              <span className={`w-2 h-2 rounded-full ${conectado ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
              <span className="hidden sm:inline">{conectado ? 'Conectado' : 'Reconectando…'}</span>
            </span>
            <PresencaBar conectados={conectados} meuId={session?.user?.id} />
          </div>
        </div>
      </header>

      {/* Corpo: painel de fichas + feed */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* 20.5 — aviso ao mestre quando a cobrança de custo por turno falha */}
        {avisoTurno && (
          <div className="mb-4 rounded-xl border border-amber-700/70 bg-amber-950/40 px-4 py-3 flex items-start gap-3">
            <span className="text-amber-400 shrink-0">⚠</span>
            <p className="text-amber-200 text-sm flex-1">{avisoTurno}</p>
            <button
              onClick={() => setAvisoTurno('')}
              className="text-amber-500 hover:text-amber-200 transition-colors text-sm shrink-0"
              title="Dispensar"
            >
              ✕
            </button>
          </div>
        )}

        {!sessao.ativa && (
          <div className="mb-4 rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-purple-300 text-sm">
            Esta sessão foi encerrada. Você está vendo o registro dela.
          </div>
        )}

        {/* Painel de combate (Fase 14) — só em sessão ativa */}
        {sessao.ativa && (
          <CombatePanel
            encontro={encontroApi.encontro}
            combatentes={encontroApi.combatentes}
            condicoes={encontroApi.condicoes}
            campoCaId={campoCa?.id || null}
            isMestre={isMestre}
            meuUserId={session?.user?.id}
            mesaId={mesaId}
            sessaoId={sessaoId}
            fichasSessao={cards}
            onIniciar={encontroApi.iniciarCombate}
            onEncerrar={encontroApi.encerrarCombate}
            onAdicionarJogadores={encontroApi.adicionarJogadores}
            onAdicionarInimigos={encontroApi.adicionarInimigos}
            onRemoverCombatente={encontroApi.removerCombatente}
            onRolarIniciativa={handleRolarIniciativa}
            onRolarIniciativaTodos={handleRolarIniciativaTodos}
            onSetIniciativa={handleSetIniciativa}
            onProximoTurno={handleProximoTurno}
            onTurnoAnterior={encontroApi.turnoAnterior}
            onAplicarCondicao={encontroApi.aplicarCondicao}
            onRemoverCondicao={encontroApi.removerCondicao}
            onAplicarHp={handleAplicarHp}
            onReordenar={encontroApi.reordenar}
            sugestaoDano={sugestaoDano}
            onAplicarSugestao={aplicarSugestaoDano}
            onLimparSugestao={() => setSugestaoDano(null)}
            defesaAtiva={defesaAtiva}
            atributosSistema={atributos || []}
            onPedirDefesa={handlePedirDefesa}
            onResponderDefesa={handleResponderDefesa}
            onResolverDefesa={handleResolverDefesa}
            onCancelarDefesa={handleCancelarDefesa}
          />
        )}

        {/* Descanso do grupo (Fase 15.4) — só mestre, sessão ativa, se houver descansos */}
        {sessao.ativa && isMestre && descansos.length > 0 && (
          <DescansoGrupo descansos={descansos} onDescansar={handleDescansoGrupo} />
        )}

        {/* Abas — só no mobile */}
        <div className="flex lg:hidden gap-2 mb-4">
          <button
            onClick={() => setAbaMobile('fichas')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              abaMobile === 'fichas' ? 'bg-purple-700 text-white' : 'bg-slate-800 text-purple-300'
            }`}
          >
            Personagens
          </button>
          <button
            onClick={() => setAbaMobile('feed')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              abaMobile === 'feed' ? 'bg-purple-700 text-white' : 'bg-slate-800 text-purple-300'
            }`}
          >
            Rolagens
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Painel de fichas (13.3) */}
          <div className={`flex-1 min-w-0 w-full ${abaMobile === 'fichas' ? 'block' : 'hidden'} lg:block`}>
            <p className="hidden lg:block text-purple-300 text-sm font-medium mb-3">Personagens na sessão</p>
            <PainelFichas
              cards={cards}
              camposCombate={camposCombate}
              loading={loadingCards}
              error={erroCards}
            />
          </div>

          {/* Feed compartilhado (13.4) */}
          <aside className={`w-full lg:w-80 xl:w-96 shrink-0 ${abaMobile === 'feed' ? 'block' : 'hidden'} lg:block`}>
            <p className="hidden lg:block text-purple-300 text-sm font-medium mb-3">
              {sessao.ativa ? 'Rolagens' : 'Rolagens da sessão'}
            </p>
            {sessao.ativa ? (
              <FeedRolagens mesaId={mesaId} onNovaRolagem={aoNovaRolagem} />
            ) : (
              <FeedRolagens
                mesaId={mesaId}
                desde={sessao.iniciada_em}
                ate={sessao.encerrada_em}
                aoVivo={false}
              />
            )}
          </aside>
        </div>
      </div>
    </div>
  )
}
