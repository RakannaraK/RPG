import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { atributosDeAparencia, reduzMovimento } from '../lib/personalizacao'
import { definirSomDoDado } from '../lib/diceSounds'
import { prefersReducedMotion } from '../theme/motion'

// Preferências visuais/sonoras do usuário, persistidas em profiles.preferencias (JSONB).
const PADRAO = {
  dado_skin: 'padrao', som_ativo: true, som_volume: 0.6,
  // FV.4c — sons de ação (combate), independentes do som de dado acima
  som_acao_ativo: true, som_acao_volume: 0.6,
  // F27 — bandeja de dados: 'todos' | 'meus' | 'nenhum'
  dados_mesa: 'todos',
  // F35 — aparência e som de crítico próprio
  tema: 'violeta', fonte: 'padrao', som_critico_url: null,
  // F37 — som de dado enviado pelo usuário (no lugar do sintetizado)
  som_dado_url: null,
  // F52 — movimento, ambientação e acessibilidade
  animacoes: 'completas', efeitos: 'completos', tamanho_texto: 'normal', alto_contraste: false,
}

// F52 — a aparência fica guardada também no navegador: quem usa carmim não vê
// o site abrir violeta e trocar depois que o perfil chega do banco.
const CHAVE_APARENCIA = 'dp-aparencia'
const CAMPOS_APARENCIA = ['tema', 'fonte', 'animacoes', 'efeitos', 'tamanho_texto', 'alto_contraste']
function aparenciaGuardada() {
  try { return JSON.parse(localStorage.getItem(CHAVE_APARENCIA)) || {} } catch { return {} }
}

const PreferenciasContext = createContext(null)

export function PreferenciasProvider({ children }) {
  const { session } = useAuth()
  const [preferencias, setPreferencias] = useState(() => ({ ...PADRAO, ...aparenciaGuardada() }))
  const [loading, setLoading] = useState(true)
  const [sistemaReduz, setSistemaReduz] = useState(prefersReducedMotion)

  const prefsRef = useRef(preferencias)
  useEffect(() => { prefsRef.current = preferencias }, [preferencias])

  // F52 — o sistema operacional pode mudar o "reduzir movimento" com o site aberto
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!mq) return
    const mudou = () => setSistemaReduz(mq.matches)
    mq.addEventListener('change', mudou)
    return () => mq.removeEventListener('change', mudou)
  }, [])

  const reduzido = reduzMovimento(preferencias.animacoes, sistemaReduz)
  useEffect(() => {
    if (reduzido) document.documentElement.setAttribute('data-movimento', 'reduzido')
    else document.documentElement.removeAttribute('data-movimento')
  }, [reduzido])

  // F35/F52 — aparência no <html>: vale no site todo, só para quem escolheu.
  // Trocar de tema funde o tema velho com o novo (View Transitions do navegador)
  // em vez de virar a chave de uma vez; sem suporte, troca na hora.
  useEffect(() => {
    const html = document.documentElement
    const atributos = atributosDeAparencia(preferencias)
    const aplicar = () => {
      for (const [attr, valor] of Object.entries(atributos)) {
        if (valor) html.setAttribute(attr, valor)
        else html.removeAttribute(attr)
      }
    }
    const temaMudou = html.getAttribute('data-tema') !== atributos['data-tema']
    if (temaMudou && !html.hasAttribute('data-movimento') && document.startViewTransition) {
      document.startViewTransition(aplicar)
    } else aplicar()
    try {
      localStorage.setItem(CHAVE_APARENCIA, JSON.stringify(Object.fromEntries(CAMPOS_APARENCIA.map(c => [c, preferencias[c]]))))
    } catch { /* sem armazenamento: só não lembra entre visitas */ }
  }, [preferencias])

  // F37 — avisa o módulo de som qual arquivo usar no lugar do sintetizado
  useEffect(() => { definirSomDoDado(preferencias.som_dado_url) }, [preferencias.som_dado_url])

  // Carrega ao iniciar / trocar de usuário
  useEffect(() => {
    const uid = session?.user?.id
    if (!uid) {
      // sem conta (ou o login ainda chegando): fica a aparência deste navegador
      setPreferencias({ ...PADRAO, ...aparenciaGuardada() })
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
    <PreferenciasContext.Provider value={{ preferencias, salvarPreferencias, loading, reduzido }}>
      {children}
    </PreferenciasContext.Provider>
  )
}

export function usePreferencias() {
  const ctx = useContext(PreferenciasContext)
  if (!ctx) throw new Error('usePreferencias deve ser usado dentro de PreferenciasProvider')
  return ctx
}
