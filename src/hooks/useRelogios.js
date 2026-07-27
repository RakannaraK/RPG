import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Relógios de campanha (nível de MESA) — progresso compartilhado que o mestre
 * avança entre sessões ("Investigação do Inquisidor 6/8").
 *
 * Falha de carga (ex.: tabela `relogios_mesa` ainda não criada) é silenciada em
 * `indisponivel` — a página segue funcionando, só sem o painel. Mesmo padrão
 * do useSessoes. Rodar sql/relogios_e_projetos.sql acende a feature.
 */
export function useRelogios(mesaId) {
  const [relogios, setRelogios] = useState([])
  const [loading, setLoading] = useState(true)
  const [indisponivel, setIndisponivel] = useState(false)

  const fetchAll = useCallback(async () => {
    if (!mesaId) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('relogios_mesa')
        .select('*')
        .eq('mesa_id', mesaId)
        .order('ordem', { ascending: true })
        .order('created_at', { ascending: true })
      if (error) throw error
      setRelogios(data || [])
      setIndisponivel(false)
    } catch {
      setRelogios([])
      setIndisponivel(true)
    } finally {
      setLoading(false)
    }
  }, [mesaId])

  useEffect(() => { fetchAll() }, [fetchAll])

  async function criar({ nome, segmentos = 6, descricao = null }) {
    const { data, error } = await supabase
      .from('relogios_mesa')
      .insert({ mesa_id: mesaId, nome: nome.trim(), segmentos: Number(segmentos) || 6, descricao })
      .select()
      .single()
    if (error) throw error
    setRelogios(prev => [...prev, data])
    return data
  }

  /** Avança/recua o relógio, sempre dentro de 0..segmentos. */
  async function avancar(relogio, delta) {
    const novo = Math.max(0, Math.min(Number(relogio.segmentos) || 0, (Number(relogio.preenchido) || 0) + delta))
    const concluido = novo >= (Number(relogio.segmentos) || 0)
    const { error } = await supabase
      .from('relogios_mesa')
      .update({ preenchido: novo, concluido })
      .eq('id', relogio.id)
    if (error) throw error
    setRelogios(prev => prev.map(r => (r.id === relogio.id ? { ...r, preenchido: novo, concluido } : r)))
  }

  async function atualizar(id, patch) {
    const { error } = await supabase.from('relogios_mesa').update(patch).eq('id', id)
    if (error) throw error
    setRelogios(prev => prev.map(r => (r.id === id ? { ...r, ...patch } : r)))
  }

  async function remover(id) {
    const { error } = await supabase.from('relogios_mesa').delete().eq('id', id)
    if (error) throw error
    setRelogios(prev => prev.filter(r => r.id !== id))
  }

  return { relogios, loading, indisponivel, criar, avancar, atualizar, remover, refetch: fetchAll }
}
