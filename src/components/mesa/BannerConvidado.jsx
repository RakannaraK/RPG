import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { souConvidado } from '../../lib/convite'
import Botao from '../ui/Botao'
import Ilustra from '../arte/Ilustra'

const CAMPO = 'flex-1 min-w-[10rem] px-3 py-2 rounded-lg bg-void border border-border text-ink text-sm placeholder:text-ink-dim focus:outline-none focus:ring-1 focus:ring-accent-500'

/**
 * Fase 47 — só para convidado: lembra que a conta mora no navegador e deixa
 * transformá-la numa conta de verdade (mesmo usuário: a ficha continua).
 */
export default function BannerConvidado({ className = '' }) {
  const { session } = useAuth()
  const [aberto, setAberto] = useState(false)
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [msg, setMsg] = useState('')
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)
  if (!souConvidado(session)) return null

  async function salvar(e) {
    e.preventDefault()
    setErro('')
    if (senha.length < 6) { setErro('A senha precisa de pelo menos 6 caracteres.'); return }
    setOcupado(true)
    const { error } = await supabase.auth.updateUser({ email: email.trim(), password: senha })
    setOcupado(false)
    if (error) { setErro(error.message); return }
    setMsg('Pronto! Se chegar um e-mail de confirmação, confirme para terminar. Sua ficha e suas mesas continuam as mesmas.')
  }

  return (
    <section className={`rounded-2xl border border-dashed border-accent-600/70 px-4 py-3 space-y-2 ${className}`} aria-label="Conta de convidado">
      <div className="flex flex-wrap items-center gap-3">
        <Ilustra nome="porta" tamanho={22} className="shrink-0" />
        <p className="flex-1 min-w-[12rem] text-sm text-ink">
          Você está como <strong>convidado</strong>. Tudo fica guardado neste navegador — crie uma conta para não perder a ficha.
          <span className="block text-ink-dim text-xs">Convidado joga normalmente, mas não cria mesa nem publica na comunidade.</span>
        </p>
        {!aberto && !msg && <Botao variante="primario" tamanho="sm" onClick={() => setAberto(true)}>Criar conta</Botao>}
      </div>
      {aberto && !msg && (
        <form onSubmit={salvar} className="flex flex-wrap items-center gap-2">
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="E-mail" aria-label="E-mail" autoComplete="email" className={CAMPO} />
          <input type="password" required value={senha} onChange={e => setSenha(e.target.value)} placeholder="Senha" aria-label="Senha" autoComplete="new-password" className={CAMPO} />
          <Botao type="submit" variante="primario" tamanho="sm" disabled={ocupado}>{ocupado ? 'Salvando…' : 'Salvar conta'}</Botao>
          <Botao variante="fantasma" tamanho="sm" onClick={() => setAberto(false)}>Cancelar</Botao>
        </form>
      )}
      {msg && <p className="text-ok text-xs" role="status">{msg}</p>}
      {erro && <p className="text-harm text-xs" role="alert">{erro}</p>}
    </section>
  )
}
