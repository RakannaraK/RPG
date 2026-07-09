import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Fase 19.6 — catálogo de recompensas por nível do sistema (CRUD do mestre).
 * classe_id null = recompensa por nível TOTAL.
 */
export function useRecompensas(sistemaId) {
  const [recompensas, setRecompensas] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchAll = useCallback(async () => {
    if (!sistemaId) return
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('recompensas_nivel')
        .select('*')
        .eq('sistema_id', sistemaId)
        .order('nivel', { ascending: true })
      if (err) throw err
      setRecompensas(data || [])
    } catch (err) {
      setError(err.message || 'Erro ao carregar recompensas.')
    } finally {
      setLoading(false)
    }
  }, [sistemaId])

  useEffect(() => { fetchAll() }, [fetchAll])

  async function criarRecompensa({ classe_id, nivel, titulo, descricao }) {
    const { data, error: err } = await supabase
      .from('recompensas_nivel')
      .insert({
        sistema_id: sistemaId,
        classe_id: classe_id || null,
        nivel: Math.max(1, Math.floor(Number(nivel) || 1)),
        titulo: titulo.trim(),
        descricao: (descricao || '').trim() || null,
      })
      .select()
      .single()
    if (err) throw err
    setRecompensas(prev => [...prev, data].sort((a, b) => a.nivel - b.nivel))
    return data
  }

  async function removerRecompensa(id) {
    const { error: err } = await supabase.from('recompensas_nivel').delete().eq('id', id)
    if (err) throw err
    setRecompensas(prev => prev.filter(r => r.id !== id))
  }

  return { recompensas, loading, error, refetch: fetchAll, criarRecompensa, removerRecompensa }
}

/**
 * Fase 19.6 — recompensas pendentes/concluídas de uma ficha.
 * `gerarPendencias` é chamada ao subir de nível: insere as recompensas daquele
 * nível. UNIQUE(ficha_id, recompensa_id) impede duplicar se rodar duas vezes.
 */
export function useRecompensasFicha(fichaId) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchAll = useCallback(async () => {
    if (!fichaId) return
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('recompensas_ficha')
        .select('*')
        .eq('ficha_id', fichaId)
      if (err) throw err
      setRows(data || [])
    } catch (err) {
      setError(err.message || 'Erro ao carregar recompensas da ficha.')
    } finally {
      setLoading(false)
    }
  }, [fichaId])

  useEffect(() => { fetchAll() }, [fetchAll])

  async function gerarPendencias(recompensas) {
    if (!recompensas?.length) return
    const novas = recompensas.filter(r => !rows.some(x => x.recompensa_id === r.id))
    if (!novas.length) return
    const { data, error: err } = await supabase
      .from('recompensas_ficha')
      .upsert(
        novas.map(r => ({ ficha_id: fichaId, recompensa_id: r.id, concluida: false })),
        { onConflict: 'ficha_id,recompensa_id', ignoreDuplicates: true }
      )
      .select()
    if (err) throw err
    if (data?.length) setRows(prev => [...prev, ...data])
  }

  async function marcarConcluida(rowId, concluida) {
    const anterior = rows.find(r => r.id === rowId)?.concluida
    setRows(prev => prev.map(r => (r.id === rowId ? { ...r, concluida } : r)))
    try {
      const { error: err } = await supabase
        .from('recompensas_ficha').update({ concluida }).eq('id', rowId)
      if (err) throw err
    } catch {
      setRows(prev => prev.map(r => (r.id === rowId ? { ...r, concluida: anterior } : r)))
    }
  }

  return { recompensasFicha: rows, loading, error, refetch: fetchAll, gerarPendencias, marcarConcluida }
}
