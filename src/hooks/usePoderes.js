import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

/** Converte "cura, área" → ['cura','área']; vazio → null (coluna TEXT[]). */
function parseTags(valor) {
  if (Array.isArray(valor)) return valor.length ? valor : null
  const lista = String(valor || '')
    .split(',')
    .map(t => t.trim())
    .filter(Boolean)
  return lista.length ? lista : null
}

function limparNumero(v) {
  return v !== '' && v != null && Number.isFinite(Number(v)) ? Number(v) : null
}

function montarPayload(p) {
  return {
    nome: String(p.nome || '').trim(),
    descricao: String(p.descricao || '').trim() || null,
    categoria: String(p.categoria || '').trim() || null,
    circulo: limparNumero(p.circulo),
    custo: p.custo?.length ? p.custo : null,
    acao: String(p.acao || '').trim() || null,
    alcance: String(p.alcance || '').trim() || null,
    duracao: String(p.duracao || '').trim() || null,
    efeito_notacao: String(p.efeito_notacao || '').trim() || null,
    efeito_tipo: p.efeito_tipo || null,
    escala_circulo: p.escala_circulo?.faixas?.length ? p.escala_circulo : null,
    cd_formula: String(p.cd_formula || '').trim() || null,
    tags: parseTags(p.tags),
    classe_id: p.classe_id || null,
    nivel_minimo: limparNumero(p.nivel_minimo),
  }
}

/**
 * Fase 20.2 — catálogo de poderes do sistema (CRUD do mestre/co-mestre).
 */
export function usePoderes(sistemaId) {
  const [poderes, setPoderes] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchAll = useCallback(async () => {
    if (!sistemaId) return
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('poderes')
        .select('*')
        .eq('sistema_id', sistemaId)
        .order('circulo', { ascending: true, nullsFirst: true })
        .order('nome', { ascending: true })
      if (err) throw err
      setPoderes(data || [])
    } catch (err) {
      setError(err.message || 'Erro ao carregar poderes.')
    } finally {
      setLoading(false)
    }
  }, [sistemaId])

  useEffect(() => { fetchAll() }, [fetchAll])

  async function criarPoder(p) {
    const { data, error: err } = await supabase
      .from('poderes')
      .insert({ sistema_id: sistemaId, ...montarPayload(p) })
      .select()
      .single()
    if (err) throw err
    setPoderes(prev => [...prev, data])
    return data
  }

  async function atualizarPoder(id, p) {
    const payload = montarPayload(p)
    const { error: err } = await supabase.from('poderes').update(payload).eq('id', id)
    if (err) throw err
    setPoderes(prev => prev.map(x => (x.id === id ? { ...x, ...payload } : x)))
  }

  async function removerPoder(id) {
    const { error: err } = await supabase.from('poderes').delete().eq('id', id)
    if (err) throw err
    setPoderes(prev => prev.filter(x => x.id !== id))
  }

  return { poderes, loading, error, refetch: fetchAll, criarPoder, atualizarPoder, removerPoder }
}
