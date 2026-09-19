import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Membros da mesa com nome de exibição (apelido na mesa > username).
 * @returns {{ membros: {usuario_id, nome, role}[], nomeDe: (id) => string, recarregar }}
 */
export function useMembrosMesa(mesaId) {
  const [membros, setMembros] = useState([])

  const recarregar = useCallback(async () => {
    if (!mesaId) return
    const { data } = await supabase
      .from('membros_mesa')
      .select('role, apelido, usuario:usuario_id (id, username)')
      .eq('mesa_id', mesaId)
    setMembros((data || []).map(m => ({
      usuario_id: m.usuario?.id,
      nome: m.apelido || m.usuario?.username || 'Jogador',
      role: m.role,
    })).filter(m => m.usuario_id))
  }, [mesaId])

  useEffect(() => { recarregar() }, [recarregar])

  const nomeDe = useCallback(
    usuarioId => membros.find(m => m.usuario_id === usuarioId)?.nome || 'Jogador',
    [membros]
  )

  return { membros, nomeDe, recarregar }
}
