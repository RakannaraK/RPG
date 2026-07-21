import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Fase 25.3 — catálogo de linhas de poder do sistema (CRUD do mestre/co-mestre).
 * Uma linha tem rating próprio (ex: uma disciplina) — cada nível do rating
 * desbloqueia os poderes daquele nível.
 */
export function useLinhasPoder(sistemaId) {
  const [linhas, setLinhas] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchAll = useCallback(async () => {
    if (!sistemaId) return
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('linhas_poder')
        .select('*')
        .eq('sistema_id', sistemaId)
        .order('ordem', { ascending: true })
      if (err) throw err
      setLinhas(data || [])
    } catch (err) {
      setError(err.message || 'Erro ao carregar linhas de poder.')
    } finally {
      setLoading(false)
    }
  }, [sistemaId])

  useEffect(() => { fetchAll() }, [fetchAll])

  async function criarLinha({ nome, descricao, maximo, auto_conceder }) {
    const { data, error: err } = await supabase
      .from('linhas_poder')
      .insert({
        sistema_id: sistemaId,
        nome: nome.trim(),
        descricao: descricao || null,
        maximo: maximo || 5,
        auto_conceder: auto_conceder || false,
        ordem: linhas.length,
      })
      .select()
      .single()
    if (err) throw err
    setLinhas(prev => [...prev, data])
    return data
  }

  async function atualizarLinha(id, updates) {
    const { error: err } = await supabase.from('linhas_poder').update(updates).eq('id', id)
    if (err) throw err
    setLinhas(prev => prev.map(l => (l.id === id ? { ...l, ...updates } : l)))
  }

  async function removerLinha(id) {
    const { error: err } = await supabase.from('linhas_poder').delete().eq('id', id)
    if (err) throw err
    setLinhas(prev => prev.filter(l => l.id !== id))
  }

  return { linhas, loading, error, refetch: fetchAll, criarLinha, atualizarLinha, removerLinha }
}

/**
 * Fase 25.3 — estado das linhas de poder de uma ficha (rating por linha).
 * Linha ausente = rating 0. Só escrevemos ao alterar o rating.
 */
export function useLinhasFicha(fichaId) {
  const [linhasFicha, setLinhasFicha] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchAll = useCallback(async () => {
    if (!fichaId) return
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('linhas_ficha')
        .select('*')
        .eq('ficha_id', fichaId)
      if (err) throw err
      setLinhasFicha(data || [])
    } catch (err) {
      setError(err.message || 'Erro ao carregar linhas da ficha.')
    } finally {
      setLoading(false)
    }
  }, [fichaId])

  useEffect(() => { fetchAll() }, [fetchAll])

  /** Rating atual de uma linha (0 se a ficha ainda não tem linha registrada). */
  function ratingDe(linhaId) {
    return linhasFicha.find(l => l.linha_id === linhaId)?.rating || 0
  }

  /** Grava o rating de uma linha (upsert: cria a linha na primeira vez). */
  async function definirRating(linhaId, rating) {
    const valor = Math.max(0, Math.floor(Number(rating) || 0))
    const anterior = linhasFicha.find(l => l.linha_id === linhaId)
    // Optimistic: recálculo imediato sem esperar o banco
    setLinhasFicha(prev => {
      const existe = prev.some(l => l.linha_id === linhaId)
      return existe
        ? prev.map(l => (l.linha_id === linhaId ? { ...l, rating: valor } : l))
        : [...prev, { ficha_id: fichaId, linha_id: linhaId, rating: valor }]
    })
    try {
      const { data, error: err } = await supabase
        .from('linhas_ficha')
        .upsert({ ficha_id: fichaId, linha_id: linhaId, rating: valor }, { onConflict: 'ficha_id,linha_id' })
        .select()
        .single()
      if (err) throw err
      setLinhasFicha(prev => prev.map(l => (l.linha_id === linhaId ? data : l)))
    } catch (err) {
      // Reverte
      setLinhasFicha(prev =>
        anterior
          ? prev.map(l => (l.linha_id === linhaId ? anterior : l))
          : prev.filter(l => l.linha_id !== linhaId)
      )
      throw new Error(err.message || 'Não foi possível atualizar a linha de poder.')
    }
  }

  return { linhasFicha, loading, error, refetch: fetchAll, ratingDe, definirRating }
}
