import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { coletarModificadores, calcularValoresFinais, agregarDefesas, resolverValoresFormula } from '../lib/modifierEngine'

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
function construirCard(fichaRow, habsRows, condRows, combateRows, sis) {
  const raca = (sis.racas || []).find(r => r.id === fichaRow.raca_id) || null
  const classe = (sis.classes || []).find(c => c.id === fichaRow.classe_id) || null

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
    nivel: fichaRow.nivel ?? 1,
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
  const modificadoresAtivos = resolverValoresFormula(
    coletarModificadores({ raca, classe, habilidadesFicha, estadoFicha, condicoesManuais }),
    {
      nivel: fichaRow.nivel ?? 1,
      vida_atual: fichaRow.hp_atual ?? 0,
      vida_max: fichaRow.hp_maximo ?? 0,
      recursos: recursosCtx,
      pericias: {},
      formulaModificador: (sis.formula_modificador || ''),
    }
  )

  const baseCombate = {}
  for (const r of combateRows || []) {
    const n = Number(r.valor)
    if (!Number.isNaN(n)) baseCombate[r.campo_id] = n
  }
  const base = { atributos: {}, vida_max: fichaRow.hp_maximo ?? 0, combate: baseCombate }
  const valoresFinais = calcularValoresFinais(base, modificadoresAtivos)
  const defesas = agregarDefesas(modificadoresAtivos)

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
    nivel: fichaRow.nivel,
    racaNome: raca?.nome || fichaRow.raca || null,
    classeNome: classe?.nome || fichaRow.classe || null,
    hpAtual: fichaRow.hp_atual ?? 0,
    hpMax: valoresFinais.vida_max,
    hpMaxBase: fichaRow.hp_maximo ?? 0,
    vidaTemp: vidaTempEfetiva,
    combate: valoresFinais.combate,
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
    const [fichaResp, habsResp, condResp, combResp] = await Promise.all([
      supabase.from('fichas').select('*').eq('id', fichaId).single(),
      supabase.from('habilidades_ficha').select('*').eq('ficha_id', fichaId),
      supabase.from('condicoes_manuais_ficha').select('ficha_id, modificador_id, ativa').eq('ficha_id', fichaId),
      supabase.from('valores_combate').select('ficha_id, campo_id, valor').eq('ficha_id', fichaId),
    ])
    if (fichaResp.error || !fichaResp.data) return null
    return construirCard(fichaResp.data, habsResp.data, condResp.data, combResp.data, sis)
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

      const [habsResp, condResp, combResp] = await Promise.all([
        supabase.from('habilidades_ficha').select('*').in('ficha_id', ids),
        supabase.from('condicoes_manuais_ficha').select('ficha_id, modificador_id, ativa').in('ficha_id', ids),
        supabase.from('valores_combate').select('ficha_id, campo_id, valor').in('ficha_id', ids),
      ])
      const habsBy = groupBy(habsResp.data, 'ficha_id')
      const condBy = groupBy(condResp.data, 'ficha_id')
      const combBy = groupBy(combResp.data, 'ficha_id')
      const sis = sisRef.current || {}
      setCards(fichas.map(f => construirCard(f, habsBy[f.id], condBy[f.id], combBy[f.id], sis)))
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
