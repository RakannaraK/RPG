import { useEffect, useRef } from 'react'

/**
 * Verificação anti-robô (Cloudflare Turnstile) no login, no cadastro e na
 * entrada de convidado. Só aparece se a chave VITE_TURNSTILE_SITE_KEY existir;
 * sem ela, nada muda no site. O servidor (Supabase → Captcha) é quem confere.
 *
 * Cada token vale UMA tentativa: depois de tentar, o formulário troca `versao`
 * para o widget gerar outro.
 */
export const CHAVE_CAPTCHA = import.meta.env.VITE_TURNSTILE_SITE_KEY || ''

let apiTurnstile = null
function carregarTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile)
  if (!apiTurnstile) {
    apiTurnstile = new Promise((ok, falha) => {
      const s = document.createElement('script')
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
      s.async = true
      s.onload = () => ok(window.turnstile)
      s.onerror = () => { apiTurnstile = null; falha(new Error('Não foi possível carregar a verificação anti-robô.')) }
      document.head.appendChild(s)
    })
  }
  return apiTurnstile
}

export default function Captcha({ onToken, versao = 0 }) {
  const alvo = useRef(null)
  const onTokenRef = useRef(onToken)
  useEffect(() => { onTokenRef.current = onToken })

  useEffect(() => {
    if (!CHAVE_CAPTCHA) return
    let vivo = true
    let widget = null
    carregarTurnstile().then(t => {
      if (!vivo || !alvo.current) return
      widget = t.render(alvo.current, {
        sitekey: CHAVE_CAPTCHA,
        language: 'pt-br',
        theme: 'dark',
        callback: token => onTokenRef.current(token),
        'expired-callback': () => onTokenRef.current(null),
        'error-callback': () => onTokenRef.current(null),
      })
    }).catch(() => onTokenRef.current(null))
    return () => { vivo = false; if (widget != null) window.turnstile?.remove(widget) }
  }, [versao])

  if (!CHAVE_CAPTCHA) return null
  return <div ref={alvo} className="min-h-[65px] flex justify-center" />
}
