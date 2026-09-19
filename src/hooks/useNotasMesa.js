import { useState, useEffect, useCallback, useId } from 'react'
import { supabase } from '../lib/supabase'

const tabelaAusente = e => e?.code === '42P01' || e?.code === 'PGRST205'

/** Fixadas primeiro, depois a mais recente. */
export const ordenarNotas = notas =>
  [...notas].sort((a, b) => (b.fixada - a.fixada) || Date.parse(b.updated_at) - Date.parse(a.updated_at))

/**
 * Fase 29.3 — notas da mesa: as minhas (privadas ou não) + as compartilhadas
 * pelos outros. Só o autor edita/apaga (o RLS garante).
 */
export function useNotasMesa(mesaId) {
  const idCanal = useId().replace(/[^a-zA-Z0-9]/g, '') // canal único por instância (ver useMinigames)
  const [notas, setNotas] = useState([])
  const [indisponivel, setIndisponivel] = useState(false)

  const carregar = useCallback(async () => {
    if (!mesaId) return
    const { data, error } = await supabase.from('notas_mesa').select('*').eq('mesa_id', mesaId)
    setIndisponivel(tabelaAusente(error))
    setNotas(error ? [] : data || [])
  }, [mesaId])

  useEffect(() => { carregar() }, [carregar])

  useEffect(() => {
    if (!mesaId) return
    const upsert = row => setNotas(prev => (prev.some(n => n.id === row.id) ? prev.map(n => (n.id === row.id ? row : n)) : [...prev, row]))
    // ponytail: nota que deixa de ser compartilhada some para os outros só ao recarregar (o RLS não manda o UPDATE)
    const canal = supabase
      .channel(`notas-${mesaId}-${idCanal}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notas_mesa', filter: `mesa_id=eq.${mesaId}` }, p => upsert(p.new))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notas_mesa', filter: `mesa_id=eq.${mesaId}` }, p => upsert(p.new))
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'notas_mesa' }, p => {
        setNotas(prev => prev.filter(n => n.id !== p.old?.id))
      })
      .subscribe()
    return () => { supabase.removeChannel(canal) }
  }, [mesaId, idCanal])

  async function criar() {
    const { data, error } = await supabase.from('notas_mesa').insert({ mesa_id: mesaId, titulo: 'Nova nota' }).select().single()
    if (error) throw new Error(tabelaAusente(error) ? 'Notas ainda não ativadas neste banco (sql/fase29_chat_notas_calendario.sql).' : error.message)
    setNotas(prev => [...prev.filter(n => n.id !== data.id), data])
    return data
  }

  async function salvar(id, patch) {
    const { data, error } = await supabase
      .from('notas_mesa').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id).select().single()
    if (error) throw new Error(error.message)
    setNotas(prev => prev.map(n => (n.id === id ? data : n)))
  }

  async function apagar(id) {
    const { error } = await supabase.from('notas_mesa').delete().eq('id', id)
    if (error) throw new Error(error.message)
    setNotas(prev => prev.filter(n => n.id !== id))
  }

  return { notas: ordenarNotas(notas), indisponivel, criar, salvar, apagar }
}
