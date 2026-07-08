import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export function useMesas() {
  const { session } = useAuth()
  const [mesas, setMesas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchMesas = useCallback(async () => {
    if (!session) return
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('membros_mesa')
        .select(`
          role,
          mesa:mesa_id (
            id,
            nome,
            descricao,
            codigo_convite,
            created_at,
            arquivada
          )
        `)
        .eq('usuario_id', session.user.id)

      if (error) throw error

      // Busca contagem de membros para cada mesa
      const mesasComInfo = await Promise.all(
        (data || []).map(async ({ role, mesa }) => {
          const { count } = await supabase
            .from('membros_mesa')
            .select('*', { count: 'exact', head: true })
            .eq('mesa_id', mesa.id)

          return { ...mesa, role, totalMembros: count || 0 }
        })
      )

      setMesas(mesasComInfo)
    } catch (err) {
      setError(err.message || 'Erro ao carregar mesas.')
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => {
    fetchMesas()
  }, [fetchMesas])

  return { mesas, loading, error, refetch: fetchMesas }
}

export function useCreateMesa() {
  const { session } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function createMesa(nome, descricao) {
    if (!session) throw new Error('Usuário não autenticado')
    setLoading(true)
    setError(null)
    try {
      const { data: mesa, error: mesaError } = await supabase
        .from('mesas')
        .insert({ nome, descricao, criador_id: session.user.id })
        .select()
        .single()

      if (mesaError) throw mesaError

      const { error: membroError } = await supabase
        .from('membros_mesa')
        .insert({ mesa_id: mesa.id, usuario_id: session.user.id, role: 'mestre' })

      if (membroError) throw membroError

      return mesa
    } catch (err) {
      const msg = err.message || 'Erro ao criar mesa.'
      setError(msg)
      throw new Error(msg)
    } finally {
      setLoading(false)
    }
  }

  return { createMesa, loading, error }
}

export function useJoinMesa() {
  const { session } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function joinMesa(codigo) {
    if (!session) throw new Error('Usuário não autenticado')
    setLoading(true)
    setError(null)
    try {
      // A validação do convite e o insert acontecem no banco (RPC SECURITY
      // DEFINER) — o insert direto em membros_mesa é bloqueado por RLS.
      const { data, error: rpcError } = await supabase.rpc('entrar_na_mesa', {
        codigo: codigo.trim(),
      })
      if (rpcError) throw new Error(rpcError.message || 'Erro ao entrar na mesa.')

      const row = Array.isArray(data) ? data[0] : data
      if (!row) throw new Error('Código de convite inválido ou mesa não encontrada.')

      return { id: row.mesa_id, nome: row.nome }
    } catch (err) {
      const msg = err.message || 'Erro ao entrar na mesa.'
      setError(msg)
      throw new Error(msg)
    } finally {
      setLoading(false)
    }
  }

  return { joinMesa, loading, error }
}
