import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useRacasClasses(sistemaId) {
  const [racas, setRacas] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchAll = useCallback(async () => {
    if (!sistemaId) return
    setLoading(true)
    setError(null)
    try {
      const [racasResp, classesResp] = await Promise.all([
        supabase.from('racas').select('*').eq('sistema_id', sistemaId).order('created_at'),
        supabase.from('classes').select('*').eq('sistema_id', sistemaId).order('created_at'),
      ])
      if (racasResp.error) throw racasResp.error
      if (classesResp.error) throw classesResp.error

      const racaIds = (racasResp.data || []).map(r => r.id)
      const classeIds = (classesResp.data || []).map(c => c.id)

      let modsRacas = []
      let modsClasses = []

      if (racaIds.length > 0) {
        const { data, error: e } = await supabase.from('modificadores').select('*').in('raca_id', racaIds)
        if (e) throw e
        modsRacas = data || []
      }
      if (classeIds.length > 0) {
        const { data, error: e } = await supabase.from('modificadores').select('*').in('classe_id', classeIds)
        if (e) throw e
        modsClasses = data || []
      }

      setRacas((racasResp.data || []).map(r => ({
        ...r,
        modificadores: modsRacas.filter(m => m.raca_id === r.id),
      })))
      setClasses((classesResp.data || []).map(c => ({
        ...c,
        modificadores: modsClasses.filter(m => m.classe_id === c.id),
      })))
    } catch (err) {
      setError(err.message || 'Erro ao carregar raças e classes.')
    } finally {
      setLoading(false)
    }
  }, [sistemaId])

  useEffect(() => { fetchAll() }, [fetchAll])

  async function createRaca(nome, descricao) {
    const { data, error } = await supabase
      .from('racas')
      .insert({ sistema_id: sistemaId, nome: nome.trim(), descricao: (descricao || '').trim() })
      .select().single()
    if (error) throw error
    setRacas(prev => [...prev, { ...data, modificadores: [] }])
    return data
  }

  async function updateRaca(id, nome, descricao) {
    const { error } = await supabase
      .from('racas')
      .update({ nome: nome.trim(), descricao: (descricao || '').trim() })
      .eq('id', id)
    if (error) throw error
    setRacas(prev => prev.map(r =>
      r.id === id ? { ...r, nome: nome.trim(), descricao: (descricao || '').trim() } : r
    ))
  }

  async function deleteRaca(id) {
    const { error } = await supabase.from('racas').delete().eq('id', id)
    if (error) throw error
    setRacas(prev => prev.filter(r => r.id !== id))
  }

  async function createClasse(nome, descricao) {
    const { data, error } = await supabase
      .from('classes')
      .insert({ sistema_id: sistemaId, nome: nome.trim(), descricao: (descricao || '').trim() })
      .select().single()
    if (error) throw error
    setClasses(prev => [...prev, { ...data, modificadores: [] }])
    return data
  }

  async function updateClasse(id, nome, descricao) {
    const { error } = await supabase
      .from('classes')
      .update({ nome: nome.trim(), descricao: (descricao || '').trim() })
      .eq('id', id)
    if (error) throw error
    setClasses(prev => prev.map(c =>
      c.id === id ? { ...c, nome: nome.trim(), descricao: (descricao || '').trim() } : c
    ))
  }

  async function deleteClasse(id) {
    const { error } = await supabase.from('classes').delete().eq('id', id)
    if (error) throw error
    setClasses(prev => prev.filter(c => c.id !== id))
  }

  async function addModificador({ raca_id, classe_id, tipo, alvo, operacao, valor, dados_extras, escopo_categoria, valor_e_formula, condicao_tipo, condicao_config }) {
    const payload = {
      tipo,
      alvo: alvo || null,
      operacao: operacao || 'somar',
      valor: valor !== undefined && valor !== null && valor !== '' ? String(valor) : null,
      dados_extras: dados_extras || null,
      escopo_categoria: escopo_categoria || null,
      valor_e_formula: !!valor_e_formula,
      condicao_tipo: condicao_tipo || null,
      condicao_config: condicao_config || null,
    }
    if (raca_id) payload.raca_id = raca_id
    if (classe_id) payload.classe_id = classe_id

    const { data, error } = await supabase.from('modificadores').insert(payload).select().single()
    if (error) throw error

    if (raca_id) {
      setRacas(prev => prev.map(r =>
        r.id === raca_id ? { ...r, modificadores: [...r.modificadores, data] } : r
      ))
    } else {
      setClasses(prev => prev.map(c =>
        c.id === classe_id ? { ...c, modificadores: [...c.modificadores, data] } : c
      ))
    }
    return data
  }

  async function removeModificador(id) {
    const { error } = await supabase.from('modificadores').delete().eq('id', id)
    if (error) throw error
    setRacas(prev => prev.map(r => ({ ...r, modificadores: r.modificadores.filter(m => m.id !== id) })))
    setClasses(prev => prev.map(c => ({ ...c, modificadores: c.modificadores.filter(m => m.id !== id) })))
  }

  return {
    racas, classes, loading, error, refetch: fetchAll,
    createRaca, updateRaca, deleteRaca,
    createClasse, updateClasse, deleteClasse,
    addModificador, removeModificador,
  }
}
