import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useHabilidades(sistemaId) {
  const [habilidades, setHabilidades] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchAll = useCallback(async () => {
    if (!sistemaId) return
    setLoading(true)
    setError(null)
    try {
      const { data: habData, error: habErr } = await supabase
        .from('habilidades')
        .select('*')
        .eq('sistema_id', sistemaId)
        .order('created_at')
      if (habErr) throw habErr

      const habIds = (habData || []).map(h => h.id)
      let mods = []
      if (habIds.length > 0) {
        const { data: modsData, error: modsErr } = await supabase
          .from('modificadores')
          .select('*')
          .in('habilidade_id', habIds)
        if (modsErr) throw modsErr
        mods = modsData || []
      }

      setHabilidades((habData || []).map(h => ({
        ...h,
        modificadores: mods.filter(m => m.habilidade_id === h.id),
      })))
    } catch (err) {
      setError(err.message || 'Erro ao carregar habilidades.')
    } finally {
      setLoading(false)
    }
  }, [sistemaId])

  useEffect(() => { fetchAll() }, [fetchAll])

  async function createHabilidade({ nome, descricao, tipo, recurso_nome, recurso_max, raca_id, classe_id, nivel_minimo }) {
    const payload = {
      sistema_id: sistemaId,
      nome: nome.trim(),
      descricao: (descricao || '').trim() || null,
      tipo: tipo || 'passiva',
      recurso_nome: (recurso_nome || '').trim() || null,
      recurso_max: recurso_max !== '' && recurso_max !== null && recurso_max !== undefined
        ? Number(recurso_max) : null,
      raca_id: raca_id || null,
      classe_id: classe_id || null,
      // 19.5 — null = sem requisito de nível
      nivel_minimo: nivel_minimo !== '' && nivel_minimo != null ? Number(nivel_minimo) : null,
    }
    const { data, error } = await supabase.from('habilidades').insert(payload).select().single()
    if (error) throw error
    setHabilidades(prev => [...prev, { ...data, modificadores: [] }])
    return data
  }

  async function updateHabilidade(id, updates) {
    const payload = {}
    if (updates.nome !== undefined)        payload.nome = updates.nome.trim()
    if (updates.descricao !== undefined)   payload.descricao = updates.descricao?.trim() || null
    if (updates.tipo !== undefined)        payload.tipo = updates.tipo
    if (updates.recurso_nome !== undefined) payload.recurso_nome = (updates.recurso_nome || '').trim() || null
    if (updates.recurso_max !== undefined)  payload.recurso_max = updates.recurso_max !== '' && updates.recurso_max !== null
      ? Number(updates.recurso_max) : null
    if (updates.raca_id !== undefined)    payload.raca_id = updates.raca_id || null
    if (updates.classe_id !== undefined)  payload.classe_id = updates.classe_id || null
    if (updates.nivel_minimo !== undefined) payload.nivel_minimo =
      updates.nivel_minimo !== '' && updates.nivel_minimo !== null ? Number(updates.nivel_minimo) : null
    // 20.5 — custo de pool (null = sem custo)
    if (updates.custo_pool !== undefined) payload.custo_pool =
      updates.custo_pool?.length ? updates.custo_pool : null

    const { error } = await supabase.from('habilidades').update(payload).eq('id', id)
    if (error) throw error
    setHabilidades(prev => prev.map(h => h.id === id ? { ...h, ...payload } : h))
  }

  async function deleteHabilidade(id) {
    const { error } = await supabase.from('habilidades').delete().eq('id', id)
    if (error) throw error
    setHabilidades(prev => prev.filter(h => h.id !== id))
  }

  async function addModificador({ habilidade_id, tipo, alvo, operacao, valor, dados_extras, escopo_categoria, valor_e_formula, percentual_rolagem, condicao_tipo, condicao_config, faixas, nivel_minimo }) {
    const payload = {
      habilidade_id,
      tipo,
      alvo: alvo || null,
      operacao: operacao || 'somar',
      valor: valor !== undefined && valor !== null && valor !== '' ? String(valor) : null,
      dados_extras: dados_extras || null,
      escopo_categoria: escopo_categoria || null,
      valor_e_formula: !!valor_e_formula,
      percentual_rolagem: percentual_rolagem != null && percentual_rolagem !== '' ? Number(percentual_rolagem) : null,
      condicao_tipo: condicao_tipo || null,
      condicao_config: condicao_config || null,
      faixas: faixas || null, // 19.4
      nivel_minimo: nivel_minimo != null && nivel_minimo !== '' ? Number(nivel_minimo) : null, // 19.5
    }
    const { data, error } = await supabase.from('modificadores').insert(payload).select().single()
    if (error) throw error
    setHabilidades(prev => prev.map(h =>
      h.id === habilidade_id ? { ...h, modificadores: [...h.modificadores, data] } : h
    ))
    return data
  }

  async function removeModificador(id) {
    const { error } = await supabase.from('modificadores').delete().eq('id', id)
    if (error) throw error
    setHabilidades(prev => prev.map(h => ({
      ...h,
      modificadores: h.modificadores.filter(m => m.id !== id),
    })))
  }

  return {
    habilidades, loading, error, refetch: fetchAll,
    createHabilidade, updateHabilidade, deleteHabilidade,
    addModificador, removeModificador,
  }
}
