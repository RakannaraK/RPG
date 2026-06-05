import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

export default function RegisterForm({ onSwitchToLogin }) {
  const { register } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password !== confirm) {
      setError('As senhas não coincidem.')
      return
    }
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    setLoading(true)
    try {
      await register(email, password)
      setSuccess(true)
    } catch (err) {
      setError(err.message || 'Erro ao registrar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="space-y-5 text-center py-4">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-800/40 border border-purple-600/40 rounded-2xl">
          <span className="text-3xl">🎲</span>
        </div>
        <div>
          <h3 className="text-white font-semibold text-lg">Conta criada!</h3>
          <p className="text-purple-400 text-sm mt-2">
            Verifique seu email para confirmar a conta, depois volte para entrar.
          </p>
        </div>
        <button
          onClick={onSwitchToLogin}
          className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-purple-900/50 text-base"
        >
          Ir para o login
        </button>
      </div>
    )
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
          className="w-full px-4 py-3 rounded-xl bg-purple-950/70 border border-purple-700/70 text-white placeholder-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
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
          className="w-full px-4 py-3 rounded-xl bg-purple-950/70 border border-purple-700/70 text-white placeholder-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
          placeholder="Mínimo 6 caracteres"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-purple-200 mb-1.5">Confirmar senha</label>
        <input
          type="password"
          required
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-purple-950/70 border border-purple-700/70 text-white placeholder-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
          placeholder="••••••••"
        />
      </div>

      {error && (
        <div className="flex items-start gap-2 text-red-400 text-sm bg-red-950/60 border border-red-800/60 rounded-xl px-4 py-3">
          <span className="shrink-0 mt-0.5">⚠</span>
          <span>{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors shadow-lg shadow-purple-900/50 text-base"
      >
        {loading ? 'Criando conta...' : 'Criar conta'}
      </button>
    </form>
  )
}
