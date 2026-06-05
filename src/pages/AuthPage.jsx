import { useState } from 'react'
import LoginForm from '../components/auth/LoginForm'
import RegisterForm from '../components/auth/RegisterForm'

export default function AuthPage() {
  const [mode, setMode] = useState('login')

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-950 via-slate-900 to-black px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🎲</div>
          <h1 className="text-3xl font-bold text-white">RPG Ficha</h1>
          <p className="text-purple-300 mt-2">Gerencie suas campanhas e personagens</p>
        </div>

        <div className="bg-slate-900 border border-purple-800 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-semibold text-white mb-6 text-center">
            {mode === 'login' ? 'Entrar na sua conta' : 'Criar nova conta'}
          </h2>

          {mode === 'login' ? (
            <LoginForm onSwitchToRegister={() => setMode('register')} />
          ) : (
            <RegisterForm onSwitchToLogin={() => setMode('login')} />
          )}
        </div>
      </div>
    </div>
  )
}
