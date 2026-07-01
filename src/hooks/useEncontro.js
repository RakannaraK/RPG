import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Fase 14 — encontro de combate dentro de uma sessão.
 *
 * Carrega o encontro ATIVO da sessão (um por vez) + seus combatentes e condições
 * ativas, e expõe as ações de combate. Estado de turno/rodada vive em `encontros`
 * e propaga via Realtime (todos veem o mesmo turno). Reconexão re-sincroniza.
 *
 * Sub-fases: 14.1 criar/combatentes · 14.2 iniciativa · 14.3 turnos ·
 * 14.4 condições · 14.5 HP/dano.
 */
export function useEncontro(sessaoId, mesaId) {
  const [encontro, setEncontro] = useState(null)
  const [combatentes, setCombatentes] = useState([])
  const [condicoes, setCondicoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [conectado, setConectado] = useState(false)

  const encontroIdRef = useRef(null)
  const carregarRef = useRef(null)
  const jaConectouRef = useRef(false)

  const carregarCombatentes = useCallback(async (encontroId) => {
    const { data: combData } = await supabase
      .from('combatentes')
      .select('*')
      .eq('encontro_id', encontroId)
      .order('ordem', { ascending: true })
      .order('created_at', { ascending: true })
    const lista = combData || []
    setCombatentes(lista)

    const ids = lista.map(c => c.id)
    if (ids.length > 0) {
      const { data: condData } = await supabase
        .from('condicoes_ativas')
        .select('*')
        .in('combatente_id', ids)
      setCondicoes(condData || [])
    } else {
      setCondicoes([])
    }
  }, [])

  const carregar = useCallback(async () => {
    if (!sessaoId) return
    setLoading(true)
    setError('')
    try {
      const { data, error: err } = await supabase
        .from('encontros')
        .select('*')
        .eq('sessao_id', sessaoId)
        .eq('ativo', true)
        .order('created_at', { ascending: false })
        .limit(1)
      if (err) throw err
      const enc = data?.[0] || null
      setEncontro(enc)
      encontroIdRef.current = enc?.id || null
      if (enc) await carregarCombatentes(enc.id)
      else { setCombatentes([]); setCondicoes([]) }
    } catch (err) {
      setError(err.message || 'Erro ao carregar combate.')
    } finally {
      setLoading(false)
    }
  }, [sessaoId, carregarCombatentes])

  useEffect(() => { carregar() }, [carregar])
  carregarRef.current = carregar

  // Realtime — encontro (sessão), combatentes e condições
  useEffect(() => {
    if (!sessaoId) return
    jaConectouRef.current = false
    const recarregarCombatentesSeAtual = payload => {
      const encId = payload.new?.encontro_id || payload.old?.encontro_id
      if (encId && encId === encontroIdRef.current) carregarCombatentes(encId)
    }
    const channel = supabase
      .channel(`encontro-sessao-${sessaoId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'encontros', filter: `sessao_id=eq.${sessaoId}` }, payload => {
        // Mudança de turno/rodada: atualiza só o encontro sem recarregar tudo
        if (payload.eventType === 'UPDATE' && payload.new?.id === encontroIdRef.current) {
          setEncontro(prev => (prev ? { ...prev, ...payload.new } : payload.new))
          if (payload.new.ativo === false) carregarRef.current?.()
        } else {
          carregarRef.current?.()
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'combatentes' }, recarregarCombatentesSeAtual)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'condicoes_ativas' }, () => {
        if (encontroIdRef.current) carregarCombatentes(encontroIdRef.current)
      })
      .subscribe(status => {
        if (status === 'SUBSCRIBED') {
          if (jaConectouRef.current) carregarRef.current?.()
          jaConectouRef.current = true
          setConectado(true)
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setConectado(false)
        }
      })
    return () => { supabase.removeChannel(channel) }
  }, [sessaoId, carregarCombatentes])

  // ---- Ações do encontro ----
  async function iniciarCombate(titulo) {
    const { data, error: err } = await supabase
      .from('encontros')
      .insert({ sessao_id: sessaoId, mesa_id: mesaId, titulo: (titulo || '').trim() || 'Combate', ativo: true, rodada: 1, turno_atual: 0 })
      .select()
      .single()
    if (err) throw err
    setEncontro(data)
    encontroIdRef.current = data.id
    setCombatentes([])
    setCondicoes([])
    return data
  }

  async function encerrarCombate() {
    if (!encontro) return
    const { error: err } = await supabase.from('encontros').update({ ativo: false }).eq('id', encontro.id)
    if (err) throw err
    setEncontro(null)
    encontroIdRef.current = null
    setCombatentes([])
    setCondicoes([])
  }

  // Adiciona combatentes a partir de fichas (jogadores). `fichas`: [{ id, nome }]
  async function adicionarJogadores(fichas) {
    if (!encontro || !fichas?.length) return
    const jaPresentes = new Set(combatentes.filter(c => c.ficha_id).map(c => c.ficha_id))
    const novos = fichas
      .filter(f => !jaPresentes.has(f.id))
      .map(f => ({
        encontro_id: encontro.id,
        ficha_id: f.id,
        nome: f.nome || 'Personagem',
        tipo: 'jogador',
        hp_atual: null,
        hp_maximo: null,
      }))
    if (novos.length === 0) return
    const { error: err } = await supabase.from('combatentes').insert(novos)
    if (err) throw err
    await carregarCombatentes(encontro.id)
  }

  // Adiciona inimigos/NPCs efêmeros. quantidade>1 gera "Nome 1..N"
  async function adicionarInimigos({ nome, hp, ca, tipo = 'inimigo', quantidade = 1 }) {
    if (!encontro) return
    const qtd = Math.max(1, Number(quantidade) || 1)
    const hpN = hp !== '' && hp != null ? Number(hp) : null
    const caN = ca !== '' && ca != null ? Number(ca) : null
    const base = (nome || '').trim() || (tipo === 'aliado' ? 'Aliado' : tipo === 'npc' ? 'NPC' : 'Inimigo')
    const linhas = Array.from({ length: qtd }, (_, i) => ({
      encontro_id: encontro.id,
      ficha_id: null,
      nome: qtd > 1 ? `${base} ${i + 1}` : base,
      tipo,
      hp_atual: hpN,
      hp_maximo: hpN,
      ca: caN,
    }))
    const { error: err } = await supabase.from('combatentes').insert(linhas)
    if (err) throw err
    await carregarCombatentes(encontro.id)
  }

  // ---- Turnos e rodadas (14.3) ----
  // turno_atual é o índice na ordem de iniciativa (calculada igual no cliente).
  // A matemática só usa a QUANTIDADE de combatentes; a ordem importa só p/ o destaque.
  async function avancarTurno(dir) {
    if (!encontro) return
    const n = combatentes.length
    if (n === 0) return
    let turno = encontro.turno_atual ?? 0
    let rodada = encontro.rodada ?? 1
    if (dir > 0) {
      if (turno + 1 >= n) { turno = 0; rodada += 1 }
      else turno += 1
    } else {
      if (turno - 1 < 0) {
        if (rodada > 1) { turno = n - 1; rodada -= 1 }
        // rodada 1, turno 0: não recua
      } else {
        turno -= 1
      }
    }
    // Expiração de condições ao ENTRAR numa nova rodada (14.4). Só o mestre avança,
    // então um único escritor apaga as expiradas; o Realtime propaga a remoção.
    let expiradas = []
    if (rodada > (encontro.rodada ?? 1)) {
      const nomePorComb = Object.fromEntries(combatentes.map(c => [c.id, c.nome]))
      expiradas = condicoes
        .filter(cond => cond.duracao_rodadas != null && (rodada - (cond.rodada_inicio ?? rodada)) >= cond.duracao_rodadas)
        .map(cond => ({ ...cond, combatenteNome: nomePorComb[cond.combatente_id] || 'combatente' }))
      if (expiradas.length > 0) {
        const ids = expiradas.map(e => e.id)
        await supabase.from('condicoes_ativas').delete().in('id', ids)
        setCondicoes(prev => prev.filter(c => !ids.includes(c.id)))
      }
    }

    setEncontro(prev => (prev ? { ...prev, turno_atual: turno, rodada } : prev))
    const { error: err } = await supabase
      .from('encontros')
      .update({ turno_atual: turno, rodada })
      .eq('id', encontro.id)
    if (err) { await carregarRef.current?.(); throw err }
    return { turno, rodada, expiradas }
  }

  const proximoTurno = () => avancarTurno(+1)
  const turnoAnterior = () => avancarTurno(-1)

  async function removerCombatente(id) {
    const { error: err } = await supabase.from('combatentes').delete().eq('id', id)
    if (err) throw err
    setCombatentes(prev => prev.filter(c => c.id !== id))
  }

  // Reordena (desempate manual): grava `ordem` = índice na nova ordem (14.7)
  async function reordenar(idsEmOrdem) {
    const ordemPorId = {}
    idsEmOrdem.forEach((id, idx) => { ordemPorId[id] = idx })
    setCombatentes(prev => prev.map(c => (ordemPorId[c.id] != null ? { ...c, ordem: ordemPorId[c.id] } : c)))
    await Promise.all(
      idsEmOrdem.map((id, idx) => supabase.from('combatentes').update({ ordem: idx }).eq('id', id))
    )
  }

  async function atualizarCombatente(id, patch) {
    setCombatentes(prev => prev.map(c => (c.id === id ? { ...c, ...patch } : c)))
    const { error: err } = await supabase.from('combatentes').update(patch).eq('id', id)
    if (err) { await carregarCombatentes(encontroIdRef.current); throw err }
  }

  // ---- Condições ativas (14.4) ----
  async function aplicarCondicao(combatenteId, { nome, descricao, duracaoRodadas, modificadorConfig }) {
    const payload = {
      combatente_id: combatenteId,
      nome: (nome || '').trim() || 'Condição',
      descricao: (descricao || '').trim() || null,
      duracao_rodadas: duracaoRodadas !== '' && duracaoRodadas != null ? Number(duracaoRodadas) : null,
      rodada_inicio: encontro?.rodada ?? 1,
      modificador_config: modificadorConfig || null,
    }
    const { data, error: err } = await supabase.from('condicoes_ativas').insert(payload).select().single()
    if (err) throw err
    setCondicoes(prev => [...prev, data])
    return data
  }

  async function removerCondicao(id) {
    const { error: err } = await supabase.from('condicoes_ativas').delete().eq('id', id)
    if (err) throw err
    setCondicoes(prev => prev.filter(c => c.id !== id))
  }

  return {
    encontro, combatentes, condicoes, loading, error, conectado,
    refetch: carregar,
    iniciarCombate, encerrarCombate,
    adicionarJogadores, adicionarInimigos, removerCombatente, atualizarCombatente,
    proximoTurno, turnoAnterior, reordenar,
    aplicarCondicao, removerCondicao,
  }
}
