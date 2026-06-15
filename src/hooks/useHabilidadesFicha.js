import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Gerencia habilidades de uma ficha específica.
 * rawRows armazena os dados do banco; habilidadesFicha é computado enriquecendo
 * cada row com o objeto habilidade do sistema (sem refetch ao trocar o sistema).
 */
export function useHabilidadesFicha(fichaId, habilidadesSistema = []) {
  const [rawRows, setRawRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Enriquecimento feito em render — sem useEffect extra, sem loops
  const habilidadesFicha = rawRows.map(row => ({
    ...row,
    habilidade: habilidadesSistema.find(h => h.id === row.habilidade_id) || null,
  }))

  const fetchAll = useCallback(async () => {
    if (!fichaId) return
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('habilidades_ficha')
        .select('*')
        .eq('ficha_id', fichaId)
        .order('created_at')
      if (err) throw err
      setRawRows(data || [])
    } catch (err) {
      setError(err.message || 'Erro ao carregar habilidades da ficha.')
    } finally {
      setLoading(false)
    }
  }, [fichaId])

  useEffect(() => { fetchAll() }, [fetchAll])

  async function toggleHabilidade(habilidadeFichaId, novoEstado) {
    // Optimistic update — recálculo imediato sem aguardar banco
    setRawRows(prev => prev.map(row =>
      row.id === habilidadeFichaId ? { ...row, ativa: novoEstado } : row
    ))
    try {
      const { error: err } = await supabase
        .from('habilidades_ficha')
        .update({ ativa: novoEstado })
        .eq('id', habilidadeFichaId)
      if (err) throw err
    } catch {
      // Revert se falhar
      setRawRows(prev => prev.map(row =>
        row.id === habilidadeFichaId ? { ...row, ativa: !novoEstado } : row
      ))
    }
  }

  async function adicionarHabilidade(habilidadeId, origem = 'manual') {
    const hab = habilidadesSistema.find(h => h.id === habilidadeId)
    const payload = {
      ficha_id: fichaId,
      habilidade_id: habilidadeId,
      ativa: hab?.tipo === 'passiva',  // passivas entram ativas; ativáveis, desligadas
      recurso_atual: hab?.recurso_max ?? null,
      origem,
    }
    const { data, error: err } = await supabase
      .from('habilidades_ficha')
      .insert(payload)
      .select()
      .single()
    if (err) throw err
    setRawRows(prev => [...prev, data])
    return data
  }

  async function removerHabilidade(habilidadeFichaId) {
    const { error: err } = await supabase
      .from('habilidades_ficha')
      .delete()
      .eq('id', habilidadeFichaId)
    if (err) throw err
    setRawRows(prev => prev.filter(row => row.id !== habilidadeFichaId))
  }

  async function ajustarRecurso(habilidadeFichaId, delta) {
    const row = rawRows.find(r => r.id === habilidadeFichaId)
    if (!row) return
    const hab = habilidadesSistema.find(h => h.id === row.habilidade_id)
    const max = hab?.recurso_max ?? Infinity
    const novoValor = Math.max(0, Math.min(max, (row.recurso_atual ?? 0) + delta))
    setRawRows(prev => prev.map(r =>
      r.id === habilidadeFichaId ? { ...r, recurso_atual: novoValor } : r
    ))
    try {
      await supabase
        .from('habilidades_ficha')
        .update({ recurso_atual: novoValor })
        .eq('id', habilidadeFichaId)
    } catch {}
  }

  return {
    habilidadesFicha, loading, error, refetch: fetchAll,
    toggleHabilidade, adicionarHabilidade, removerHabilidade, ajustarRecurso,
  }
}
