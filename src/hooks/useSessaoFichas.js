import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { coletarModificadores, calcularValoresFinais, agregarDefesas, resolverValoresFormula, listarCondicoesManuais } from '../lib/modifierEngine'
import { resolverFaixas } from '../lib/faixas'
import { avaliarFormula } from '../lib/formulaEngine'
import { calcularMaximos, mapaPools, atualDePool } from '../lib/poolEngine'
import { slotsTotais, usadosPorCirculo, slotsDisponiveis, slotsAtivos } from '../lib/slotsEngine'

function groupBy(rows, key) {
  const out = {}
  for (const r of rows || []) {
    if (!out[r[key]]) out[r[key]] = []
    out[r[key]].push(r)
  }
  return out
}

/**
 * Constrói o "card" computado de uma ficha para o painel da sessão, passando os
 * valores pelo motor de modificadores (Fases 9-12). Puro — sem acesso a banco.
 */
function construirCard(fichaRow, habsRows, condRows, combateRows, sis, classesRows, poolsRows, slotsRows, itensRows, atributosRows) {
  const raca = (sis.racas || []).find(r => r.id === fichaRow.raca_id) || null
  const classe = (sis.classes || []).find(c => c.id === fichaRow.classe_id) || null

  // Fase 19 — multiclasse. Sem linhas em classes_ficha (ficha não migrada ou
  // sistema sem classes), cai no fallback legado: uma classe, nivel da ficha.
  const linhasClasse = [...(classesRows || [])].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
  const classesDaFicha = linhasClasse
    .map(r => (sis.classes || []).find(c => c.id === r.classe_id))
    .filter(Boolean)
  const classesParaMotor = classesDaFicha.length ? classesDaFicha : (classe ? [classe] : [])
  const nivelTotal = linhasClasse.length
    ? linhasClasse.reduce((s, r) => s + (Number(r.nivel) || 0), 0)
    : (fichaRow.nivel ?? 1)

  // 19.4 — mapa p/ faixas com variável "nivel:<classe>"
  const niveisClasse = {}
  if (linhasClasse.length) {
    for (const r of linhasClasse) {
      const n = Number(r.nivel) || 0
      niveisClasse[r.classe_id] = n
      const c = (sis.classes || []).find(x => x.id === r.classe_id)
      if (c?.nome) niveisClasse[c.nome] = n
    }
  } else if (classe) {
    niveisClasse[classe.id] = nivelTotal
    if (classe.nome) niveisClasse[classe.nome] = nivelTotal
  }

  const habilidadesFicha = (habsRows || []).map(row => ({
    ...row,
    habilidade: (sis.habilidades || []).find(h => h.id === row.habilidade_id) || null,
  }))
  const habilidadesAtivas = new Set(
    habilidadesFicha
      .filter(hf => hf.habilidade && (hf.habilidade.tipo === 'passiva' || hf.ativa === true))
      .map(hf => hf.habilidade.id)
  )
  const condicoesManuais = {}
  for (const r of condRows || []) condicoesManuais[r.modificador_id] = r.ativa === true

  const estadoFicha = {
    vida_atual: fichaRow.hp_atual ?? 0,
    vida_max: fichaRow.hp_maximo ?? 0, // BASE — evita circularidade (igual FichaPage)
    nivel: nivelTotal,
    niveisClasse, // 19.5 — requisito de nível medido pela classe de origem
    habilidadesAtivas,
  }
  // 17.5 — contexto de fórmula de modificador (sem atributos, anti-auto-ref)
  const recursosCtx = {}
  for (const hf of habilidadesFicha) {
    const h = hf.habilidade
    if (h?.recurso_max != null) {
      const v = hf.recurso_atual ?? h.recurso_max
      if (h.recurso_nome) recursosCtx[h.recurso_nome] = v
      if (h.id) recursosCtx[h.id] = v
    }
  }
  // 20.1 — pools: máximo derivado da fórmula (atributos BASE, evita ciclo)
  const poolsSistema = sis.pools || []
  const ctxPools = {
    nivel: nivelTotal,
    niveisClasse,
    formula_proficiencia: sis.formula_proficiencia || '',
    formulaModificador: sis.formula_modificador || '',
    atributos: {},
    vida_atual: fichaRow.hp_atual ?? 0,
    vida_max: fichaRow.hp_maximo ?? 0,
    recursos: recursosCtx,
    pericias: {},
  }
  const { maximos: maximosPools } = calcularMaximos(poolsSistema, ctxPools)
  const poolsMap = mapaPools(poolsSistema, poolsRows || [], maximosPools)
  const poolsCard = poolsSistema
    .filter(p => p.visivel_ficha !== false)
    .map(p => ({
      id: p.id,
      nome: p.nome,
      tipo: p.tipo,
      atual: atualDePool((poolsRows || []).find(l => l.pool_id === p.id), maximosPools[p.id] ?? 0),
      maximo: maximosPools[p.id] ?? 0,
    }))

  // 20.6 — slots por círculo, visíveis ao mestre na sessão (total derivado da grade)
  const configSlotsCard = { slots: sis.slots }
  let slotsCard = []
  if (slotsAtivos(configSlotsCard)) {
    const classesComNivel = linhasClasse.length
      ? linhasClasse
      : (classe ? [{ classe_id: classe.id, nivel: nivelTotal }] : [])
    const totais = slotsTotais(configSlotsCard, classesComNivel)
    const usados = usadosPorCirculo(slotsRows || [])
    const disp = slotsDisponiveis(totais, usados)
    slotsCard = Object.keys(totais).map(Number).sort((a, b) => a - b).map(c => ({
      circulo: c, total: totais[c], disponivel: disp[c],
    }))
  }

  const ctxMod = {
    nivel: nivelTotal,
    niveisClasse,
    formula_proficiencia: sis.formula_proficiencia || '',
    pools: poolsMap,
    vida_atual: fichaRow.hp_atual ?? 0,
    vida_max: fichaRow.hp_maximo ?? 0,
    recursos: recursosCtx,
    pericias: {},
    formulaModificador: (sis.formula_modificador || ''),
  }
  // 19.4 — faixa ativa antes das fórmulas (mesma ordem do FichaPage)
  const modificadoresAtivos = resolverValoresFormula(
    resolverFaixas(
      coletarModificadores({ raca, classes: classesParaMotor, habilidadesFicha, itens: itensRows || [], estadoFicha, condicoesManuais }),
      ctxMod
    ),
    ctxMod
  )

  const baseCombate = {}
  for (const r of combateRows || []) {
    const n = Number(r.valor)
    if (!Number.isNaN(n)) baseCombate[r.campo_id] = n
  }
  const base = { atributos: {}, vida_max: fichaRow.hp_maximo ?? 0, combate: baseCombate }
  const valoresFinais = calcularValoresFinais(base, modificadoresAtivos)
  const defesas = agregarDefesas(modificadoresAtivos)

  // 22.7 — campos de combate CALCULADOS (F17.4) no card da sessão. Precisam dos
  // atributos FINAIS (base + mods), computados à parte (os mods não dependem de
  // campo de combate → sem ciclo). Antes ficavam "—" na sessão (só a ficha
  // computava). Inclui "CA sem armadura" e derivados como "Ações extras".
  const baseAtributos = {}
  for (const r of atributosRows || []) baseAtributos[r.atributo_id] = r.valor ?? 0
  const finaisAttr = calcularValoresFinais({ atributos: baseAtributos, vida_max: 0, combate: {} }, modificadoresAtivos).atributos
  const atributosCtx = {}
  for (const a of sis.atributos || []) {
    const v = finaisAttr[a.id]
    if (v != null) { atributosCtx[a.id] = v; if (a.nome) atributosCtx[a.nome] = v }
  }
  const ctxCalc = { ...ctxMod, atributos: atributosCtx }
  const camposCombate = sis.campos_combate || []
  const combateCalculado = { ...valoresFinais.combate }
  const derivadosCombate = [] // 22.7 — calculados marcados "exibir no combate"
  for (const campo of camposCombate) {
    if (campo.tipo !== 'calculado' || !campo.formula) continue
    let valor = null
    try { valor = avaliarFormula(campo.formula, ctxCalc) } catch { valor = null }
    if (valor != null) combateCalculado[campo.id] = valor
    if (campo.exibir_combate) derivadosCombate.push({ id: campo.id, nome: campo.nome, valor })
  }

  // 22.7 — interruptores de condição manual (F12) p/ o dono ligar/desligar na
  // sessão (ex: CA situacional 17/19/21). Ativos+inativos, com o delta na CA.
  const caCampo = camposCombate.find(cc => {
    const n = (cc.nome || '').trim().toLowerCase()
    return n === 'ca' || n.includes('armadura') || n.includes('defesa')
  }) || null
  const togglesVistos = new Set()
  const togglesManuais = []
  for (const m of listarCondicoesManuais({ raca, classe, classes: classesParaMotor, habilidadesFicha, itens: itensRows || [], estadoFicha })) {
    const rotulo = (m.condicao_config?.rotulo || '').trim() || 'Condição'
    if (togglesVistos.has(m.id)) continue
    togglesVistos.add(m.id)
    const mexeCa = caCampo && m.tipo === 'combate' && m.alvo === caCampo.id
    togglesManuais.push({
      id: m.id, rotulo,
      ativo: condicoesManuais[m.id] === true,
      caDelta: mexeCa && m.valor != null ? Number(m.valor) : null,
    })
  }

  // Mapa id→nome para rótulos de vantagem/desvantagem
  const nomes = {}
  ;(sis.atributos || []).forEach(a => { if (a?.id) nomes[a.id] = a.nome })
  ;(sis.pericias || []).forEach(p => { if (p?.id) nomes[p.id] = p.nome })

  // Chips de estado: habilidades ativáveis ligadas + condições manuais ativas + vantagens
  const chips = []
  for (const hf of habilidadesFicha) {
    if (hf.habilidade?.tipo === 'ativavel' && hf.ativa === true) {
      const hab = hf.habilidade
      const rec = hab.recurso_max != null ? ` ${hf.recurso_atual ?? hab.recurso_max}/${hab.recurso_max}` : ''
      chips.push({ key: `hab-${hf.id}`, tipo: 'habilidade', label: `${hab.nome}${rec}` })
    }
  }
  const rotulosVistos = new Set()
  for (const m of modificadoresAtivos) {
    if (m.condicao_tipo === 'manual') {
      const rot = (m.condicao_config?.rotulo || '').trim() || 'Condição'
      if (!rotulosVistos.has(rot)) {
        rotulosVistos.add(rot)
        chips.push({ key: `cond-${rot}`, tipo: 'condicao', label: rot })
      }
    }
  }
  const vantVistos = new Set()
  for (const m of modificadoresAtivos) {
    if (m.tipo === 'vantagem' || m.tipo === 'desvantagem') {
      const alvoNome = nomes[m.alvo] || ''
      const label = `${m.tipo === 'vantagem' ? 'Vantagem' : 'Desvantagem'}${alvoNome ? `: ${alvoNome}` : ''}`
      if (!vantVistos.has(label)) {
        vantVistos.add(label)
        chips.push({ key: `vant-${label}`, tipo: m.tipo, label })
      }
    }
  }

  const vidaTempEfetiva = Math.max(
    Number(valoresFinais.vida_temp) || 0,
    Number(fichaRow.vida_temp_atual) || 0
  )

  return {
    id: fichaRow.id,
    ficha: fichaRow,
    nome: fichaRow.nome_personagem,
    imagem: fichaRow.imagem_url,
    nivel: nivelTotal,
    pools: poolsCard, // 20.1 — recursos visíveis ao mestre na sessão
    slots: slotsCard, // 20.6 — slots por círculo, ao vivo
    // 20.5 — tudo que o mestre precisa para cobrar o custo por turno desta ficha
    custosTurno: {
      habilidadesAtivas: habilidadesFicha.filter(hf => hf.ativa === true && hf.habilidade),
      atualPorPool: Object.fromEntries(poolsSistema.map(p => [
        p.id,
        atualDePool((poolsRows || []).find(l => l.pool_id === p.id), maximosPools[p.id] ?? 0),
      ])),
      poolsPorId: Object.fromEntries(poolsSistema.map(p => [p.id, p])),
      contexto: ctxMod,
    },
    racaNome: raca?.nome || fichaRow.raca || null,
    // Multiclasse: "Bárbaro 9 / Paladino 4"; uma classe: só o nome (como antes)
    classeNome: linhasClasse.length > 1
      ? linhasClasse
          .map(r => {
            const c = (sis.classes || []).find(x => x.id === r.classe_id)
            return c ? `${c.nome} ${r.nivel}` : null
          })
          .filter(Boolean)
          .join(' / ')
      : (classesDaFicha[0]?.nome || classe?.nome || fichaRow.classe || null),
    hpAtual: fichaRow.hp_atual ?? 0,
    hpMax: valoresFinais.vida_max,
    hpMaxBase: fichaRow.hp_maximo ?? 0,
    vidaTemp: vidaTempEfetiva,
    combate: combateCalculado, // 22.7 — inclui os campos calculados (CA calc./derivados)
    derivadosCombate,          // 22.7 — calculados marcados "exibir no combate"
    togglesManuais,            // 22.7 — interruptores situacionais (ex: CA 17/19/21)
    defesas,
    chips,
    modificadoresAtivos, // 14.6 — para ataques/dano com os buffs ativos
  }
}

/**
 * Fase 13.3 — painel de fichas em tempo real.
 *
 * Carrega todas as fichas da mesa e computa cada card via motor. Escuta Realtime
 * em `fichas` (vida), `habilidades_ficha` (liga/desliga), `condicoes_manuais_ficha`
 * e `valores_combate`, recarregando SÓ o card afetado (atualização granular).
 *
 * @param {string} mesaId
 * @param {object} sistemaBundle — { racas, classes, habilidades, atributos, pericias }
 */
export function useSessaoFichas(mesaId, sistemaBundle) {
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [conectado, setConectado] = useState(false)

  const sisRef = useRef(sistemaBundle)
  sisRef.current = sistemaBundle
  const idsRef = useRef(new Set())
  const carregarTudoRef = useRef(null)
  const jaConectouRef = useRef(false)

  // Recarrega os dados de UMA ficha e devolve o card computado
  const carregarCard = useCallback(async (fichaId) => {
    const sis = sisRef.current || {}
    const [fichaResp, habsResp, condResp, combResp, clsResp, poolsResp, slotsResp, itensResp, attrResp] = await Promise.all([
      supabase.from('fichas').select('*').eq('id', fichaId).single(),
      supabase.from('habilidades_ficha').select('*').eq('ficha_id', fichaId),
      supabase.from('condicoes_manuais_ficha').select('ficha_id, modificador_id, ativa').eq('ficha_id', fichaId),
      supabase.from('valores_combate').select('ficha_id, campo_id, valor').eq('ficha_id', fichaId),
      supabase.from('classes_ficha').select('ficha_id, classe_id, nivel, ordem').eq('ficha_id', fichaId),
      supabase.from('pools_ficha').select('ficha_id, pool_id, atual').eq('ficha_id', fichaId),
      supabase.from('slots_ficha').select('ficha_id, circulo, usados').eq('ficha_id', fichaId),
      supabase.from('itens_ficha').select('id, nome, equipado, durabilidade, modificadores').eq('ficha_id', fichaId),
      supabase.from('valores_atributos').select('ficha_id, atributo_id, valor').eq('ficha_id', fichaId),
    ])
    if (fichaResp.error || !fichaResp.data) return null
    return construirCard(fichaResp.data, habsResp.data, condResp.data, combResp.data, sis, clsResp.data, poolsResp.data, slotsResp.data, itensResp.data, attrResp.data)
  }, [])

  const recarregarFicha = useCallback(async (fichaId) => {
    const card = await carregarCard(fichaId)
    if (!card) return
    setCards(prev => {
      const idx = prev.findIndex(c => c.id === fichaId)
      if (idx === -1) return [...prev, card]
      const copy = prev.slice()
      copy[idx] = card
      return copy
    })
  }, [carregarCard])

  // Carga inicial de todas as fichas da mesa (em lote)
  const carregarTudo = useCallback(async () => {
    if (!mesaId) return
    setLoading(true)
    setError('')
    try {
      const { data: fichasData, error: err } = await supabase
        .from('fichas')
        .select('*')
        .eq('mesa_id', mesaId)
        .order('created_at', { ascending: true })
      if (err) throw err

      const fichas = fichasData || []
      const ids = fichas.map(f => f.id)
      idsRef.current = new Set(ids)
      if (ids.length === 0) { setCards([]); return }

      const [habsResp, condResp, combResp, clsResp, poolsResp, slotsResp, itensResp, attrResp] = await Promise.all([
        supabase.from('habilidades_ficha').select('*').in('ficha_id', ids),
        supabase.from('condicoes_manuais_ficha').select('ficha_id, modificador_id, ativa').in('ficha_id', ids),
        supabase.from('valores_combate').select('ficha_id, campo_id, valor').in('ficha_id', ids),
        supabase.from('classes_ficha').select('ficha_id, classe_id, nivel, ordem').in('ficha_id', ids),
        supabase.from('pools_ficha').select('ficha_id, pool_id, atual').in('ficha_id', ids),
        supabase.from('slots_ficha').select('ficha_id, circulo, usados').in('ficha_id', ids),
        supabase.from('itens_ficha').select('id, ficha_id, nome, equipado, durabilidade, modificadores').in('ficha_id', ids),
        supabase.from('valores_atributos').select('ficha_id, atributo_id, valor').in('ficha_id', ids),
      ])
      const habsBy = groupBy(habsResp.data, 'ficha_id')
      const condBy = groupBy(condResp.data, 'ficha_id')
      const combBy = groupBy(combResp.data, 'ficha_id')
      const clsBy = groupBy(clsResp.data, 'ficha_id')
      const poolsBy = groupBy(poolsResp.data, 'ficha_id')
      const slotsBy = groupBy(slotsResp.data, 'ficha_id')
      const itensBy = groupBy(itensResp.data, 'ficha_id')
      const attrBy = groupBy(attrResp.data, 'ficha_id')
      const sis = sisRef.current || {}
      setCards(fichas.map(f => construirCard(f, habsBy[f.id], condBy[f.id], combBy[f.id], sis, clsBy[f.id], poolsBy[f.id], slotsBy[f.id], itensBy[f.id], attrBy[f.id])))
    } catch (err) {
      setError(err.message || 'Erro ao carregar fichas da sessão.')
    } finally {
      setLoading(false)
    }
  }, [mesaId, sistemaBundle])

  useEffect(() => { carregarTudo() }, [carregarTudo])
  carregarTudoRef.current = carregarTudo

  // Realtime — atualização granular por card + reconexão resiliente
  useEffect(() => {
    if (!mesaId) return
    jaConectouRef.current = false
    const afetaFicha = payload => {
      const fid = payload.new?.ficha_id || payload.old?.ficha_id
      if (fid && idsRef.current.has(fid)) recarregarFicha(fid)
    }
    const channel = supabase
      .channel(`sessao-fichas-${mesaId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fichas', filter: `mesa_id=eq.${mesaId}` }, payload => {
        if (payload.eventType === 'DELETE') {
          const id = payload.old?.id
          idsRef.current.delete(id)
          setCards(prev => prev.filter(c => c.id !== id))
        } else {
          const id = payload.new?.id
          idsRef.current.add(id)
          recarregarFicha(id)
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'habilidades_ficha' }, afetaFicha)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'condicoes_manuais_ficha' }, afetaFicha)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'valores_combate' }, afetaFicha)
      // 22.7 — mudança de atributo recalcula os campos de combate calculados
      .on('postgres_changes', { event: '*', schema: 'public', table: 'valores_atributos' }, afetaFicha)
      // 19.1/19.4 — subir de nível ou trocar de classe move faixas e modificadores
      .on('postgres_changes', { event: '*', schema: 'public', table: 'classes_ficha' }, afetaFicha)
      // 20.1 — gasto de pool aparece ao vivo no painel do mestre
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pools_ficha' }, afetaFicha)
      // 20.6 — gasto de slot idem
      .on('postgres_changes', { event: '*', schema: 'public', table: 'slots_ficha' }, afetaFicha)
      // 21 — equipar/desequipar item muda os modificadores em jogo
      .on('postgres_changes', { event: '*', schema: 'public', table: 'itens_ficha' }, afetaFicha)
      .subscribe(status => {
        if (status === 'SUBSCRIBED') {
          // Reconexão: re-sincroniza o estado (pode ter perdido eventos offline)
          if (jaConectouRef.current) carregarTudoRef.current?.()
          jaConectouRef.current = true
          setConectado(true)
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setConectado(false)
        }
      })
    return () => { supabase.removeChannel(channel) }
  }, [mesaId, recarregarFicha])

  return { cards, loading, error, conectado, refetch: carregarTudo }
}
