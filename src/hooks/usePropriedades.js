import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Fase 21.4 — propriedades de item desbloqueáveis do sistema.
 * CRUD do mestre/co-mestre.
 */
export function usePropriedades(sistemaId) {
  const [propriedades, setPropriedades] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchAll = useCallback(async () => {
    if (!sistemaId) return
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('propriedades_item')
        .select('*')
        .eq('sistema_id', sistemaId)
        .order('maestria_minima', { ascending: true })
        .order('nome', { ascending: true })
      if (err) throw err
      setPropriedades(data || [])
    } catch (err) {
      setError(err.message || 'Erro ao carregar propriedades.')
    } finally {
      setLoading(false)
    }
  }, [sistemaId])

  useEffect(() => { fetchAll() }, [fetchAll])

  async function criarPropriedade(p) {
    const { data, error: err } = await supabase
      .from('propriedades_item')
      .insert({
        sistema_id: sistemaId,
        categoria_id: p.categoria_id || null,
        nome: p.nome.trim(),
        sigla: (p.sigla || '').trim() || null,
        descricao: (p.descricao || '').trim(),
        maestria_minima: Math.max(0, Math.floor(Number(p.maestria_minima) || 0)),
        modificador_config: p.modificador_config || null,
      })
      .select()
      .single()
    if (err) throw err
    setPropriedades(prev => [...prev, data])
    return data
  }

  async function removerPropriedade(id) {
    const { error: err } = await supabase.from('propriedades_item').delete().eq('id', id)
    if (err) throw err
    setPropriedades(prev => prev.filter(p => p.id !== id))
  }

  return { propriedades, loading, error, refetch: fetchAll, criarPropriedade, removerPropriedade }
}
