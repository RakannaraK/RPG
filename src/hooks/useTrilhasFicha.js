import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Fase 24.2 — estado das TRILHAS de uma ficha (trilhas_ficha).
 * Linha ausente = trilha vazia (o painel dimensiona pela fórmula). Só escrevemos
 * ao marcar/curar/redimensionar — abrir a ficha não grava nada.
 */
export function useTrilhasFicha(fichaId) {
  const [linhas, setLinhas] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchAll = useCallback(async () => {
    if (!fichaId) return
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('trilhas_ficha')
        .select('*')
        .eq('ficha_id', fichaId)
      if (err) throw err
      setLinhas(data || [])
    } catch (err) {
      setError(err.message || 'Erro ao carregar trilhas da ficha.')
    } finally {
      setLoading(false)
    }
  }, [fichaId])

  useEffect(() => { fetchAll() }, [fetchAll])

  /** Marcas armazenadas da trilha (null = nunca gravada → o painel cria vazia). */
  const marcasDe = trilhaId =>
    linhas.find(l => l.trilha_id === trilhaId)?.marcas ?? null

  /** 25.2 — caixinhas EXTRAS compradas com XP (soma ao tamanho da fórmula). */
  const bonusDe = trilhaId =>
    Number(linhas.find(l => l.trilha_id === trilhaId)?.tamanho_bonus) || 0

  /** Grava o bônus de tamanho (upsert só da coluna; marcas ficam como estão). */
  async function salvarBonus(trilhaId, bonus) {
    const { data, error: err } = await supabase
      .from('trilhas_ficha')
      .upsert({ ficha_id: fichaId, trilha_id: trilhaId, tamanho_bonus: Math.max(0, Math.floor(Number(bonus) || 0)) }, { onConflict: 'ficha_id,trilha_id' })
      .select()
      .single()
    if (err) throw new Error(err.message)
    setLinhas(prev => {
      const existe = prev.some(l => l.trilha_id === trilhaId)
      return existe ? prev.map(l => (l.trilha_id === trilhaId ? data : l)) : [...prev, data]
    })
  }

  /** Grava o array de marcas (upsert otimista; reverte se o banco falhar). */
  async function salvarMarcas(trilhaId, marcas) {
    const anterior = linhas.find(l => l.trilha_id === trilhaId)
    setLinhas(prev => {
      const existe = prev.some(l => l.trilha_id === trilhaId)
      return existe
        ? prev.map(l => (l.trilha_id === trilhaId ? { ...l, marcas } : l))
        : [...prev, { ficha_id: fichaId, trilha_id: trilhaId, marcas }]
    })
    try {
      const { data, error: err } = await supabase
        .from('trilhas_ficha')
        .upsert({ ficha_id: fichaId, trilha_id: trilhaId, marcas }, { onConflict: 'ficha_id,trilha_id' })
        .select()
        .single()
      if (err) throw err
      setLinhas(prev => prev.map(l => (l.trilha_id === trilhaId ? data : l)))
    } catch (err) {
      setLinhas(prev =>
        anterior
          ? prev.map(l => (l.trilha_id === trilhaId ? anterior : l))
          : prev.filter(l => l.trilha_id !== trilhaId)
      )
      throw new Error(err.message || 'Não foi possível salvar a trilha.')
    }
  }

  return { linhasTrilhas: linhas, loading, error, refetch: fetchAll, marcasDe, salvarMarcas, bonusDe, salvarBonus }
}
