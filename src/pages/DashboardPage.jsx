import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { souConvidado } from '../lib/convite'
import BannerConvidado from '../components/mesa/BannerConvidado'
import { supabase } from '../lib/supabase'
import { useMesas } from '../hooks/useMesa'
import MesaCard from '../components/mesa/MesaCard'
import MesaCreate from '../components/mesa/MesaCreate'
import MesaInvite from '../components/mesa/MesaInvite'
import PreferenciasModal from '../components/preferencias/PreferenciasModal'
import Sininho from '../components/notificacoes/Sininho'
import GuiaMestre from '../components/ajuda/GuiaMestre'
import Marca from '../components/marca/Marca'
import Ilustra from '../components/arte/Ilustra'
import Botao from '../components/ui/Botao'
import { proximaDaMesa } from '../lib/agenda'

export default function DashboardPage() {
  const { session, logout } = useAuth()
  const { mesas, loading, error, refetch } = useMesas()
  const navigate = useNavigate()

  const [showCreate, setShowCreate] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [showPrefs, setShowPrefs] = useState(false)
  const [showGuia, setShowGuia] = useState(false)
  // F40 — próxima sessão de cada mesa (uma consulta; a RLS devolve só as minhas)
  const [agendas, setAgendas] = useState([])
  useEffect(() => {
    supabase.from('agenda_mesa').select('id, mesa_id, inicio, duracao_min, recorrencia, ate, titulo')
      .then(({ data }) => setAgendas(data || []))
  }, [])
  const proximaDe = mesaId => proximaDaMesa(agendas.filter(a => a.mesa_id === mesaId))
  const [logoutLoading, setLogoutLoading] = useState(false)
  const [showArquivadas, setShowArquivadas] = useState(false)

  // Nome de exibição do usuário logado (no lugar do e-mail no header)
  const [meuApelido, setMeuApelido] = useState('')
  useEffect(() => {
    const uid = session?.user?.id
    if (!uid) return
    supabase.from('profiles').select('username').eq('id', uid).single()
      .then(({ data }) => { if (data?.username) setMeuApelido(data.username) })
  }, [session?.user?.id])

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
      <header className="border-b border-purple-800 py-4">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-between gap-y-3">
        <Marca tamanho="sm" pulso />
        <div className="flex items-center gap-2 sm:gap-4 ml-auto">
          <span className="text-purple-300 text-sm hidden sm:block">{meuApelido || '—'}</span>
          {/* F36 — vitrine da comunidade */}
          <button
            onClick={() => navigate('/comunidade')}
            title="Comunidade: fichas, criaturas, sistemas e artes compartilhados"
            className="p-2 text-purple-300 hover:text-white hover:bg-purple-800/50 rounded-lg transition-colors"
          ><Ilustra nome="globo" tamanho={20} /></button>
          <Sininho />
          <button
            onClick={() => setShowGuia(true)}
            title="Guia do mestre"
            className="p-2 text-purple-300 hover:text-white hover:bg-purple-800/50 rounded-lg transition-colors"
          >
            ?
          </button>
          <button
            onClick={() => setShowPrefs(true)}
            title="Preferências"
            className="p-2 text-purple-300 hover:text-white hover:bg-purple-800/50 rounded-lg transition-colors"
          >
            <Ilustra nome="ajustes" tamanho={20} />
          </button>
          <Botao variante="primario" tamanho="sm"
            onClick={handleLogout}
            disabled={logoutLoading}>
            {logoutLoading ? 'Saindo...' : 'Sair'}
          </Botao>
        </div>
      </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <BannerConvidado className="mb-6" />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Suas Mesas</h1>
            <p className="text-purple-400 mt-1 text-sm">
              {ativas.length === 0 ? 'Nenhuma mesa ativa' : `${ativas.length} ${ativas.length === 1 ? 'mesa' : 'mesas'}`}
            </p>
          </div>
          <div className="flex gap-2 sm:gap-3">
            <Botao variante="contorno" onClick={() => setShowInvite(true)} className="flex-1 sm:flex-none">
              Entrar com código
            </Botao>
            {/* F47 — convidado joga, mas não cria mesa (o banco também barra) */}
            {!souConvidado(session) && (
              <Botao variante="primario" onClick={() => setShowCreate(true)} className="flex-1 sm:flex-none font-semibold">
                + Nova mesa
              </Botao>
            )}
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
                <div className="h-5 bg-purple-900 rounded-lg w-3/4 mb-3" />
                <div className="h-4 bg-purple-900 rounded-lg w-full mb-2" />
                <div className="h-4 bg-purple-900 rounded-lg w-1/2" />
              </div>
            ))}
          </div>
        ) : ativas.length === 0 && arquivadas.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-purple-800 rounded-2xl">
            <Ilustra nome="mapa" tamanho={80} className="mx-auto mb-4" />
            <p className="text-ink text-base font-medium mb-1">Nenhuma mesa ainda</p>
            <p className="text-accent-300 text-sm mb-6">Crie sua primeira mesa ou entre em uma com um código de convite.</p>
            <div className="flex flex-wrap gap-3 justify-center">
              <button
                onClick={() => setShowInvite(true)}
                className="px-5 py-2 border border-purple-600 text-purple-300 hover:text-white hover:border-purple-400 rounded-lg transition-colors text-sm"
              >
                Entrar com código
              </button>
              <button
                onClick={() => setShowCreate(true)}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-sobre-acento font-semibold rounded-lg transition-colors text-sm"
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
                  <MesaCard key={mesa.id} mesa={mesa} proxima={proximaDe(mesa.id)} />
                ))}
              </div>
            ) : (
              <p className="text-accent-300 text-sm py-6 text-center border border-dashed border-purple-900 rounded-2xl">
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
                  {showArquivadas ? '▾' : '▸'} Arquivadas ({arquivadas.length})
                </button>
                {showArquivadas && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3 opacity-75">
                    {arquivadas.map(mesa => (
                      <MesaCard key={mesa.id} mesa={mesa} proxima={proximaDe(mesa.id)} />
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
      {showGuia && <GuiaMestre onFechar={() => setShowGuia(false)} />}
    </div>
  )
}
