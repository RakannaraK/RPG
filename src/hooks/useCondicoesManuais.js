import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Fase 12.6 — condições manuais (interruptores situacionais) de uma ficha.
 *
 * Carrega as linhas de `condicoes_manuais_ficha` da ficha e expõe um mapa
 * { [modificador_id]: ativa } consumido pelo motor em coletarModificadores
 * (condicao_tipo === 'manual'). toggleCondicao liga/desliga com upsert otimista,
 * para o recálculo do motor acontecer na hora (igual ao toggle de habilidade).
 */
export function useCondicoesManuais(fichaId) {
  const [condicoesManuais, setCondicoesManuais] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchAll = useCallback(async () => {
    if (!fichaId) return
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('condicoes_manuais_ficha')
        .select('modificador_id, ativa')
        .eq('ficha_id', fichaId)
      if (err) throw err
      const mapa = {}
      for (const row of data || []) mapa[row.modificador_id] = row.ativa === true
      setCondicoesManuais(mapa)
    } catch (err) {
      setError(err.message || 'Erro ao carregar condições manuais.')
    } finally {
      setLoading(false)
    }
  }, [fichaId])

  useEffect(() => { fetchAll() }, [fetchAll])

  async function toggleCondicao(modificadorId, novoEstado) {
    if (!fichaId || !modificadorId) return
    const anterior = condicoesManuais[modificadorId] === true
    // Optimistic — o motor recalcula imediatamente a partir do mapa
    setCondicoesManuais(prev => ({ ...prev, [modificadorId]: novoEstado }))
    try {
      const { error: err } = await supabase
        .from('condicoes_manuais_ficha')
        .upsert(
          { ficha_id: fichaId, modificador_id: modificadorId, ativa: novoEstado },
          { onConflict: 'ficha_id,modificador_id' }
        )
      if (err) throw err
    } catch (err) {
      // Reverte se o banco falhar
      setCondicoesManuais(prev => ({ ...prev, [modificadorId]: anterior }))
      setError(err.message || 'Erro ao salvar condição.')
    }
  }

  return { condicoesManuais, loading, error, refetch: fetchAll, toggleCondicao }
}
