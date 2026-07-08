import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useMesas } from '../hooks/useMesa'
import MesaCard from '../components/mesa/MesaCard'
import MesaCreate from '../components/mesa/MesaCreate'
import MesaInvite from '../components/mesa/MesaInvite'
import PreferenciasModal from '../components/preferencias/PreferenciasModal'
import Sininho from '../components/notificacoes/Sininho'

export default function DashboardPage() {
  const { session, logout } = useAuth()
  const { mesas, loading, error, refetch } = useMesas()
  const navigate = useNavigate()

  const [showCreate, setShowCreate] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [showPrefs, setShowPrefs] = useState(false)
  const [logoutLoading, setLogoutLoading] = useState(false)
  const [showArquivadas, setShowArquivadas] = useState(false)

  // 16.8 — separa mesas ativas das arquivadas
  const ativas = mesas.filter(m => !m.arquivada)
  const arquivadas = mesas.filter(m => m.arquivada)

  async function handleLogout() {
    setLogoutLoading(true)
    try {
      await logout()
    } catch {
      setLogoutLoading(false)
    }
  }

  function handleMesaCreated(mesa) {
    setShowCreate(false)
    refetch()
    navigate(`/mesa/${mesa.id}`)
  }

  function handleMesaJoined(mesa) {
    setShowInvite(false)
    refetch()
    navigate(`/mesa/${mesa.id}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-slate-900 to-black">
      <header className="border-b border-purple-800 px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎲</span>
          <span className="text-white font-bold text-lg">RPG Ficha</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-purple-300 text-sm hidden sm:block">{session?.user?.email}</span>
          <Sininho />
          <button
            onClick={() => setShowPrefs(true)}
            title="Preferências"
            className="p-2 text-purple-300 hover:text-white hover:bg-purple-800/50 rounded-lg transition-colors"
          >
            ⚙
          </button>
          <button
            onClick={handleLogout}
            disabled={logoutLoading}
            className="px-4 py-1.5 text-sm bg-purple-800 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg transition-colors"
          >
            {logoutLoading ? 'Saindo...' : 'Sair'}
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Suas Mesas</h1>
            <p className="text-purple-400 mt-1 text-sm">
              {ativas.length === 0 ? 'Nenhuma mesa ativa' : `${ativas.length} ${ativas.length === 1 ? 'mesa' : 'mesas'}`}
            </p>
          </div>
          <div className="flex gap-2 sm:gap-3">
            <button
              onClick={() => setShowInvite(true)}
              className="flex-1 sm:flex-none px-4 py-2 text-sm border border-purple-600 hover:border-purple-400 text-purple-300 hover:text-white rounded-lg transition-colors"
            >
              Entrar com código
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="flex-1 sm:flex-none px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
            >
              + Nova mesa
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-950 border border-red-800 rounded-xl px-4 py-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-slate-800 border border-purple-900 rounded-2xl p-5 animate-pulse">
                <div className="h-5 bg-purple-900 rounded w-3/4 mb-3" />
                <div className="h-4 bg-purple-900 rounded w-full mb-2" />
                <div className="h-4 bg-purple-900 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : ativas.length === 0 && arquivadas.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-purple-800 rounded-2xl">
            <div className="text-5xl mb-4">🗺️</div>
            <p className="text-purple-300 text-lg font-medium mb-2">Nenhuma mesa ainda</p>
            <p className="text-purple-500 text-sm mb-6">Crie sua primeira mesa ou entre em uma com um código de convite.</p>
            <div className="flex flex-wrap gap-3 justify-center">
              <button
                onClick={() => setShowInvite(true)}
                className="px-5 py-2 border border-purple-600 text-purple-300 hover:text-white hover:border-purple-400 rounded-lg transition-colors text-sm"
              >
                Entrar com código
              </button>
              <button
                onClick={() => setShowCreate(true)}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors text-sm"
              >
                + Criar mesa
              </button>
            </div>
          </div>
        ) : (
          <>
            {ativas.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {ativas.map(mesa => (
                  <MesaCard key={mesa.id} mesa={mesa} />
                ))}
              </div>
            ) : (
              <p className="text-purple-500 text-sm py-6 text-center border border-dashed border-purple-900 rounded-2xl">
                Nenhuma mesa ativa. Suas mesas arquivadas estão abaixo.
              </p>
            )}

            {/* Arquivadas (16.8) */}
            {arquivadas.length > 0 && (
              <div className="mt-8">
                <button
                  onClick={() => setShowArquivadas(a => !a)}
                  className="text-purple-400 hover:text-purple-200 text-sm transition-colors"
                >
                  {showArquivadas ? '▾' : '▸'} 📦 Arquivadas ({arquivadas.length})
                </button>
                {showArquivadas && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3 opacity-75">
                    {arquivadas.map(mesa => (
                      <MesaCard key={mesa.id} mesa={mesa} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {showCreate && (
        <MesaCreate
          onClose={() => setShowCreate(false)}
          onCreated={handleMesaCreated}
        />
      )}

      {showInvite && (
        <MesaInvite
          onClose={() => setShowInvite(false)}
          onJoined={handleMesaJoined}
        />
      )}

      {showPrefs && <PreferenciasModal onFechar={() => setShowPrefs(false)} />}
    </div>
  )
}
