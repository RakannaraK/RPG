import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { faltaConfirmar, traduzirErroAuth } from '../../lib/erroAuth'
import Captcha, { CHAVE_CAPTCHA } from './Captcha'

export default function LoginForm() {
  const { login, reenviarConfirmacao } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [captcha, setCaptcha] = useState(null)
  const [versaoCaptcha, setVersaoCaptcha] = useState(0)
  const [reenviar, setReenviar] = useState('') // '' | 'pode' | 'enviado'

  function novoCaptcha() { setCaptcha(null); setVersaoCaptcha(v => v + 1) }

  async function reenviarEmail() {
    setError('')
    try { await reenviarConfirmacao(email, captcha); setReenviar('enviado') }
    catch (err) { setError(traduzirErroAuth(err)) }
    finally { novoCaptcha() }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    setReenviar('')
    try {
      await login(email, password, captcha)
    } catch (err) {
      setError(traduzirErroAuth(err) || 'Erro ao entrar. Verifique seus dados.')
      if (faltaConfirmar(err)) setReenviar('pode')
    } finally {
      setLoading(false)
      novoCaptcha()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-purple-200 mb-1.5">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-void border border-border text-white placeholder-ink-dim focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
          placeholder="seu@email.com"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-purple-200 mb-1.5">Senha</label>
        <input
          type="password"
          required
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-void border border-border text-white placeholder-ink-dim focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
          placeholder="••••••••"
        />
      </div>

      {error && (
        <div className="flex items-start gap-2 text-red-400 text-sm bg-red-950/60 border border-red-800/60 rounded-xl px-4 py-3">
          <span className="shrink-0 mt-0.5">⚠</span>
          <span>{error}</span>
        </div>
      )}
      {reenviar === 'pode' && (
        <button type="button" onClick={reenviarEmail} disabled={!!CHAVE_CAPTCHA && !captcha}
          className="w-full py-2 text-sm text-purple-300 hover:text-white underline disabled:opacity-50">
          Reenviar o e-mail de confirmação
        </button>
      )}
      {reenviar === 'enviado' && <p className="text-ok text-sm text-center" role="status">Enviamos de novo. Confira a caixa de entrada e o spam.</p>}

      <Captcha onToken={setCaptcha} versao={versaoCaptcha} />

      <button
        type="submit"
        disabled={loading || (!!CHAVE_CAPTCHA && !captcha)}
        className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-sobre-acento font-semibold rounded-xl transition-colors shadow-lg shadow-purple-900/50 text-base"
      >
        {loading ? 'Entrando...' : 'Entrar'}
      </button>
    </form>
  )
}
