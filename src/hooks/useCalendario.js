import { useState, useEffect, useCallback, useId, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { limitarData, normalizarCalendario } from '../lib/calendarioEngine'

const tabelaAusente = e => e?.code === '42P01' || e?.code === 'PGRST205'

/**
 * Fase 29.4 — calendário do mundo da mesa (uma linha por mesa) + eventos.
 * Escrita só do gestor (o RLS garante); evento secreto nem chega ao jogador.
 */
export function useCalendario(mesaId) {
  const idCanal = useId().replace(/[^a-zA-Z0-9]/g, '') // canal único por instância (ver useMinigames)
  const [linha, setLinha] = useState(null)
  const [eventos, setEventos] = useState([])
  const [carregado, setCarregado] = useState(false)
  const [indisponivel, setIndisponivel] = useState(false)

  const carregar = useCallback(async () => {
    if (!mesaId) return
    const [cal, evs] = await Promise.all([
      supabase.from('calendarios_mesa').select('*').eq('mesa_id', mesaId).maybeSingle(),
      supabase.from('eventos_calendario').select('*').eq('mesa_id', mesaId),
    ])
    setIndisponivel(tabelaAusente(cal.error))
    setLinha(cal.data || null)
    setEventos(evs.data || [])
    setCarregado(true)
  }, [mesaId])

  useEffect(() => { carregar() }, [carregar])

  useEffect(() => {
    if (!mesaId) return
    const upsertEvento = row => setEventos(prev => (prev.some(e => e.id === row.id) ? prev.map(e => (e.id === row.id ? row : e)) : [...prev, row]))
    const canal = supabase
      .channel(`calendario-${mesaId}-${idCanal}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'calendarios_mesa', filter: `mesa_id=eq.${mesaId}` }, p => setLinha(p.new))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'calendarios_mesa', filter: `mesa_id=eq.${mesaId}` }, p => setLinha(p.new))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'eventos_calendario', filter: `mesa_id=eq.${mesaId}` }, p => upsertEvento(p.new))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'eventos_calendario', filter: `mesa_id=eq.${mesaId}` }, p => upsertEvento(p.new))
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'eventos_calendario' }, p => {
        setEventos(prev => prev.filter(e => e.id !== p.old?.id))
      })
      .subscribe()
    return () => { supabase.removeChannel(canal) }
  }, [mesaId, idCanal])

  const cal = useMemo(() => normalizarCalendario(linha?.config), [linha?.config])
  const hoje = useMemo(() => (linha ? limitarData(linha, cal) : null), [linha, cal])

  /** Cria ou altera o calendário (config e/ou data). */
  async function salvar(patch) {
    const { data, error } = await supabase
      .from('calendarios_mesa')
      .upsert({ mesa_id: mesaId, ...patch, updated_at: new Date().toISOString() })
      .select().single()
    if (error) throw new Error(error.code === '42501' ? 'Só o mestre ou co-mestre mexe no calendário.' : error.message)
    setLinha(data)
    return data
  }

  async function criarEvento(evento) {
    const { data, error } = await supabase.from('eventos_calendario').insert({ mesa_id: mesaId, ...evento }).select().single()
    if (error) throw new Error(error.message)
    setEventos(prev => [...prev.filter(e => e.id !== data.id), data])
  }

  async function apagarEvento(id) {
    const { error } = await supabase.from('eventos_calendario').delete().eq('id', id)
    if (error) throw new Error(error.message)
    setEventos(prev => prev.filter(e => e.id !== id))
  }

  return { existe: !!linha, cal, hoje, eventos, carregado, indisponivel, salvar, criarEvento, apagarEvento }
}
