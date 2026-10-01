import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Membros da mesa com nome de exibição (apelido na mesa > username).
 * @returns {{ membros: {usuario_id, nome, role, avatar_url}[], nomeDe: (id) => string, avatarDe: (id) => string|null, recarregar }}
 */
export function useMembrosMesa(mesaId) {
  const [membros, setMembros] = useState([])

  const recarregar = useCallback(async () => {
    if (!mesaId) return
    const { data } = await supabase
      .from('membros_mesa')
      .select('role, apelido, avatar_url, usuario:usuario_id (id, username)')
      .eq('mesa_id', mesaId)
    setMembros((data || []).map(m => ({
      usuario_id: m.usuario?.id,
      nome: m.apelido || m.usuario?.username || 'Jogador',
      role: m.role,
      avatar_url: m.avatar_url || null,
    })).filter(m => m.usuario_id))
  }, [mesaId])

  useEffect(() => { recarregar() }, [recarregar])

  const nomeDe = useCallback(
    usuarioId => membros.find(m => m.usuario_id === usuarioId)?.nome || 'Jogador',
    [membros]
  )

  const avatarDe = useCallback(
    usuarioId => membros.find(m => m.usuario_id === usuarioId)?.avatar_url || null,
    [membros]
  )

  return { membros, nomeDe, avatarDe, recarregar }
}
