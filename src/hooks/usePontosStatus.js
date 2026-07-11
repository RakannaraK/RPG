import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Fase 22.2 — pool e histórico de pontos de status de uma ficha.
 * `disponiveis` é o saldo; o log é íntegro (soma dos ganhos − gastos = saldo).
 * Todo movimento credita/debita o saldo E insere uma linha no log.
 */
export function usePontosStatus(fichaId) {
  const [disponiveis, setDisponiveis] = useState(0)
  const [temLinha, setTemLinha] = useState(false)
  const [log, setLog] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchAll = useCallback(async () => {
    if (!fichaId) return
    setLoading(true)
    setError(null)
    try {
      const [poolResp, logResp] = await Promise.all([
        supabase.from('pontos_status_ficha').select('disponiveis').eq('ficha_id', fichaId).maybeSingle(),
        supabase.from('pontos_status_log').select('*').eq('ficha_id', fichaId).order('created_at', { ascending: false }),
      ])
      setDisponiveis(poolResp.data?.disponiveis ?? 0)
      setTemLinha(!!poolResp.data)
      setLog(logResp.data || [])
    } catch (err) {
      setError(err.message || 'Erro ao carregar pontos de status.')
    } finally {
      setLoading(false)
    }
  }, [fichaId])

  useEffect(() => { fetchAll() }, [fetchAll])

  const jaRecebeuInicial = log.some(l => l.tipo === 'ganho_inicial')

  /**
   * Registra um movimento: ajusta o saldo (delta) e grava no log.
   * @returns novo saldo
   */
  async function registrar({ delta, tipo, detalhe = null }) {
    const d = Math.trunc(Number(delta) || 0)
    const novo = Math.max(0, disponiveis + d)

    // pool (upsert) + log
    const { error: poolErr } = await supabase
      .from('pontos_status_ficha')
      .upsert({ ficha_id: fichaId, disponiveis: novo }, { onConflict: 'ficha_id' })
    if (poolErr) throw new Error(poolErr.message)

    const { data: linha, error: logErr } = await supabase
      .from('pontos_status_log')
      .insert({ ficha_id: fichaId, tipo, quantidade: d, detalhe })
      .select()
      .single()
    if (logErr) throw new Error(logErr.message)

    setDisponiveis(novo)
    setTemLinha(true)
    setLog(prev => [linha, ...prev])
    return novo
  }

  return { disponiveis, log, jaRecebeuInicial, temLinha, loading, error, refetch: fetchAll, registrar }
}
