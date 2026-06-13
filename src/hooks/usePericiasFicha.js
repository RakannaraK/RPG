import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function usePericiasFicha(fichaId) {
  const [periciasFicha, setPericiasFicha] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchPericias = useCallback(async () => {
    if (!fichaId) return
    setLoading(true)
    try {
      const { data } = await supabase
        .from('pericias_ficha')
        .select('*')
        .eq('ficha_id', fichaId)
      setPericiasFicha(data || [])
    } catch {}
    setLoading(false)
  }, [fichaId])

  useEffect(() => { fetchPericias() }, [fetchPericias])

  async function savePericia(pericia_id, { proficiente, bonus }) {
    const { error } = await supabase
      .from('pericias_ficha')
      .upsert(
        { ficha_id: fichaId, pericia_id, proficiente, bonus },
        { onConflict: 'ficha_id,pericia_id' }
      )
    if (error) throw error
    setPericiasFicha(prev => {
      const exists = prev.find(p => p.pericia_id === pericia_id)
      if (exists) return prev.map(p => p.pericia_id === pericia_id ? { ...p, proficiente, bonus } : p)
      return [...prev, { ficha_id: fichaId, pericia_id, proficiente, bonus }]
    })
  }

  return { periciasFicha, savePericia, loading }
}
