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
export function usePresencaSessao(sessaoId, mesaId) {
  const { session } = useAuth()
  const [conectados, setConectados] = useState([])

  useEffect(() => {
    const userId = session?.user?.id
    if (!sessaoId || !userId) return

    let cancelled = false
    let channel

    async function setup() {
      // Nome/avatar de exibição: apelido+avatar da mesa (16.6), fallback username, fallback e-mail
      let nome = session.user.email
      let avatar = null
      if (mesaId) {
        try {
          const { data: membro } = await supabase
            .from('membros_mesa')
            .select('apelido, avatar_url')
            .eq('mesa_id', mesaId)
            .eq('usuario_id', userId)
            .maybeSingle()
          if (membro?.apelido) nome = membro.apelido
          if (membro?.avatar_url) avatar = membro.avatar_url
        } catch { /* segue p/ fallback */ }
      }
      if (nome === session.user.email) {
        try {
          const { data } = await supabase.from('profiles').select('username').eq('id', userId).single()
          if (data?.username) nome = data.username
        } catch { /* mantém e-mail */ }
      }
      if (cancelled) return

      channel = supabase.channel(`sessao-${sessaoId}`, {
        config: { presence: { key: userId } },
      })

      channel.on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const lista = Object.entries(state).map(([key, metas]) => ({
          id: key,
          nome: metas[0]?.nome || 'Jogador',
          avatar: metas[0]?.avatar || null,
          conexoes: metas.length,
        }))
        setConectados(lista)
      })

      channel.subscribe(async status => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ id: userId, nome, avatar, online_at: new Date().toISOString() })
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
  }, [sessaoId, mesaId, session?.user?.id, session?.user?.email])

  return { conectados }
}
