import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Fase 21.1 — categorias de item do sistema ("Machados", "Arcos"...).
 * CRUD do mestre/co-mestre. Itens da ficha apontam para uma categoria
 * (maestria por categoria).
 */
export function useCategorias(sistemaId) {
  const [categorias, setCategorias] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchAll = useCallback(async () => {
    if (!sistemaId) return
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('categorias_item')
        .select('*')
        .eq('sistema_id', sistemaId)
        .order('ordem', { ascending: true })
        .order('nome', { ascending: true })
      if (err) throw err
      setCategorias(data || [])
    } catch (err) {
      setError(err.message || 'Erro ao carregar categorias.')
    } finally {
      setLoading(false)
    }
  }, [sistemaId])

  useEffect(() => { fetchAll() }, [fetchAll])

  async function criarCategoria({ nome, descricao }) {
    const { data, error: err } = await supabase
      .from('categorias_item')
      .insert({
        sistema_id: sistemaId,
        nome: nome.trim(),
        descricao: (descricao || '').trim() || null,
        ordem: categorias.length,
      })
      .select()
      .single()
    if (err) throw err
    setCategorias(prev => [...prev, data])
    return data
  }

  async function atualizarCategoria(id, updates) {
    const patch = {}
    if (updates.nome !== undefined) patch.nome = updates.nome.trim()
    if (updates.descricao !== undefined) patch.descricao = (updates.descricao || '').trim() || null
    const { error: err } = await supabase.from('categorias_item').update(patch).eq('id', id)
    if (err) throw err
    setCategorias(prev => prev.map(c => (c.id === id ? { ...c, ...patch } : c)))
  }

  async function removerCategoria(id) {
    const { error: err } = await supabase.from('categorias_item').delete().eq('id', id)
    if (err) throw err
    setCategorias(prev => prev.filter(c => c.id !== id))
  }

  return { categorias, loading, error, refetch: fetchAll, criarCategoria, atualizarCategoria, removerCategoria }
}
