import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Fase 25.2 — log de XP direto (xp_log; padrão da F22). O saldo NÃO deriva do
 * log — vive em fichas.xp (F19); o log é o histórico auditável (contrato 25:
 * todo débito/crédito logado). Insert é best-effort: mestre concedendo em ficha
 * alheia pode não ter INSERT (RLS dono) — a concessão em si passa pela RPC.
 */
export function useXpLog(fichaId) {
  const [log, setLog] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchAll = useCallback(async () => {
    if (!fichaId) return
    setLoading(true)
    try {
      const { data } = await supabase
        .from('xp_log')
        .select('*')
        .eq('ficha_id', fichaId)
        .order('created_at', { ascending: false })
        .limit(100)
      setLog(data || [])
    } finally {
      setLoading(false)
    }
  }, [fichaId])

  useEffect(() => { fetchAll() }, [fetchAll])

  /** Insere uma linha { tipo, quantidade, detalhe }. Falha (RLS) não lança. */
  async function inserir(registro) {
    try {
      const { data, error } = await supabase
        .from('xp_log')
        .insert({ ficha_id: fichaId, ...registro })
        .select()
        .single()
      if (error) throw error
      setLog(prev => [data, ...prev])
      return true
    } catch {
      return false
    }
  }

  return { log, loading, refetch: fetchAll, inserir }
}
