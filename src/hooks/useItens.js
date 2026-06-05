import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useItens(fichaId) {
  const [itens, setItens] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchItens = useCallback(async () => {
    if (!fichaId) return
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('itens_ficha')
        .select('*')
        .eq('ficha_id', fichaId)
        .order('ordem', { ascending: true })
      if (err) throw err
      setItens(data || [])
    } catch (err) {
      setError(err.message || 'Erro ao carregar itens.')
    } finally {
      setLoading(false)
    }
  }, [fichaId])

  useEffect(() => { fetchItens() }, [fetchItens])

  async function createItem(data) {
    const { data: item, error: err } = await supabase
      .from('itens_ficha')
      .insert({ ficha_id: fichaId, ...data })
      .select()
      .single()
    if (err) throw err
    await fetchItens()
    return item
  }

  async function updateItem(itemId, data) {
    const { error: err } = await supabase
      .from('itens_ficha')
      .update(data)
      .eq('id', itemId)
    if (err) throw err
    await fetchItens()
  }

  async function deleteItem(itemId) {
    const { error: err } = await supabase
      .from('itens_ficha')
      .delete()
      .eq('id', itemId)
    if (err) throw err
    await fetchItens()
  }

  return { itens, loading, error, createItem, updateItem, deleteItem, refetch: fetchItens }
}
