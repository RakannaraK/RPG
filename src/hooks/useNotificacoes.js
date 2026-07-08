import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

/**
 * Fase 16.7 — notificações in-app do próprio usuário (sininho).
 * Carrega as últimas, escuta Realtime (INSERT na própria linha) e marca lidas.
 * RLS `notif_proprio` (usuario_id = auth.uid()) cobre select/update.
 */
export function useNotificacoes() {
  const { session } = useAuth()
  const userId = session?.user?.id
  const [notificacoes, setNotificacoes] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchAll = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const { data } = await supabase
        .from('notificacoes')
        .select('*')
        .eq('usuario_id', userId)
        .order('created_at', { ascending: false })
        .limit(30)
      setNotificacoes(data || [])
    } catch { /* silencioso */ }
    setLoading(false)
  }, [userId])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Realtime — novas notificações chegam ao vivo
  useEffect(() => {
    if (!userId) return
    const ch = supabase
      .channel(`notif-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notificacoes', filter: `usuario_id=eq.${userId}` },
        payload => setNotificacoes(prev => [payload.new, ...prev.slice(0, 29)])
      )
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [userId])

  const naoLidas = notificacoes.filter(n => !n.lida).length

  async function marcarLida(id) {
    setNotificacoes(prev => prev.map(n => (n.id === id ? { ...n, lida: true } : n)))
    try { await supabase.from('notificacoes').update({ lida: true }).eq('id', id) } catch { /* noop */ }
  }

  async function marcarTodasLidas() {
    const ids = notificacoes.filter(n => !n.lida).map(n => n.id)
    if (ids.length === 0) return
    setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })))
    try { await supabase.from('notificacoes').update({ lida: true }).in('id', ids) } catch { /* noop */ }
  }

  return { notificacoes, naoLidas, loading, marcarLida, marcarTodasLidas, refetch: fetchAll }
}
