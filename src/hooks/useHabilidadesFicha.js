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
    const row = rawRows.find(r => r.id === habilidadeFichaId)
    const hab = habilidadesSistema.find(h => h.id === row?.habilidade_id)
    const temRecurso = hab?.recurso_max != null

    // Fase 15.5 — ativar consome 1 uso (clamp em 0); desativar NÃO devolve
    const patch = { ativa: novoEstado }
    if (novoEstado === true && temRecurso) {
      const atual = row?.recurso_atual ?? hab.recurso_max
      patch.recurso_atual = Math.max(0, atual - 1)
    }
    const anterior = { ativa: row?.ativa, recurso_atual: row?.recurso_atual }

    // Optimistic update — recálculo imediato sem aguardar banco
    setRawRows(prev => prev.map(r => (r.id === habilidadeFichaId ? { ...r, ...patch } : r)))
    try {
      const { error: err } = await supabase
        .from('habilidades_ficha')
        .update(patch)
        .eq('id', habilidadeFichaId)
      if (err) throw err
    } catch {
      // Revert se falhar
      setRawRows(prev => prev.map(r => (r.id === habilidadeFichaId ? { ...r, ...anterior } : r)))
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

  /**
   * Fase 19.1 — auto-concessão multiclasse. Sincroniza as habilidades de origem
   * 'classe' contra o CONJUNTO atual de classes da ficha: remove as de classes
   * que saíram, adiciona as das classes presentes que ainda faltam.
   * @param {string[]} classeIdsAtuais — ids de todas as classes da ficha agora
   */
  async function sincronizarClasses(classeIdsAtuais) {
    const idSet = new Set(classeIdsAtuais || [])
    const rowsClasse = rawRows.filter(row => row.origem === 'classe')
    const desejadas = habilidadesSistema.filter(h => h.classe_id && idSet.has(h.classe_id))
    const desejadasIds = new Set(desejadas.map(h => h.id))
    const presentesIds = new Set(rowsClasse.map(r => r.habilidade_id))

    // Remove habilidades cuja classe não faz mais parte da ficha
    for (const row of rowsClasse) {
      if (!desejadasIds.has(row.habilidade_id)) {
        await removerHabilidade(row.id)
      }
    }
    // Adiciona as habilidades das classes atuais que ainda não estão na ficha
    for (const hab of desejadas) {
      if (!presentesIds.has(hab.id)) {
        await adicionarHabilidade(hab.id, 'classe')
      }
    }
  }

  // Define o recurso_atual de uma habilidade (valor absoluto) — usado pelo descanso (15.3)
  async function definirRecurso(habilidadeFichaId, valor) {
    setRawRows(prev => prev.map(r => (r.id === habilidadeFichaId ? { ...r, recurso_atual: valor } : r)))
    try {
      await supabase.from('habilidades_ficha').update({ recurso_atual: valor }).eq('id', habilidadeFichaId)
    } catch { /* erro silenciado — o valor local já atualizou */ }
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
    sincronizarOrigem, sincronizarClasses, recuperarRecursos, definirRecurso,
  }
}
