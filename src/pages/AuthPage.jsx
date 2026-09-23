import { useState } from 'react'
import { Link } from 'react-router-dom'
import LoginForm from '../components/auth/LoginForm'
import RegisterForm from '../components/auth/RegisterForm'
import Marca from '../components/marca/Marca'
import { DESCRICAO } from '../lib/marca'

export default function AuthPage() {
  const [mode, setMode] = useState('login')

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-950 via-slate-900 to-black px-4 relative overflow-hidden">
      {/* Glows decorativos */}
      <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-purple-700/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-purple-900/20 rounded-full blur-2xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* F37 — marca */}
        <div className="mb-8 flex flex-col items-center text-center">
          <Marca tamanho="lg" comTagline pulso />
          <p className="mt-3 text-sm" style={{ color: 'var(--ink-dim)' }}>{DESCRICAO}</p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/90 backdrop-blur border border-purple-800/60 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-purple-900/80">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-4 text-sm font-semibold transition-colors ${
                mode === 'login'
                  ? 'text-white bg-purple-900/40 border-b-2 border-purple-500'
                  : 'text-purple-400 hover:text-purple-200'
              }`}
            >
              Entrar
            </button>
            <button
              onClick={() => setMode('register')}
              className={`flex-1 py-4 text-sm font-semibold transition-colors ${
                mode === 'register'
                  ? 'text-white bg-purple-900/40 border-b-2 border-purple-500'
                  : 'text-purple-400 hover:text-purple-200'
              }`}
            >
              Criar conta
            </button>
          </div>

          <div className="px-8 py-7">
            {mode === 'login' ? (
              <LoginForm onSwitchToRegister={() => setMode('register')} />
            ) : (
              <RegisterForm onSwitchToLogin={() => setMode('login')} />
            )}
          </div>
        </div>

        {/* F36 — dá para experimentar antes de criar conta */}
        <p className="text-center mt-5 text-sm text-purple-400">
          Quer ver antes?{' '}
          <Link to="/comunidade" className="text-purple-200 underline hover:text-white">
            Rode um dado e veja o que a comunidade compartilha
          </Link>{' '}
          — sem conta.
        </p>
      </div>
    </div>
  )
}
