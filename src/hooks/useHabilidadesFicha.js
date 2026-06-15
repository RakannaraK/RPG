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

  /**
   * Ao trocar raça ou classe, remove habilidades da origem anterior
   * e adiciona as da nova. Passivas entram ativas; ativáveis, desligadas.
   * @param {'raca'|'classe'} tipoOrigem
   * @param {string|null} novaOrigemId — id da nova raça/classe, ou null se removida
   */
  async function sincronizarOrigem(tipoOrigem, novaOrigemId) {
    const rowsOrigem = rawRows.filter(row => row.origem === tipoOrigem)
    const novasHabs = novaOrigemId
      ? habilidadesSistema.filter(h =>
          tipoOrigem === 'raca'   ? h.raca_id   === novaOrigemId :
          tipoOrigem === 'classe' ? h.classe_id === novaOrigemId : false
        )
      : []
    const novasIds    = new Set(novasHabs.map(h => h.id))
    const presenteIds = new Set(rowsOrigem.map(r => r.habilidade_id))

    // Remove saíram
    for (const row of rowsOrigem) {
      if (!novasIds.has(row.habilidade_id)) {
        await removerHabilidade(row.id)
      }
    }
    // Adiciona novas
    for (const hab of novasHabs) {
      if (!presenteIds.has(hab.id)) {
        await adicionarHabilidade(hab.id, tipoOrigem)
      }
    }
  }

  async function recuperarRecursos() {
    const atualizacoes = rawRows
      .map(row => {
        const hab = habilidadesSistema.find(h => h.id === row.habilidade_id)
        return hab?.recurso_max != null ? { id: row.id, recurso_atual: hab.recurso_max } : null
      })
      .filter(Boolean)

    if (atualizacoes.length === 0) return
    setRawRows(prev => prev.map(row => {
      const u = atualizacoes.find(a => a.id === row.id)
      return u ? { ...row, recurso_atual: u.recurso_atual } : row
    }))
    for (const { id, recurso_atual } of atualizacoes) {
      try {
        await supabase.from('habilidades_ficha').update({ recurso_atual }).eq('id', id)
      } catch {}
    }
  }

  return {
    habilidadesFicha, loading, error, refetch: fetchAll,
    toggleHabilidade, adicionarHabilidade, removerHabilidade, ajustarRecurso,
    sincronizarOrigem, recuperarRecursos,
  }
}
