import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import SistemaEditor from '../components/sistema/SistemaEditor'
import { useFichas } from '../hooks/useFicha'
import FichaCreate from '../components/ficha/FichaCreate'
import RoladorGenerico from '../components/dados/RoladorGenerico'
import FeedRolagens from '../components/dados/FeedRolagens'
import PreferenciasModal from '../components/preferencias/PreferenciasModal'
import SessaoBanner from '../components/sessao/SessaoBanner'
import SessoesHistorico from '../components/sessao/SessoesHistorico'
import MeuPerfilMesa from '../components/mesa/MeuPerfilMesa'
import Sininho from '../components/notificacoes/Sininho'

const TABS = ['Fichas', 'Dados', 'Sistema', 'Membros']

// Fase 16 — rótulo/cor por papel (mestre/co-mestre/jogador/espectador)
const ROLE_INFO = {
  mestre:      { label: 'Mestre',     cls: 'bg-amber-500 text-amber-950' },
  'co-mestre': { label: 'Co-mestre',  cls: 'bg-orange-500 text-orange-950' },
  jogador:     { label: 'Jogador',    cls: 'bg-purple-700 text-white' },
  espectador:  { label: 'Espectador', cls: 'bg-slate-600 text-slate-100' },
}
const roleInfo = role => ROLE_INFO[role] || ROLE_INFO.jogador

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
  const [showPrefs, setShowPrefs] = useState(false)

  // delete mesa
  const [showDeleteMesa, setShowDeleteMesa] = useState(false)
  const [deletingMesa, setDeletingMesa] = useState(false)
  const [deleteMesaError, setDeleteMesaError] = useState('')

  // sair da mesa (16.1) — destino das fichas: false = deixar (padrão seguro)
  const [showLeave, setShowLeave] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [leaveError, setLeaveError] = useState('')
  const [deletarFichas, setDeletarFichas] = useState(false)

  // expulsar membro (16.2)
  const [membroToExpel, setMembroToExpel] = useState(null)
  const [expelling, setExpelling] = useState(false)
  const [expelError, setExpelError] = useState('')

  // regenerar convite (16.3)
  const [confirmandoRegen, setConfirmandoRegen] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [regenError, setRegenError] = useState('')

  // transferir posse (16.4)
  const [showTransferir, setShowTransferir] = useState(false)
  const [novoDonoId, setNovoDonoId] = useState('')
  const [transferring, setTransferring] = useState(false)
  const [transferError, setTransferError] = useState('')

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
          .maybeSingle()

        if (mesaError) throw mesaError
        // RLS: não-membros não recebem a linha da mesa
        if (!mesaData) throw new Error('Mesa não encontrada ou você não tem acesso a ela.')

        const { data: membrosData, error: membrosError } = await supabase
          .from('membros_mesa')
          .select(`role, joined_at, apelido, avatar_url, usuario:usuario_id (id, username)`)
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

  async function handleLeaveMesa() {
    setLeaving(true)
    setLeaveError('')
    try {
      // Toda a lógica (bloqueio do dono, deleção opcional das fichas, remoção
      // da linha de membro) vive na RPC SECURITY DEFINER — sem delete do cliente.
      const { error: err } = await supabase.rpc('sair_da_mesa', {
        p_mesa_id: id,
        p_deletar_fichas: deletarFichas,
      })
      if (err) throw err
      navigate('/dashboard')
    } catch (err) {
      setLeaveError(err.message || 'Erro ao sair da mesa.')
      setLeaving(false)
    }
  }

  async function handleDefinirRole(usuarioId, novoRole) {
    // Otimista; a RPC valida (só o dono; roles válidos: co-mestre/jogador/espectador)
    const anterior = membros.find(m => m.usuario.id === usuarioId)?.role
    setMembros(prev => prev.map(m => (m.usuario.id === usuarioId ? { ...m, role: novoRole } : m)))
    try {
      const { error: err } = await supabase.rpc('definir_role', {
        p_mesa_id: id,
        p_usuario_id: usuarioId,
        p_role: novoRole,
      })
      if (err) throw err
    } catch {
      // reverte
      setMembros(prev => prev.map(m => (m.usuario.id === usuarioId ? { ...m, role: anterior } : m)))
    }
  }

  async function handleTransferirPosse() {
    if (!novoDonoId) { setTransferError('Escolha o novo dono.'); return }
    setTransferring(true)
    setTransferError('')
    try {
      const { error: err } = await supabase.rpc('transferir_posse', {
        p_mesa_id: id,
        p_novo_dono: novoDonoId,
      })
      if (err) throw err
      // Reflete a nova hierarquia localmente: eu viro co-mestre, o alvo vira mestre
      setMesa(prev => ({ ...prev, criador_id: novoDonoId }))
      setMeuRole('co-mestre')
      setMembros(prev => prev.map(m =>
        m.usuario.id === novoDonoId ? { ...m, role: 'mestre' }
        : m.usuario.id === session.user.id ? { ...m, role: 'co-mestre' }
        : m
      ))
      setShowTransferir(false)
    } catch (err) {
      setTransferError(err.message || 'Erro ao transferir posse.')
    } finally {
      setTransferring(false)
    }
  }

  async function handleRegenerarConvite() {
    setRegenerating(true)
    setRegenError('')
    try {
      const { data: novo, error: err } = await supabase.rpc('regenerar_convite', { p_mesa_id: id })
      if (err) throw err
      setMesa(prev => ({ ...prev, codigo_convite: novo }))
      setConfirmandoRegen(false)
    } catch (err) {
      setRegenError(err.message || 'Erro ao gerar novo código.')
    } finally {
      setRegenerating(false)
    }
  }

  async function handleExpulsar() {
    if (!membroToExpel) return
    setExpelling(true)
    setExpelError('')
    try {
      // RPC valida permissão (dono/co-mestre, não expulsa dono nem co-mestre por co-mestre)
      const { error: err } = await supabase.rpc('expulsar_membro', {
        p_mesa_id: id,
        p_usuario_id: membroToExpel.usuario.id,
      })
      if (err) throw err
      setMembros(prev => prev.filter(m => m.usuario.id !== membroToExpel.usuario.id))
      setMembroToExpel(null)
      refetchFichas() // fichas do expulso viram órfãs
    } catch (err) {
      setExpelError(err.message || 'Erro ao expulsar.')
    } finally {
      setExpelling(false)
    }
  }

  async function handleDeletarFichaOrfa(ficha) {
    setDeleteFichaError('')
    try {
      // RPC: gestor deleta ficha cujo dono não é mais membro (órfã)
      const { error: err } = await supabase.rpc('deletar_ficha_orfa', { p_ficha_id: ficha.id })
      if (err) throw err
      setFichaToDelete(null)
      refetchFichas()
    } catch (err) {
      setDeleteFichaError(err.message || 'Erro ao deletar ficha órfã.')
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
  const isGestor = isCriador || meuRole === 'co-mestre' // dono ou co-mestre (16.2)
  const membroIds = new Set(membros.map(m => m.usuario?.id))
  const meuMembro = membros.find(m => m.usuario?.id === session?.user?.id) // 16.6
  const souEspectador = meuRole === 'espectador' // 16.8
  const arquivada = mesa?.arquivada === true
  const podeEscrever = !souEspectador && !arquivada // criar ficha, rolar, iniciar sessão

  async function handleArquivar(novoValor) {
    try {
      const { error: err } = await supabase.from('mesas').update({ arquivada: novoValor }).eq('id', id)
      if (err) throw err
      setMesa(prev => ({ ...prev, arquivada: novoValor }))
    } catch { /* dono tem UPDATE em mesas; falha silenciosa */ }
  }

  function onPerfilSalvo(apelido, avatarUrl) {
    setMembros(prev => prev.map(m =>
      m.usuario?.id === session?.user?.id ? { ...m, apelido, avatar_url: avatarUrl } : m
    ))
  }

  // Quem o usuário atual pode expulsar (espelha as regras da RPC expulsar_membro)
  function podeExpulsar(m) {
    if (m.usuario.id === session?.user?.id) return false // a si mesmo → usar "sair"
    if (m.role === 'mestre') return false                // ninguém expulsa o dono
    if (isCriador) return true                           // dono expulsa qualquer não-dono
    if (meuRole === 'co-mestre') return m.role !== 'co-mestre' // co-mestre não expulsa co-mestre
    return false
  }

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
            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${roleInfo(meuRole).cls}`}>
              {roleInfo(meuRole).label}
            </span>
            <Sininho />
            <button
              onClick={() => setShowPrefs(true)}
              title="Preferências"
              className="p-2 text-purple-300 hover:text-white hover:bg-purple-800/50 rounded-lg transition-colors"
            >
              ⚙
            </button>
            {!isCriador && (
              <button
                onClick={() => { setLeaveError(''); setDeletarFichas(false); setShowLeave(true) }}
                className="p-2 text-purple-300 hover:text-red-400 hover:bg-red-950/40 rounded-lg transition-colors"
                title="Sair da mesa"
              >
                🚪
              </button>
            )}
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
        {/* Arquivada (16.8) — somente leitura */}
        {arquivada && (
          <div className="mt-6 rounded-xl border border-amber-800/50 bg-amber-950/30 px-4 py-3 flex items-center justify-between gap-2 flex-wrap">
            <p className="text-amber-200 text-sm">📦 Esta mesa está arquivada — somente leitura.</p>
            {isCriador && (
              <button
                onClick={() => handleArquivar(false)}
                className="px-3 py-1.5 bg-amber-800/70 hover:bg-amber-700 text-amber-50 text-sm rounded-lg transition-colors"
              >
                Desarquivar
              </button>
            )}
          </div>
        )}

        {/* Fase 13.1 — banner de sessão ao vivo (não em mesa arquivada) */}
        {!arquivada && <SessaoBanner mesaId={id} isGestor={isGestor} />}
        {/* Fase 13.5 — histórico de sessões encerradas */}
        <SessoesHistorico mesaId={id} />

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
                {podeEscrever && (
                  <button
                    onClick={() => setShowFichaCreate(true)}
                    className="text-sm px-4 py-2 bg-purple-700 hover:bg-purple-600 text-white rounded-lg transition-colors"
                  >
                    + Nova ficha
                  </button>
                )}
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
                    {podeEscrever
                      ? 'Crie sua primeira ficha de personagem para começar a aventura!'
                      : arquivada ? 'Mesa arquivada — somente leitura.' : 'Como espectador, você não cria fichas.'}
                  </p>
                  {podeEscrever && (
                    <button
                      onClick={() => setShowFichaCreate(true)}
                      className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors"
                    >
                      + Criar ficha
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid gap-3">
                  {fichas.map(f => {
                    const ehDono = f.dono?.id === session?.user?.id
                    // Órfã: dono não é mais membro da mesa (saiu/expulso) — Fase 16.2
                    const orfa = !f.dono?.id || !membroIds.has(f.dono.id)
                    const podeDeletar = ehDono || (orfa && isGestor)
                    return (
                      <div
                        key={f.id}
                        className={`flex bg-slate-800 border rounded-xl transition-all overflow-hidden ${
                          orfa ? 'border-amber-800/60 hover:border-amber-600' : 'border-purple-800 hover:border-purple-600'
                        }`}
                      >
                        <button
                          onClick={() => navigate(`/mesa/${id}/ficha/${f.id}`)}
                          className="flex-1 text-left p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-white font-semibold flex items-center gap-2">
                                {f.nome_personagem}
                                {orfa && (
                                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-950 border border-amber-700/60 text-amber-300">
                                    órfã
                                  </span>
                                )}
                              </p>
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
                              <p className="text-purple-500 text-xs mt-0.5">
                                {orfa ? 'ex-membro' : f.dono?.username}
                              </p>
                            </div>
                          </div>
                        </button>
                        {podeDeletar && (
                          <button
                            onClick={() => { setDeleteFichaError(''); setFichaToDelete(f) }}
                            className="px-3 text-red-500 hover:text-red-400 hover:bg-red-950/40 border-l border-purple-800 transition-colors"
                            title={orfa ? 'Deletar ficha órfã' : 'Deletar ficha'}
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
              {podeEscrever && (
                <div>
                  <p className="text-purple-200 font-medium text-sm mb-4">Rolar dados</p>
                  <RoladorGenerico mesaId={id} />
                </div>
              )}
              <div>
                <p className="text-purple-200 font-medium text-sm mb-4">Histórico da sessão</p>
                <FeedRolagens mesaId={id} onNovaRolagem={() => setNovasRolagens(n => n + 1)} />
              </div>
            </div>
          )}

          {activeTab === 'Sistema' && (
            <SistemaEditor mesaId={id} isMestre={isGestor} />
          )}

          {activeTab === 'Membros' && (
            <div className="space-y-4">
              {isGestor && (
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

                  {/* Regenerar convite (16.3) */}
                  <div className="mt-3 pt-3 border-t border-purple-900/60">
                    {!confirmandoRegen ? (
                      <button
                        onClick={() => { setRegenError(''); setConfirmandoRegen(true) }}
                        className="text-xs text-purple-400 hover:text-white transition-colors"
                      >
                        ↻ Gerar novo código
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-amber-300 text-xs">
                          O código antigo <strong>deixará de funcionar</strong>. Quem já é membro continua na mesa.
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleRegenerarConvite}
                            disabled={regenerating}
                            className="px-3 py-1.5 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white text-xs rounded-lg transition-colors"
                          >
                            {regenerating ? 'Gerando...' : 'Confirmar novo código'}
                          </button>
                          <button
                            onClick={() => { setConfirmandoRegen(false); setRegenError('') }}
                            disabled={regenerating}
                            className="px-3 py-1.5 text-purple-400 hover:text-white text-xs transition-colors disabled:opacity-50"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                    {regenError && <p className="text-red-400 text-xs mt-1">{regenError}</p>}
                  </div>
                </div>
              )}

              {/* Meu perfil nesta mesa (16.6) */}
              {meuMembro && (
                <MeuPerfilMesa
                  mesaId={id}
                  usuarioId={session.user.id}
                  username={meuMembro.usuario?.username}
                  apelidoInicial={meuMembro.apelido}
                  avatarInicial={meuMembro.avatar_url}
                  onSaved={onPerfilSalvo}
                />
              )}

              <div className="bg-slate-800 border border-purple-800 rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-purple-900">
                  <p className="text-purple-200 font-medium text-sm">Membros ({membros.length})</p>
                </div>
                <ul className="divide-y divide-purple-900">
                  {membros.map(m => (
                    <li key={m.usuario.id} className="flex items-center justify-between gap-2 px-5 py-3">
                      <div className="flex items-center gap-2 min-w-0">
                        {m.avatar_url ? (
                          <img src={m.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover border border-purple-700 shrink-0" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-purple-950 border border-purple-800 flex items-center justify-center shrink-0">
                            <span className="text-purple-300 text-[10px] font-bold">
                              {(m.apelido || m.usuario.username || '?').slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <span className="text-white text-sm truncate">
                          {m.apelido || m.usuario.username}
                          {m.apelido && <span className="text-purple-600 text-xs"> ({m.usuario.username})</span>}
                          {m.usuario.id === session?.user?.id && <span className="text-purple-500"> (você)</span>}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Dono altera papel (16.5) de todos exceto ele mesmo e o próprio 'mestre' */}
                        {isCriador && m.usuario.id !== session?.user?.id && m.role !== 'mestre' ? (
                          <select
                            value={m.role}
                            onChange={e => handleDefinirRole(m.usuario.id, e.target.value)}
                            className="text-xs px-2 py-1 rounded-lg bg-purple-950 border border-purple-700 text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                            title="Papel na mesa"
                          >
                            <option value="co-mestre">Co-mestre</option>
                            <option value="jogador">Jogador</option>
                            <option value="espectador">Espectador</option>
                          </select>
                        ) : (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${roleInfo(m.role).cls}`}>
                            {roleInfo(m.role).label}
                          </span>
                        )}
                        {podeExpulsar(m) && (
                          <button
                            onClick={() => { setExpelError(''); setMembroToExpel(m) }}
                            className="p-1 text-red-800 hover:text-red-400 transition-colors"
                            title={`Expulsar ${m.usuario.username}`}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Transferir posse (16.4) — só o dono */}
              {isCriador && membros.length > 1 && (
                <div className="bg-slate-800 border border-amber-800/40 rounded-xl p-5">
                  <p className="text-purple-300 text-sm font-medium mb-1">Transferir posse</p>
                  <p className="text-purple-500 text-xs mb-3">
                    Passe a mesa para outro membro. Você deixa de ser o dono e vira co-mestre.
                  </p>
                  <button
                    onClick={() => { setTransferError(''); setNovoDonoId(''); setShowTransferir(true) }}
                    className="px-4 py-2 bg-amber-800/70 hover:bg-amber-700 text-amber-50 text-sm rounded-lg transition-colors"
                  >
                    Transferir posse da mesa
                  </button>
                </div>
              )}

              {/* Arquivar mesa (16.8) — só o dono */}
              {isCriador && (
                <div className="bg-slate-800 border border-purple-800 rounded-xl p-5">
                  <p className="text-purple-300 text-sm font-medium mb-1">{arquivada ? 'Mesa arquivada' : 'Arquivar mesa'}</p>
                  <p className="text-purple-500 text-xs mb-3">
                    {arquivada
                      ? 'A mesa está em somente leitura. Desarquive para voltar a jogar.'
                      : 'Guarda a mesa em somente leitura (sem novas sessões, fichas ou rolagens). Some da lista principal e pode ser desarquivada depois.'}
                  </p>
                  <button
                    onClick={() => handleArquivar(!arquivada)}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-purple-100 text-sm rounded-lg transition-colors"
                  >
                    {arquivada ? 'Desarquivar mesa' : 'Arquivar mesa'}
                  </button>
                </div>
              )}
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
                onClick={() => (
                  fichaToDelete.dono?.id === session?.user?.id
                    ? handleDeleteFicha()          // própria → delete direto (RLS dono)
                    : handleDeletarFichaOrfa(fichaToDelete) // órfã → RPC (gestor)
                )}
                disabled={deletingFicha}
                className="flex-1 py-2.5 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-colors"
              >
                {deletingFicha ? 'Deletando...' : 'Deletar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: sair da mesa (16.1) */}
      {showLeave && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-purple-700/60 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-white font-bold text-lg mb-2">Sair da mesa?</h3>
            <p className="text-purple-300 text-sm mb-4">
              Você deixará <strong className="text-purple-200">{mesa?.nome}</strong> e ela sairá do seu dashboard.
              O que fazer com as suas fichas desta mesa?
            </p>

            <div className="space-y-2 mb-5">
              <label className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-colors ${
                !deletarFichas ? 'border-purple-600 bg-purple-950/40' : 'border-purple-900 hover:border-purple-700'
              }`}>
                <input type="radio" name="destinoFichas" checked={!deletarFichas} onChange={() => setDeletarFichas(false)} className="mt-0.5 accent-purple-500" />
                <span>
                  <span className="text-white text-sm font-medium block">Deixar na mesa</span>
                  <span className="text-purple-400 text-xs">As fichas ficam para o mestre decidir. Se você voltar, elas ainda são suas.</span>
                </span>
              </label>
              <label className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-colors ${
                deletarFichas ? 'border-red-600 bg-red-950/30' : 'border-purple-900 hover:border-purple-700'
              }`}>
                <input type="radio" name="destinoFichas" checked={deletarFichas} onChange={() => setDeletarFichas(true)} className="mt-0.5 accent-red-500" />
                <span>
                  <span className="text-white text-sm font-medium block">Deletar minhas fichas</span>
                  <span className="text-purple-400 text-xs">Apaga permanentemente as suas fichas desta mesa. Não pode ser desfeito.</span>
                </span>
              </label>
            </div>

            {leaveError && <p className="text-red-400 text-sm mb-3">{leaveError}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => { setShowLeave(false); setLeaveError('') }}
                disabled={leaving}
                className="flex-1 py-2.5 text-purple-300 hover:text-white border border-purple-700 hover:border-purple-500 rounded-xl text-sm transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleLeaveMesa}
                disabled={leaving}
                className={`flex-1 py-2.5 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-colors ${
                  deletarFichas ? 'bg-red-700 hover:bg-red-600' : 'bg-purple-600 hover:bg-purple-700'
                }`}
              >
                {leaving ? 'Saindo...' : 'Sair da mesa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: expulsar membro (16.2) */}
      {membroToExpel && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-800/60 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-white font-bold text-lg mb-2">Expulsar da mesa?</h3>
            <p className="text-purple-300 text-sm mb-1">
              Remover <strong className="text-purple-200">{membroToExpel.usuario.username}</strong> da mesa?
            </p>
            <p className="text-purple-400 text-xs mb-5">
              As fichas dele(a) ficam como <span className="text-amber-300">órfãs</span> — você pode deletá-las ou mantê-las depois. A pessoa recebe uma notificação.
            </p>
            {expelError && <p className="text-red-400 text-sm mb-3">{expelError}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => { setMembroToExpel(null); setExpelError('') }}
                disabled={expelling}
                className="flex-1 py-2.5 text-purple-300 hover:text-white border border-purple-700 hover:border-purple-500 rounded-xl text-sm transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleExpulsar}
                disabled={expelling}
                className="flex-1 py-2.5 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-colors"
              >
                {expelling ? 'Expulsando...' : 'Expulsar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: transferir posse (16.4) */}
      {showTransferir && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-700/60 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-white font-bold text-lg mb-2">Transferir posse da mesa</h3>
            <p className="text-purple-300 text-sm mb-4">
              O novo dono ganha todos os controles de mestre. <strong className="text-amber-300">Você vira co-mestre</strong> e
              só o novo dono poderá te devolver a posse. Ação séria.
            </p>

            <label className="block text-purple-300 text-xs font-medium mb-1">Novo dono</label>
            <select
              value={novoDonoId}
              onChange={e => setNovoDonoId(e.target.value)}
              className="w-full px-3 py-2 mb-4 rounded-lg bg-purple-950 border border-purple-700 text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
            >
              <option value="">Selecionar membro...</option>
              {membros
                .filter(m => m.usuario.id !== session?.user?.id)
                .map(m => (
                  <option key={m.usuario.id} value={m.usuario.id}>
                    {m.usuario.username} — {roleInfo(m.role).label}
                  </option>
                ))}
            </select>

            {transferError && <p className="text-red-400 text-sm mb-3">{transferError}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => { setShowTransferir(false); setTransferError('') }}
                disabled={transferring}
                className="flex-1 py-2.5 text-purple-300 hover:text-white border border-purple-700 hover:border-purple-500 rounded-xl text-sm transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleTransferirPosse}
                disabled={transferring || !novoDonoId}
                className="flex-1 py-2.5 bg-amber-700 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-colors"
              >
                {transferring ? 'Transferindo...' : 'Transferir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPrefs && <PreferenciasModal onFechar={() => setShowPrefs(false)} />}
    </div>
  )
}
