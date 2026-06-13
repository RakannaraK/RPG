import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useValoresCombate(fichaId) {
  const [valoresCombate, setValoresCombate] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchValores = useCallback(async () => {
    if (!fichaId) return
    setLoading(true)
    try {
      const { data } = await supabase
        .from('valores_combate')
        .select('*')
        .eq('ficha_id', fichaId)
      setValoresCombate(data || [])
    } catch {}
    setLoading(false)
  }, [fichaId])

  useEffect(() => { fetchValores() }, [fetchValores])

  async function saveValor(campo_id, valor) {
    const { error } = await supabase
      .from('valores_combate')
      .upsert({ ficha_id: fichaId, campo_id, valor }, { onConflict: 'ficha_id,campo_id' })
    if (error) throw error
    setValoresCombate(prev => {
      const exists = prev.find(v => v.campo_id === campo_id)
      if (exists) return prev.map(v => v.campo_id === campo_id ? { ...v, valor } : v)
      return [...prev, { ficha_id: fichaId, campo_id, valor }]
    })
  }

  return { valoresCombate, saveValor, loading }
}
