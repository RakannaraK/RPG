import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Fase 20.1 — catálogo de pools do sistema (CRUD do mestre/co-mestre).
 */
export function usePools(sistemaId) {
  const [pools, setPools] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchAll = useCallback(async () => {
    if (!sistemaId) return
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('pools')
        .select('*')
        .eq('sistema_id', sistemaId)
        .order('ordem', { ascending: true })
      if (err) throw err
      setPools(data || [])
    } catch (err) {
      setError(err.message || 'Erro ao carregar pools.')
    } finally {
      setLoading(false)
    }
  }, [sistemaId])

  useEffect(() => { fetchAll() }, [fetchAll])

  async function criarPool({ nome, tipo, dado, maximo_formula, visivel_ficha, recuperacao }) {
    const { data, error: err } = await supabase
      .from('pools')
      .insert({
        sistema_id: sistemaId,
        nome: nome.trim(),
        tipo: tipo || 'pontos',
        dado: tipo === 'dados' ? (dado || '').trim() || null : null,
        maximo_formula: String(maximo_formula || '').trim(),
        visivel_ficha: visivel_ficha !== false,
        recuperacao: recuperacao || null,
        ordem: pools.length,
      })
      .select()
      .single()
    if (err) throw err
    setPools(prev => [...prev, data])
    return data
  }

  async function atualizarPool(id, updates) {
    const { error: err } = await supabase.from('pools').update(updates).eq('id', id)
    if (err) throw err
    setPools(prev => prev.map(p => (p.id === id ? { ...p, ...updates } : p)))
  }

  async function removerPool(id) {
    const { error: err } = await supabase.from('pools').delete().eq('id', id)
    if (err) throw err
    setPools(prev => prev.filter(p => p.id !== id))
  }

  return { pools, loading, error, refetch: fetchAll, criarPool, atualizarPool, removerPool }
}

/**
 * Fase 20.1 — estado dos pools de uma ficha.
 * Linha ausente = pool CHEIO (o poolEngine trata). Só escrevemos ao gastar/recuperar,
 * então abrir a ficha não grava nada.
 */
export function usePoolsFicha(fichaId) {
  const [linhas, setLinhas] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchAll = useCallback(async () => {
    if (!fichaId) return
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('pools_ficha')
        .select('*')
        .eq('ficha_id', fichaId)
      if (err) throw err
      setLinhas(data || [])
    } catch (err) {
      setError(err.message || 'Erro ao carregar pools da ficha.')
    } finally {
      setLoading(false)
    }
  }, [fichaId])

  useEffect(() => { fetchAll() }, [fetchAll])

  /** Grava o valor atual de um pool (upsert: cria a linha na primeira vez). */
  async function definirAtual(poolId, atual) {
    const valor = Math.max(0, Math.floor(Number(atual) || 0))
    const anterior = linhas.find(l => l.pool_id === poolId)
    // Optimistic: recálculo imediato sem esperar o banco
    setLinhas(prev => {
      const existe = prev.some(l => l.pool_id === poolId)
      return existe
        ? prev.map(l => (l.pool_id === poolId ? { ...l, atual: valor } : l))
        : [...prev, { ficha_id: fichaId, pool_id: poolId, atual: valor }]
    })
    try {
      const { data, error: err } = await supabase
        .from('pools_ficha')
        .upsert({ ficha_id: fichaId, pool_id: poolId, atual: valor }, { onConflict: 'ficha_id,pool_id' })
        .select()
        .single()
      if (err) throw err
      setLinhas(prev => prev.map(l => (l.pool_id === poolId ? data : l)))
    } catch (err) {
      // Reverte
      setLinhas(prev =>
        anterior
          ? prev.map(l => (l.pool_id === poolId ? anterior : l))
          : prev.filter(l => l.pool_id !== poolId)
      )
      throw new Error(err.message || 'Não foi possível atualizar o pool.')
    }
  }

  return { linhasPools: linhas, loading, error, refetch: fetchAll, definirAtual }
}
