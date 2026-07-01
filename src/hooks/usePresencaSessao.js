import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

/**
 * Fase 13.2 — presença na sessão via Supabase Realtime Presence.
 *
 * Cada cliente que abre a SessaoPage entra no canal `sessao-${sessaoId}` e
 * publica sua presença (id, nome). O estado é deduplicado por usuário (a chave
 * de presença é o user.id), então várias abas do mesmo usuário contam como uma
 * pessoa (com `conexoes` = nº de abas). Cleanup remove o canal ao desmontar.
 *
 * @returns {{ conectados: Array<{id, nome, conexoes}> }}
 */
export function usePresencaSessao(sessaoId) {
  const { session } = useAuth()
  const [conectados, setConectados] = useState([])

  useEffect(() => {
    const userId = session?.user?.id
    if (!sessaoId || !userId) return

    let cancelled = false
    let channel

    async function setup() {
      // Nome de exibição (username do perfil; fallback e-mail)
      let nome = session.user.email
      try {
        const { data } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', userId)
          .single()
        if (data?.username) nome = data.username
      } catch { /* mantém fallback */ }
      if (cancelled) return

      channel = supabase.channel(`sessao-${sessaoId}`, {
        config: { presence: { key: userId } },
      })

      channel.on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const lista = Object.entries(state).map(([key, metas]) => ({
          id: key,
          nome: metas[0]?.nome || 'Jogador',
          conexoes: metas.length,
        }))
        setConectados(lista)
      })

      channel.subscribe(async status => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ id: userId, nome, online_at: new Date().toISOString() })
        }
      })
    }

    setup()

    return () => {
      cancelled = true
      if (channel) {
        try { channel.untrack() } catch { /* noop */ }
        supabase.removeChannel(channel)
      }
    }
  }, [sessaoId, session?.user?.id, session?.user?.email])

  return { conectados }
}
