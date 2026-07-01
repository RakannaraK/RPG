import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useSistema } from '../hooks/useSistema'
import { usePresencaSessao } from '../hooks/usePresencaSessao'
import { useSessaoFichas } from '../hooks/useSessaoFichas'
import PresencaBar from '../components/sessao/PresencaBar'
import PainelFichas from '../components/sessao/PainelFichas'
import FeedRolagens from '../components/dados/FeedRolagens'

/**
 * Fase 13 — tela da sessão ao vivo.
 *  13.2 — cabeçalho + presença (feito aqui)
 *  13.3 — painel de fichas em tempo real (placeholder abaixo)
 *  13.4 — feed compartilhado (placeholder abaixo)
 */
export default function SessaoPage() {
  const { id: mesaId, sessaoId } = useParams()
  const { session } = useAuth()
  const navigate = useNavigate()

  const [sessao, setSessao] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const { conectados } = usePresencaSessao(sessaoId)

  // Sistema da mesa (para o motor de modificadores no painel de fichas)
  const { sistema, racas, classes, habilidades, atributos, pericias } = useSistema(mesaId)
  const sistemaBundle = useMemo(
    () => ({ racas, classes, habilidades, atributos, pericias }),
    [racas, classes, habilidades, atributos, pericias]
  )
  const camposCombate = sistema?.config_layout?.campos_combate || []
  const { cards, loading: loadingCards, error: erroCards, conectado } = useSessaoFichas(mesaId, sistemaBundle)

  // Aba ativa no mobile (no desktop painel e feed aparecem lado a lado)
  const [abaMobile, setAbaMobile] = useState('fichas')

  useEffect(() => {
    async function carregar() {
      setLoading(true)
      setError('')
      try {
        const { data, error: err } = await supabase
          .from('sessoes')
          .select('*')
          .eq('id', sessaoId)
          .single()
        if (err) throw err
        setSessao(data)
      } catch (err) {
        setError(err.message || 'Erro ao carregar sessão.')
      } finally {
        setLoading(false)
      }
    }
    if (session && sessaoId) carregar()
  }, [session, sessaoId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-950 via-slate-900 to-black">
        <div className="text-purple-400 text-lg">Carregando sessão...</div>
      </div>
    )
  }

  if (error || !sessao) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-950 via-slate-900 to-black">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || 'Sessão não encontrada.'}</p>
          <button
            onClick={() => navigate(`/mesa/${mesaId}`)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            Voltar à mesa
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-slate-900 to-black">
      {/* Cabeçalho */}
      <header className="border-b border-purple-800 px-4 sm:px-6 py-4 sticky top-0 z-20 bg-slate-950/80 backdrop-blur">
        <div className="max-w-7xl mx-auto flex items-center gap-4 flex-wrap">
          <button
            onClick={() => navigate(`/mesa/${mesaId}`)}
            className="text-purple-400 hover:text-white transition-colors text-sm shrink-0"
          >
            ← Sair da sessão
          </button>
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-white font-bold text-xl leading-tight truncate">
              {sessao.titulo || 'Sessão'}
            </h1>
            {sessao.ativa ? (
              <span className="inline-flex items-center gap-1.5 text-red-300 text-[11px] font-bold uppercase tracking-wider shrink-0">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                Ao vivo
              </span>
            ) : (
              <span className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider shrink-0">
                Encerrada
              </span>
            )}
          </div>
          <div className="ml-auto shrink-0 flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${
                conectado ? 'text-emerald-300' : 'text-amber-300'
              }`}
              title={conectado ? 'Tempo real conectado' : 'Reconectando ao tempo real...'}
            >
              <span className={`w-2 h-2 rounded-full ${conectado ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
              <span className="hidden sm:inline">{conectado ? 'Conectado' : 'Reconectando…'}</span>
            </span>
            <PresencaBar conectados={conectados} meuId={session?.user?.id} />
          </div>
        </div>
      </header>

      {/* Corpo: painel de fichas + feed */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {!sessao.ativa && (
          <div className="mb-4 rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-purple-300 text-sm">
            Esta sessão foi encerrada. Você está vendo o registro dela.
          </div>
        )}

        {/* Abas — só no mobile */}
        <div className="flex lg:hidden gap-2 mb-4">
          <button
            onClick={() => setAbaMobile('fichas')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              abaMobile === 'fichas' ? 'bg-purple-700 text-white' : 'bg-slate-800 text-purple-300'
            }`}
          >
            Personagens
          </button>
          <button
            onClick={() => setAbaMobile('feed')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              abaMobile === 'feed' ? 'bg-purple-700 text-white' : 'bg-slate-800 text-purple-300'
            }`}
          >
            Rolagens
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Painel de fichas (13.3) */}
          <div className={`flex-1 min-w-0 w-full ${abaMobile === 'fichas' ? 'block' : 'hidden'} lg:block`}>
            <p className="hidden lg:block text-purple-300 text-sm font-medium mb-3">Personagens na sessão</p>
            <PainelFichas
              cards={cards}
              camposCombate={camposCombate}
              loading={loadingCards}
              error={erroCards}
            />
          </div>

          {/* Feed compartilhado (13.4) */}
          <aside className={`w-full lg:w-80 xl:w-96 shrink-0 ${abaMobile === 'feed' ? 'block' : 'hidden'} lg:block`}>
            <p className="hidden lg:block text-purple-300 text-sm font-medium mb-3">
              {sessao.ativa ? 'Rolagens' : 'Rolagens da sessão'}
            </p>
            {sessao.ativa ? (
              <FeedRolagens mesaId={mesaId} />
            ) : (
              <FeedRolagens
                mesaId={mesaId}
                desde={sessao.iniciada_em}
                ate={sessao.encerrada_em}
                aoVivo={false}
              />
            )}
          </aside>
        </div>
      </div>
    </div>
  )
}
