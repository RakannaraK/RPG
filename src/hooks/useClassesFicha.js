import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Fase 19.1 — classes de uma ficha (multiclasse).
 * rawRows são as linhas de classes_ficha; classesFicha enriquece cada uma com o
 * objeto classe do sistema (nome + modificadores), sem refetch ao trocar sistema.
 *
 * Nível total = soma dos níveis (fichas.nivel é só cache — a fonte é esta lista).
 */
export function useClassesFicha(fichaId, classesSistema = []) {
  const [rawRows, setRawRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Enriquecimento em render — ordenado por `ordem`, depois por criação
  const classesFicha = [...rawRows]
    .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0) || (a.created_at || '').localeCompare(b.created_at || ''))
    .map(row => ({ ...row, classe: classesSistema.find(c => c.id === row.classe_id) || null }))

  const fetchAll = useCallback(async () => {
    if (!fichaId) return
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('classes_ficha')
        .select('*')
        .eq('ficha_id', fichaId)
        .order('ordem', { ascending: true })
      if (err) throw err
      setRawRows(data || [])
    } catch (err) {
      setError(err.message || 'Erro ao carregar classes da ficha.')
    } finally {
      setLoading(false)
    }
  }, [fichaId])

  useEffect(() => { fetchAll() }, [fetchAll])

  async function adicionarClasse(classeId, nivelInicial = 1) {
    if (!classeId) return null
    if (rawRows.some(r => r.classe_id === classeId)) return null // já existe (UNIQUE)
    const ordem = rawRows.length
    const nivel = Math.max(1, Math.floor(Number(nivelInicial) || 1))
    const { data, error: err } = await supabase
      .from('classes_ficha')
      .insert({ ficha_id: fichaId, classe_id: classeId, nivel, ordem })
      .select()
      .single()
    if (err) throw err
    setRawRows(prev => [...prev, data])
    return data
  }

  async function removerClasse(rowId) {
    const { error: err } = await supabase.from('classes_ficha').delete().eq('id', rowId)
    if (err) throw err
    setRawRows(prev => prev.filter(r => r.id !== rowId))
  }

  async function definirNivel(rowId, nivel) {
    const n = Math.max(1, Math.floor(Number(nivel) || 1))
    const anterior = rawRows.find(r => r.id === rowId)?.nivel
    setRawRows(prev => prev.map(r => (r.id === rowId ? { ...r, nivel: n } : r)))
    try {
      const { error: err } = await supabase.from('classes_ficha').update({ nivel: n }).eq('id', rowId)
      if (err) throw err
    } catch {
      // reverte se falhar
      setRawRows(prev => prev.map(r => (r.id === rowId ? { ...r, nivel: anterior } : r)))
    }
  }

  return {
    classesFicha,
    rawRows,
    loading,
    error,
    refetch: fetchAll,
    adicionarClasse,
    removerClasse,
    definirNivel,
  }
}
