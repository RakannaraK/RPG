import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

// Preferências visuais/sonoras do usuário, persistidas em profiles.preferencias (JSONB).
const PADRAO = {
  dado_skin: 'padrao', som_ativo: true, som_volume: 0.6,
  // FV.4c — sons de ação (combate), independentes do som de dado acima
  som_acao_ativo: true, som_acao_volume: 0.6,
}

const PreferenciasContext = createContext(null)

export function PreferenciasProvider({ children }) {
  const { session } = useAuth()
  const [preferencias, setPreferencias] = useState(PADRAO)
  const [loading, setLoading] = useState(true)

  const prefsRef = useRef(preferencias)
  useEffect(() => { prefsRef.current = preferencias }, [preferencias])

  // Carrega ao iniciar / trocar de usuário
  useEffect(() => {
    const uid = session?.user?.id
    if (!uid) {
      setPreferencias(PADRAO)
      setLoading(false)
      return
    }
    let cancelado = false
    setLoading(true)
    supabase
      .from('profiles')
      .select('preferencias')
      .eq('id', uid)
      .single()
      .then(({ data, error }) => {
        if (cancelado) return
        if (error) console.error('Erro ao carregar preferências:', error.message)
        setPreferencias({ ...PADRAO, ...(data?.preferencias || {}) })
        setLoading(false)
      })
    return () => { cancelado = true }
  }, [session?.user?.id])

  // Atualiza local (otimista) e persiste no banco
  const salvarPreferencias = useCallback(async (patch) => {
    const next = { ...prefsRef.current, ...patch }
    setPreferencias(next)
    const uid = session?.user?.id
    if (!uid) return
    const { error } = await supabase
      .from('profiles')
      .update({ preferencias: next })
      .eq('id', uid)
    if (error) console.error('Erro ao salvar preferências:', error.message)
  }, [session?.user?.id])

  return (
    <PreferenciasContext.Provider value={{ preferencias, salvarPreferencias, loading }}>
      {children}
    </PreferenciasContext.Provider>
  )
}

export function usePreferencias() {
  const ctx = useContext(PreferenciasContext)
  if (!ctx) throw new Error('usePreferencias deve ser usado dentro de PreferenciasProvider')
  return ctx
}
