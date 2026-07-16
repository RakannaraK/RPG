import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Fase 24.4 — valores dos ESTADOS de uma ficha (estados_ficha).
 * Linha ausente = valor inicial da config (o estadosEngine trata). Só escrevemos
 * no +/- — abrir a ficha não grava nada.
 */
export function useEstadosFicha(fichaId) {
  const [linhas, setLinhas] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchAll = useCallback(async () => {
    if (!fichaId) return
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('estados_ficha')
        .select('*')
        .eq('ficha_id', fichaId)
      if (err) throw err
      setLinhas(data || [])
    } catch (err) {
      setError(err.message || 'Erro ao carregar estados da ficha.')
    } finally {
      setLoading(false)
    }
  }, [fichaId])

  useEffect(() => { fetchAll() }, [fetchAll])

  /** Mapa { estado_id: valor } só do que está GRAVADO (ausente = inicial). */
  const valores = {}
  for (const l of linhas) valores[l.estado_id] = l.valor

  /** Grava o valor (upsert otimista; reverte se o banco falhar). */
  async function definirValor(estadoId, valor) {
    const v = Math.floor(Number(valor) || 0)
    const anterior = linhas.find(l => l.estado_id === estadoId)
    setLinhas(prev => {
      const existe = prev.some(l => l.estado_id === estadoId)
      return existe
        ? prev.map(l => (l.estado_id === estadoId ? { ...l, valor: v } : l))
        : [...prev, { ficha_id: fichaId, estado_id: estadoId, valor: v }]
    })
    try {
      const { data, error: err } = await supabase
        .from('estados_ficha')
        .upsert({ ficha_id: fichaId, estado_id: estadoId, valor: v }, { onConflict: 'ficha_id,estado_id' })
        .select()
        .single()
      if (err) throw err
      setLinhas(prev => prev.map(l => (l.estado_id === estadoId ? data : l)))
    } catch (err) {
      setLinhas(prev =>
        anterior
          ? prev.map(l => (l.estado_id === estadoId ? anterior : l))
          : prev.filter(l => l.estado_id !== estadoId)
      )
      throw new Error(err.message || 'Não foi possível salvar o estado.')
    }
  }

  return { linhasEstados: linhas, valores, loading, error, refetch: fetchAll, definirValor }
}
