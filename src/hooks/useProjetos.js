import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Projetos de downtime (nível de FICHA) — o que o personagem faz nas semanas
 * ENTRE as sessões: treinar, pesquisar, forjar, cultivar contatos.
 *
 * Falha de carga (ex.: tabela `projetos_ficha` ainda não criada) é silenciada
 * em `indisponivel` — a ficha segue funcionando, só sem o painel. Mesmo padrão
 * do useSessoes. Rodar sql/relogios_e_projetos.sql acende a feature.
 */
export function useProjetos(fichaId) {
  const [projetos, setProjetos] = useState([])
  const [loading, setLoading] = useState(true)
  const [indisponivel, setIndisponivel] = useState(false)

  const fetchAll = useCallback(async () => {
    if (!fichaId) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('projetos_ficha')
        .select('*')
        .eq('ficha_id', fichaId)
        .order('concluido', { ascending: true })
        .order('created_at', { ascending: true })
      if (error) throw error
      setProjetos(data || [])
      setIndisponivel(false)
    } catch {
      setProjetos([])
      setIndisponivel(true)
    } finally {
      setLoading(false)
    }
  }, [fichaId])

  useEffect(() => { fetchAll() }, [fetchAll])

  async function criar({ nome, meta = 4, descricao = null }) {
    const { data, error } = await supabase
      .from('projetos_ficha')
      .insert({ ficha_id: fichaId, nome: nome.trim(), meta: Number(meta) || 4, descricao })
      .select()
      .single()
    if (error) throw error
    setProjetos(prev => [...prev, data])
    return data
  }

  /** Registra progresso, sempre dentro de 0..meta. Ao atingir a meta, conclui. */
  async function progredir(projeto, delta) {
    const meta = Number(projeto.meta) || 0
    const novo = Math.max(0, Math.min(meta, (Number(projeto.progresso) || 0) + delta))
    const concluido = novo >= meta
    const { error } = await supabase
      .from('projetos_ficha')
      .update({ progresso: novo, concluido })
      .eq('id', projeto.id)
    if (error) throw error
    setProjetos(prev => prev.map(p => (p.id === projeto.id ? { ...p, progresso: novo, concluido } : p)))
  }

  async function remover(id) {
    const { error } = await supabase.from('projetos_ficha').delete().eq('id', id)
    if (error) throw error
    setProjetos(prev => prev.filter(p => p.id !== id))
  }

  return { projetos, loading, indisponivel, criar, progredir, remover, refetch: fetchAll }
}
