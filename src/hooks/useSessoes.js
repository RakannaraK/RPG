import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

/**
 * Fase 13.1 — sessões ao vivo de uma mesa.
 *
 * Carrega a sessão ATIVA da mesa (uma por vez) e expõe abrir/encerrar (só o
 * mestre, garantido por RLS). Escuta Realtime em `sessoes` para que jogadores
 * vejam a sessão abrir/encerrar na hora, sem reload.
 *
 * Falhas de carga (ex: tabela `sessoes` ainda não criada) são silenciadas em
 * `error` — a MesaPage segue funcionando normalmente, só sem UI de sessão.
 */
export function useSessoes(mesaId) {
  const { session } = useAuth()
  const [sessaoAtiva, setSessaoAtiva] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchAtiva = useCallback(async () => {
    if (!mesaId) return
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('sessoes')
        .select('*')
        .eq('mesa_id', mesaId)
        .eq('ativa', true)
        .order('iniciada_em', { ascending: false })
        .limit(1)
      if (err) throw err
      setSessaoAtiva(data?.[0] || null)
    } catch (err) {
      setError(err.message || 'Erro ao carregar sessão.')
      setSessaoAtiva(null)
    } finally {
      setLoading(false)
    }
  }, [mesaId])

  useEffect(() => { fetchAtiva() }, [fetchAtiva])

  // Realtime — reflete abrir/encerrar sessão para todos na mesa
  useEffect(() => {
    if (!mesaId) return
    const channel = supabase
      .channel(`sessoes-mesa-${mesaId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sessoes', filter: `mesa_id=eq.${mesaId}` },
        () => fetchAtiva()
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [mesaId, fetchAtiva])

  /**
   * Abre uma nova sessão. Título default "Sessão N" (N = total de sessões + 1).
   * @param {string} [titulo]
   */
  async function iniciarSessao(titulo) {
    const { count } = await supabase
      .from('sessoes')
      .select('*', { count: 'exact', head: true })
      .eq('mesa_id', mesaId)
    const tituloFinal = (titulo || '').trim() || `Sessão ${(count || 0) + 1}`
    const { data, error: err } = await supabase
      .from('sessoes')
      .insert({ mesa_id: mesaId, aberta_por: session.user.id, ativa: true, titulo: tituloFinal })
      .select()
      .single()
    if (err) throw err
    setSessaoAtiva(data)
    // Notifica os demais membros da mesa (16.7) — best-effort, não bloqueia
    try {
      await supabase.rpc('notificar_mesa', {
        p_mesa_id: mesaId,
        p_tipo: 'sessao_iniciada',
        p_titulo: 'Sessão iniciada',
        p_corpo: tituloFinal,
        p_link: `/mesa/${mesaId}/sessao/${data.id}`,
      })
    } catch { /* notificação é opcional */ }
    return data
  }

  /** Encerra a sessão (ativa=false, encerrada_em=now). */
  async function encerrarSessao(sessaoId) {
    const { error: err } = await supabase
      .from('sessoes')
      .update({ ativa: false, encerrada_em: new Date().toISOString() })
      .eq('id', sessaoId)
    if (err) throw err
    setSessaoAtiva(null)
  }

  return { sessaoAtiva, loading, error, refetch: fetchAtiva, iniciarSessao, encerrarSessao }
}
