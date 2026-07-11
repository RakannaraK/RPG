import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { calcularMaestria } from '../lib/masteryEngine'

/**
 * Fase 21.3 — maestrias de uma ficha (XP por categoria ou item).
 * `nivel` é cache derivado da curva; recalculamos a cada ganho antes de gravar.
 *
 * @param {object} curva — config_layout.maestria.curva (para recalcular o nível)
 */
export function useMaestrias(fichaId, curva) {
  const [linhas, setLinhas] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchAll = useCallback(async () => {
    if (!fichaId) return
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('maestrias_ficha')
        .select('*')
        .eq('ficha_id', fichaId)
      if (err) throw err
      setLinhas(data || [])
    } catch (err) {
      setError(err.message || 'Erro ao carregar maestrias.')
    } finally {
      setLoading(false)
    }
  }, [fichaId])

  useEffect(() => { fetchAll() }, [fetchAll])

  /** Chave estável por alvo (categoria OU item). */
  const chaveDe = alvo => (alvo.categoria_id ? `c:${alvo.categoria_id}` : `i:${alvo.item_id}`)

  function linhaDe(alvo) {
    return linhas.find(l =>
      (alvo.categoria_id && l.categoria_id === alvo.categoria_id) ||
      (alvo.item_id && l.item_id === alvo.item_id)
    ) || null
  }

  /**
   * Credita (ou tira) XP de maestria. Recalcula o nível e faz upsert.
   * @param {object} alvo — { categoria_id } OU { item_id }
   * @returns {{ xp, nivel, nivelAnterior, subiu }}
   */
  async function ganharXp(alvo, delta) {
    const linha = linhaDe(alvo)
    const nivelAnterior = linha ? linha.nivel : 0
    const xpNovo = Math.max(0, (linha?.xp ?? 0) + Math.trunc(Number(delta) || 0))
    const { nivel } = calcularMaestria(xpNovo, curva)

    const payload = {
      ficha_id: fichaId,
      categoria_id: alvo.categoria_id || null,
      item_id: alvo.item_id || null,
      xp: xpNovo,
      nivel,
    }
    const onConflict = alvo.categoria_id ? 'ficha_id,categoria_id' : 'ficha_id,item_id'

    // Optimistic
    setLinhas(prev => {
      const existe = prev.some(l => chaveDe(l) === chaveDe(alvo))
      return existe
        ? prev.map(l => (chaveDe(l) === chaveDe(alvo) ? { ...l, ...payload } : l))
        : [...prev, payload]
    })

    const { data, error: err } = await supabase
      .from('maestrias_ficha')
      .upsert(payload, { onConflict })
      .select()
      .single()
    if (err) { await fetchAll(); throw new Error(err.message) }
    setLinhas(prev => prev.map(l => (chaveDe(l) === chaveDe(alvo) ? data : l)))

    return { xp: xpNovo, nivel, nivelAnterior, subiu: nivel > nivelAnterior }
  }

  return { linhasMaestria: linhas, loading, error, refetch: fetchAll, linhaDe, ganharXp }
}
