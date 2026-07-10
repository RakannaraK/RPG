import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Fase 20.3 — estado dos slots de uma ficha.
 * Só `usados` é armazenado; o total é sempre derivado da grade (slotsEngine).
 * Linha ausente = 0 usados, então abrir a ficha não grava nada.
 */
export function useSlotsFicha(fichaId) {
  const [linhas, setLinhas] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchAll = useCallback(async () => {
    if (!fichaId) return
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('slots_ficha')
        .select('*')
        .eq('ficha_id', fichaId)
        .order('circulo', { ascending: true })
      if (err) throw err
      setLinhas(data || [])
    } catch (err) {
      setError(err.message || 'Erro ao carregar slots da ficha.')
    } finally {
      setLoading(false)
    }
  }, [fichaId])

  useEffect(() => { fetchAll() }, [fetchAll])

  /** Grava quantos slots de um círculo estão usados (upsert). */
  async function definirUsados(circulo, usados) {
    const c = Number(circulo)
    const v = Math.max(0, Math.floor(Number(usados) || 0))
    const anterior = linhas.find(l => l.circulo === c)

    setLinhas(prev => {
      const existe = prev.some(l => l.circulo === c)
      return existe
        ? prev.map(l => (l.circulo === c ? { ...l, usados: v } : l))
        : [...prev, { ficha_id: fichaId, circulo: c, usados: v }]
    })

    try {
      const { data, error: err } = await supabase
        .from('slots_ficha')
        .upsert({ ficha_id: fichaId, circulo: c, usados: v }, { onConflict: 'ficha_id,circulo' })
        .select()
        .single()
      if (err) throw err
      setLinhas(prev => prev.map(l => (l.circulo === c ? data : l)))
    } catch (err) {
      setLinhas(prev =>
        anterior ? prev.map(l => (l.circulo === c ? anterior : l)) : prev.filter(l => l.circulo !== c)
      )
      throw new Error(err.message || 'Não foi possível atualizar os slots.')
    }
  }

  return { linhasSlots: linhas, loading, error, refetch: fetchAll, definirUsados }
}
