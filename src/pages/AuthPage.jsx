import { useState } from 'react'
import LoginForm from '../components/auth/LoginForm'
import RegisterForm from '../components/auth/RegisterForm'

export default function AuthPage() {
  const [mode, setMode] = useState('login')

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-950 via-slate-900 to-black px-4 relative overflow-hidden">
      {/* Glows decorativos */}
      <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-purple-700/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-purple-900/20 rounded-full blur-2xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-purple-800/40 border border-purple-600/40 rounded-2xl mb-4 shadow-xl shadow-purple-900/60">
            <span className="text-4xl">🎲</span>
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">RPG Ficha</h1>
          <p className="text-purple-400 mt-2 text-sm">Gerencie suas campanhas e personagens</p>
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
      </div>
    </div>
  )
}
