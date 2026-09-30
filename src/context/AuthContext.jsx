import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  // captchaToken: só quando a verificação anti-robô está ligada (components/auth/Captcha)
  async function login(email, password, captchaToken = null) {
    const { error } = await supabase.auth.signInWithPassword({ email, password, options: captchaToken ? { captchaToken } : undefined })
    if (error) throw error
  }

  /** Com "Confirm email" ligado no Supabase, não há sessão até a pessoa clicar no link. */
  async function register(email, password, captchaToken = null) {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      // o link do e-mail volta para este site (precisa estar em Supabase → URL Configuration)
      options: { emailRedirectTo: window.location.origin, ...(captchaToken ? { captchaToken } : {}) },
    })
    if (error) throw error
    return { precisaConfirmar: !data.session }
  }

  async function reenviarConfirmacao(email, captchaToken = null) {
    const { error } = await supabase.auth.resend({
      type: 'signup', email,
      options: { emailRedirectTo: window.location.origin, ...(captchaToken ? { captchaToken } : {}) },
    })
    if (error) throw error
  }

  async function logout() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  return (
    <AuthContext.Provider value={{ session, loading, login, register, reenviarConfirmacao, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
