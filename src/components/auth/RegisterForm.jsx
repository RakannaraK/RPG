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
      <div className="space-y-4 text-center">
        <div className="text-4xl">🎲</div>
        <h3 className="text-purple-200 font-semibold text-lg">Conta criada!</h3>
        <p className="text-purple-300 text-sm">
          Verifique seu email para confirmar a conta, depois volte para entrar.
        </p>
        <button
          onClick={onSwitchToLogin}
          className="w-full py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
        >
          Ir para o login
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-purple-200 mb-1">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full px-4 py-2 rounded-lg bg-purple-950 border border-purple-700 text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          placeholder="seu@email.com"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-purple-200 mb-1">Senha</label>
        <input
          type="password"
          required
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full px-4 py-2 rounded-lg bg-purple-950 border border-purple-700 text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          placeholder="Mínimo 6 caracteres"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-purple-200 mb-1">Confirmar senha</label>
        <input
          type="password"
          required
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          className="w-full px-4 py-2 rounded-lg bg-purple-950 border border-purple-700 text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          placeholder="••••••••"
        />
      </div>

      {error && (
        <p className="text-red-400 text-sm bg-red-950 border border-red-800 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2 px-4 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
      >
        {loading ? 'Criando conta...' : 'Criar conta'}
      </button>

      <p className="text-center text-purple-300 text-sm">
        Já tem conta?{' '}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-purple-400 hover:text-purple-300 underline"
        >
          Entrar
        </button>
      </p>
    </form>
  )
}
