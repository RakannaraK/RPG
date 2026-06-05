import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

export default function LoginForm({ onSwitchToRegister }) {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
    } catch (err) {
      setError(err.message || 'Erro ao entrar. Verifique seus dados.')
    } finally {
      setLoading(false)
    }
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
        {loading ? 'Entrando...' : 'Entrar'}
      </button>

      <p className="text-center text-purple-300 text-sm">
        Não tem conta?{' '}
        <button
          type="button"
          onClick={onSwitchToRegister}
          className="text-purple-400 hover:text-purple-300 underline"
        >
          Registre-se
        </button>
      </p>
    </form>
  )
}
