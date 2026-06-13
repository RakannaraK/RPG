import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import SistemaEditor from '../components/sistema/SistemaEditor'
import { useFichas } from '../hooks/useFicha'
import FichaCreate from '../components/ficha/FichaCreate'
import RoladorGenerico from '../components/dados/RoladorGenerico'
import FeedRolagens from '../components/dados/FeedRolagens'

const TABS = ['Fichas', 'Dados', 'Sistema', 'Membros']

export default function MesaPage() {
  const { id } = useParams()
  const { session } = useAuth()
  const navigate = useNavigate()

  const [mesa, setMesa] = useState(null)
  const [membros, setMembros] = useState([])
  const [meuRole, setMeuRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('Fichas')
  const [copiado, setCopiado] = useState(false)
  const [showFichaCreate, setShowFichaCreate] = useState(false)
  const [novasRolagens, setNovasRolagens] = useState(0)

  // delete mesa
  const [showDeleteMesa, setShowDeleteMesa] = useState(false)
  const [deletingMesa, setDeletingMesa] = useState(false)
  const [deleteMesaError, setDeleteMesaError] = useState('')

  // delete ficha
  const [fichaToDelete, setFichaToDelete] = useState(null)
  const [deletingFicha, setDeletingFicha] = useState(false)
  const [deleteFichaError, setDeleteFichaError] = useState('')

  const { fichas, loading: loadingFichas, refetch: refetchFichas } = useFichas(id)

  useEffect(() => {
    async function fetchMesa() {
      setLoading(true)
      setError(null)
      try {
        const { data: mesaData, error: mesaError } = await supabase
          .from('mesas')
          .select('*')
          .eq('id', id)
          .single()

        if (mesaError) throw mesaError

        const { data: membrosData, error: membrosError } = await supabase
          .from('membros_mesa')
          .select(`role, joined_at, usuario:usuario_id (id, username)`)
          .eq('mesa_id', id)

        if (membrosError) throw membrosError

        const meu = membrosData?.find(m => m.usuario.id === session.user.id)
        if (!meu) {
          navigate('/dashboard')
          return
        }

        setMesa(mesaData)
        setMembros(membrosData || [])
        setMeuRole(meu.role)
      } catch (err) {
        setError(err.message || 'Erro ao carregar mesa.')
      } finally {
        setLoading(false)
      }
    }

    if (session && id) fetchMesa()
  }, [id, session, navigate])

  async function copiarCodigo() {
    try {
      await navigator.clipboard.writeText(mesa.codigo_convite)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      const el = document.createElement('textarea')
      el.value = mesa.codigo_convite
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    }
  }

  async function handleDeleteMesa() {
    setDeletingMesa(true)
    setDeleteMesaError('')
    try {
      const { error: err } = await supabase
        .from('mesas')
        .delete()
        .eq('id', id)
      if (err) throw err
      navigate('/dashboard')
    } catch (err) {
      setDeleteMesaError(err.message || 'Erro ao deletar mesa.')
      setDeletingMesa(false)
    }
  }

  async function handleDeleteFicha() {
    if (!fichaToDelete) return
    setDeletingFicha(true)
    setDeleteFichaError('')
    try {
      const { error: err } = await supabase
        .from('fichas')
        .delete()
        .eq('id', fichaToDelete.id)
      if (err) throw err
      setFichaToDelete(null)
      refetchFichas()
    } catch (err) {
      setDeleteFichaError(err.message || 'Erro ao deletar ficha.')
      setDeletingFicha(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-950 via-slate-900 to-black">
        <div className="text-purple-400 text-lg">Carregando mesa...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-950 via-slate-900 to-black">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
          >
            Voltar ao dashboard
          </button>
        </div>
      </div>
    )
  }

  const isCriador = mesa?.criador_id === session?.user?.id

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-slate-900 to-black">
      <header className="border-b border-purple-800 px-4 sm:px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-purple-400 hover:text-white transition-colors text-sm shrink-0"
          >
            ← Voltar
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-white font-bold text-xl leading-tight truncate">{mesa?.nome}</h1>
            {mesa?.descricao && (
              <p className="text-purple-400 text-sm mt-0.5 truncate">{mesa.descricao}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
              meuRole === 'mestre' ? 'bg-amber-500 text-amber-950' : 'bg-purple-700 text-white'
            }`}>
              {meuRole === 'mestre' ? 'Mestre' : 'Jogador'}
            </span>
            {isCriador && (
              <button
                onClick={() => setShowDeleteMesa(true)}
                className="p-2 text-red-500 hover:text-red-400 hover:bg-red-950/50 rounded-lg transition-colors"
                title="Deletar mesa"
              >
                🗑
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="flex border-b border-purple-900 mt-6 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); if (tab === 'Dados') setNovasRolagens(0) }}
              className={`relative px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px shrink-0 whitespace-nowrap ${
                activeTab === tab
                  ? 'text-white border-purple-500'
                  : 'text-purple-400 border-transparent hover:text-purple-200'
              }`}
            >
              {tab}
              {tab === 'Dados' && novasRolagens > 0 && activeTab !== 'Dados' && (
                <span className="ml-1.5 inline-flex items-center justify-center text-[10px] font-bold bg-amber-500 text-amber-950 rounded-full w-4 h-4">
                  {novasRolagens > 9 ? '9+' : novasRolagens}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="py-8">
          {activeTab === 'Fichas' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-purple-300 text-sm">
                  {loadingFichas
                    ? 'Carregando...'
                    : fichas.length > 0
                    ? `${fichas.length} ficha${fichas.length > 1 ? 's' : ''}`
                    : 'Nenhuma ficha ainda'}
                </p>
                <button
                  onClick={() => setShowFichaCreate(true)}
                  className="text-sm px-4 py-2 bg-purple-700 hover:bg-purple-600 text-white rounded-lg transition-colors"
                >
                  + Nova ficha
                </button>
              </div>

              {loadingFichas ? (
                <div className="space-y-3">
                  {[1, 2].map(i => (
                    <div key={i} className="h-20 bg-slate-800 rounded-xl animate-pulse border border-purple-900" />
                  ))}
                </div>
              ) : fichas.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-purple-800 rounded-2xl">
                  <div className="text-4xl mb-4">📜</div>
                  <p className="text-purple-300 text-lg font-medium mb-2">Nenhuma ficha criada</p>
                  <p className="text-purple-500 text-sm mb-5">
                    Crie sua primeira ficha de personagem para começar a aventura!
                  </p>
                  <button
                    onClick={() => setShowFichaCreate(true)}
                    className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors"
                  >
                    + Criar ficha
                  </button>
                </div>
              ) : (
                <div className="grid gap-3">
                  {fichas.map(f => {
                    const ehDono = f.dono?.id === session?.user?.id
                    return (
                      <div
                        key={f.id}
                        className="flex bg-slate-800 border border-purple-800 hover:border-purple-600 rounded-xl transition-all overflow-hidden"
                      >
                        <button
                          onClick={() => navigate(`/mesa/${id}/ficha/${f.id}`)}
                          className="flex-1 text-left p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-white font-semibold">{f.nome_personagem}</p>
                              <p className="text-purple-400 text-sm mt-0.5">
                                {[f.raca, f.classe, f.nivel ? `Nível ${f.nivel}` : null]
                                  .filter(Boolean)
                                  .join(' · ') || 'Sem detalhes'}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              {f.hp_maximo && (
                                <p className="text-green-400 text-sm font-medium">
                                  {f.hp_atual ?? '?'}/{f.hp_maximo} HP
                                </p>
                              )}
                              <p className="text-purple-500 text-xs mt-0.5">{f.dono?.username}</p>
                            </div>
                          </div>
                        </button>
                        {ehDono && (
                          <button
                            onClick={() => { setDeleteFichaError(''); setFichaToDelete(f) }}
                            className="px-3 text-red-500 hover:text-red-400 hover:bg-red-950/40 border-l border-purple-800 transition-colors"
                            title="Deletar ficha"
                          >
                            🗑
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {showFichaCreate && (
                <FichaCreate
                  mesaId={id}
                  onCriada={ficha => {
                    setShowFichaCreate(false)
                    refetchFichas()
                    navigate(`/mesa/${id}/ficha/${ficha.id}`)
                  }}
                  onFechar={() => setShowFichaCreate(false)}
                />
              )}
            </div>
          )}

          {activeTab === 'Dados' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <div>
                <p className="text-purple-200 font-medium text-sm mb-4">Rolar dados</p>
                <RoladorGenerico mesaId={id} />
              </div>
              <div>
                <p className="text-purple-200 font-medium text-sm mb-4">Histórico da sessão</p>
                <FeedRolagens mesaId={id} onNovaRolagem={() => setNovasRolagens(n => n + 1)} />
              </div>
            </div>
          )}

          {activeTab === 'Sistema' && (
            <SistemaEditor mesaId={id} isMestre={meuRole === 'mestre'} />
          )}

          {activeTab === 'Membros' && (
            <div className="space-y-4">
              {meuRole === 'mestre' && (
                <div className="bg-slate-800 border border-purple-800 rounded-xl p-5">
                  <p className="text-purple-300 text-sm font-medium mb-2">Código de convite</p>
                  <div className="flex items-center gap-3">
                    <code className="flex-1 text-center font-mono text-xl tracking-[0.3em] text-white bg-purple-950 border border-purple-700 rounded-lg py-3 px-4 uppercase">
                      {mesa?.codigo_convite}
                    </code>
                    <button
                      onClick={copiarCodigo}
                      className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                        copiado ? 'bg-green-700 text-green-100' : 'bg-purple-700 hover:bg-purple-600 text-white'
                      }`}
                    >
                      {copiado ? '✓ Copiado!' : 'Copiar'}
                    </button>
                  </div>
                  <p className="text-purple-500 text-xs mt-2">
                    Compartilhe este código com seus jogadores para eles entrarem na mesa.
                  </p>
                </div>
              )}

              <div className="bg-slate-800 border border-purple-800 rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-purple-900">
                  <p className="text-purple-200 font-medium text-sm">Membros ({membros.length})</p>
                </div>
                <ul className="divide-y divide-purple-900">
                  {membros.map(m => (
                    <li key={m.usuario.id} className="flex items-center justify-between px-5 py-3">
                      <span className="text-white text-sm">{m.usuario.username}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        m.role === 'mestre' ? 'bg-amber-500 text-amber-950' : 'bg-purple-700 text-white'
                      }`}>
                        {m.role === 'mestre' ? 'Mestre' : 'Jogador'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal: deletar mesa */}
      {showDeleteMesa && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-800/60 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-white font-bold text-lg mb-2">Deletar mesa?</h3>
            <p className="text-purple-300 text-sm mb-1">
              Tem certeza? Esta ação não pode ser desfeita.
            </p>
            <p className="text-purple-400 text-xs mb-5">
              Todas as fichas, sistemas, atributos e imagens desta mesa serão apagados permanentemente junto com ela.
            </p>
            {deleteMesaError && (
              <p className="text-red-400 text-sm mb-3">{deleteMesaError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteMesa(false); setDeleteMesaError('') }}
                disabled={deletingMesa}
                className="flex-1 py-2.5 text-purple-300 hover:text-white border border-purple-700 hover:border-purple-500 rounded-xl text-sm transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteMesa}
                disabled={deletingMesa}
                className="flex-1 py-2.5 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-colors"
              >
                {deletingMesa ? 'Deletando...' : 'Deletar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: deletar ficha */}
      {fichaToDelete && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-800/60 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-white font-bold text-lg mb-2">Deletar ficha?</h3>
            <p className="text-purple-300 text-sm mb-1">
              Tem certeza? Esta ação não pode ser desfeita.
            </p>
            <p className="text-purple-400 text-xs mb-5">
              Todos os atributos, equipamentos e imagens de{' '}
              <strong className="text-purple-300">{fichaToDelete.nome_personagem}</strong>{' '}
              serão apagados permanentemente.
            </p>
            {deleteFichaError && (
              <p className="text-red-400 text-sm mb-3">{deleteFichaError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => { setFichaToDelete(null); setDeleteFichaError('') }}
                disabled={deletingFicha}
                className="flex-1 py-2.5 text-purple-300 hover:text-white border border-purple-700 hover:border-purple-500 rounded-xl text-sm transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteFicha}
                disabled={deletingFicha}
                className="flex-1 py-2.5 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-colors"
              >
                {deletingFicha ? 'Deletando...' : 'Deletar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
