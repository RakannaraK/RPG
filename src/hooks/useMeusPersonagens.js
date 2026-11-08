import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

/** F55 — personagens do usuário em todas as mesas (fora as arquivadas), mais recentes primeiro. */
export function useMeusPersonagens() {
  const { session } = useAuth()
  const uid = session?.user?.id
  const [personagens, setPersonagens] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) return
    let vivo = true
    supabase.from('fichas')
      .select('id, nome_personagem, imagem_url, nivel, raca, classe, mesa_id, updated_at, mesa:mesa_id(id, nome, arquivada, capa)')
      .eq('dono_id', uid).eq('tipo_ficha', 'personagem')
      .order('updated_at', { ascending: false }).limit(12)
      .then(({ data }) => {
        if (!vivo) return
        setPersonagens((data || []).filter(f => f.mesa && !f.mesa.arquivada))
        setLoading(false)
      })
    return () => { vivo = false }
  }, [uid])

  return { personagens, loading }
}
