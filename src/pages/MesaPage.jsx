import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import SistemaEditor from '../components/sistema/SistemaEditor'
import RecapSessao from '../components/mesa/RecapSessao'
import PainelRelogios from '../components/mesa/PainelRelogios'
import PainelMinigames from '../components/minigames/PainelMinigames'
import PainelDesafios from '../components/minigames/PainelDesafios'
import PainelChat from '../components/mesa/PainelChat'
import PainelNotas from '../components/mesa/PainelNotas'
import PainelCalendario from '../components/mesa/PainelCalendario'
import { useChatMesa } from '../hooks/useChatMesa'
import { agruparPorPasta, podeEditarFicha } from '../lib/permissoesFicha'
import { useFichas } from '../hooks/useFicha'
import FichaCreate from '../components/ficha/FichaCreate'
import ImportarFicha from '../components/ficha/ImportarFicha'
import PainelBestiario from '../components/bestiario/PainelBestiario'
import PainelEscudo from '../components/mesa/PainelEscudo'
import RoladorGenerico from '../components/dados/RoladorGenerico'
import FeedRolagens from '../components/dados/FeedRolagens'
import SessaoBanner from '../components/sessao/SessaoBanner'
import SessoesHistorico from '../components/sessao/SessoesHistorico'
import MeuPerfilMesa from '../components/mesa/MeuPerfilMesa'
import CapaMesa from '../components/mesa/CapaMesa'
import SeletorCapa from '../components/mesa/SeletorCapa'
import AgendaMesa from '../components/mesa/AgendaMesa'
import PainelEnciclopedia from '../components/mesa/PainelEnciclopedia'
import TrilhaMesa from '../components/mesa/TrilhaMesa'
import XCard from '../components/mesa/XCard'
import PainelLimites from '../components/mesa/PainelLimites'
import BaixarMesa from '../components/mesa/BaixarMesa'
import BannerConvidado from '../components/mesa/BannerConvidado'
import BauGrupo from '../components/mesa/BauGrupo'
import AnuncioMesa from '../components/mesa/AnuncioMesa'
import { linkDeConvite } from '../lib/convite'
import Botao from '../components/ui/Botao'
import Modal, { FecharModal } from '../components/ui/Modal'
import SeloPapel, { rotuloPapel } from '../components/ui/SeloPapel'
import { useToast } from '../components/ui/Toast'
import { useConfirmar } from '../components/ui/Confirmar'
import BarraTopo from '../components/ui/BarraTopo'
import Abas from '../components/ui/Abas'
import Avatar from '../components/ui/Avatar'
import Icone from '../components/ui/Icone'
import CabecalhoSecao from '../components/ui/CabecalhoSecao'
import EstadoVazio from '../components/ui/EstadoVazio'
import Esqueleto, { EsqueletoCartoes } from '../components/ui/Esqueleto'
import CartaoFicha from '../components/mesa/CartaoFicha'
import { capaDaMesa } from '../lib/capas'

const TABS = ['Fichas', 'Bestiário', 'Enciclopédia', 'Dados', 'Chat', 'Resumo', 'Sistema', 'Membros']
const TABS_GESTOR = ['Escudo'] // F34.3 — só mestre/co-mestre


export default function MesaPage() {
  const { id } = useParams()
  const { session } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const { perguntar, confirmar } = useConfirmar()

  const [mesa, setMesa] = useState(null)
  const [membros, setMembros] = useState([])
  const [meuRole, setMeuRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('Fichas')
  const [sistemaVisto, setSistemaVisto] = useState(false)
  if (activeTab === 'Sistema' && !sistemaVisto) setSistemaVisto(true)
  // F41 — links de aviso abrem direto numa aba (?aba=Enciclopédia)
  const [params] = useSearchParams()
  const abaDoLink = params.get('aba')
  const [abaVista, setAbaVista] = useState(null)
  if (abaDoLink !== abaVista) { // ajuste no render, não em efeito: um aviso novo na mesma página troca a aba
    setAbaVista(abaDoLink)
    if (TABS.includes(abaDoLink)) setActiveTab(abaDoLink)
  }
  const [copiado, setCopiado] = useState(false)
  const [linkCopiado, setLinkCopiado] = useState(false)
  const [showFichaCreate, setShowFichaCreate] = useState(false)
  const [novasRolagens, setNovasRolagens] = useState(0)
  const chat = useChatMesa(id, session?.user?.id) // F29.2 — na página: não lidas contam com a aba fechada

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

  async function copiar(texto, marcar) {
    try {
      await navigator.clipboard.writeText(texto)
    } catch {
      const el = document.createElement('textarea')
      el.value = texto
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    marcar(true)
    setTimeout(() => marcar(false), 1800)
  }
  const copiarCodigo = () => { copiar(mesa.codigo_convite, setCopiado); toast.ok('Código copiado') }
  // F47 — o link entra direto, com conta ou como convidado
  const copiarLink = () => { copiar(linkDeConvite(window.location.origin, mesa.codigo_convite), setLinkCopiado); toast.ok('Link de convite copiado') }

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
    const ok = await confirmar({
      titulo: 'Gerar novo código?', confirmar: 'Gerar novo código',
      mensagem: 'O código e o link antigos deixam de funcionar na hora. Quem já é membro continua na mesa.',
    })
    if (!ok) return
    setRegenerating(true)
    setRegenError('')
    try {
      const { data: novo, error: err } = await supabase.rpc('regenerar_convite', { p_mesa_id: id })
      if (err) throw err
      setMesa(prev => ({ ...prev, codigo_convite: novo }))
      toast.ok('Novo código gerado')
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
      <div className="min-h-screen">
        <BarraTopo voltar={{ para: '/dashboard', rotulo: 'Suas mesas' }} />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6" role="status" aria-label="Carregando a mesa">
          <div className="rounded-3xl border border-border bg-raised/50 p-5 sm:p-8 pt-24 sm:pt-28">
            <Esqueleto className="h-5 w-24 mb-4" />
            <Esqueleto className="h-9 w-2/3 sm:w-1/2 mb-3" />
            <Esqueleto className="h-4 w-1/2 sm:w-1/3" />
          </div>
          <Esqueleto className="h-12 w-full mt-8" />
          <EsqueletoCartoes quantos={2} className="grid gap-4 md:grid-cols-2 mt-8" altura="h-32" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen">
        <BarraTopo voltar={{ para: '/dashboard', rotulo: 'Suas mesas' }} />
        <div className="max-w-xl mx-auto px-4 py-16">
          <EstadoVazio arte="porta" titulo="Não foi possível abrir esta mesa" descricao={error}>
            <Botao variante="primario" onClick={() => navigate('/dashboard')}>Voltar para suas mesas</Botao>
          </EstadoVazio>
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

  // F30.2 — pasta nasce ao mover a primeira ficha para ela (sem tabela de pastas)
  async function moverParaPasta(f) {
    const nome = await perguntar({
      titulo: 'Mover para pasta', mensagem: `Em qual pasta fica "${f.nome_personagem}"? Deixe vazio para tirar da pasta.`,
      rotulo: 'Pasta', valor: f.pasta || '', placeholder: 'Ex.: Heróis, Vilões, Aliados', maxLength: 60, confirmar: 'Mover',
    })
    if (nome === null) return
    const { error: err } = await supabase
      .from('fichas').update({ pasta: nome.trim().slice(0, 60) || null }).eq('id', f.id)
    if (err) toast.erro('Não foi possível mover', { detalhe: err.message })
    else { refetchFichas(); toast.ok(nome.trim() ? `Movida para "${nome.trim()}"` : 'Tirada da pasta') }
  }

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

  const abas = [...TABS, ...(isGestor ? TABS_GESTOR : [])].map(tab => ({
    id: tab,
    rotulo: tab,
    contador: tab === 'Dados' ? novasRolagens : tab === 'Chat' ? chat.naoLidas : 0,
    selo: tab === 'Escudo' ? <Icone nome="cadeado" tamanho={14} className="text-ink-dim" /> : null,
  }))
  const nomeDoMembro = m => m.apelido || m.usuario?.username || '?'

  return (
    <div className="min-h-screen">
      <BarraTopo
        voltar={{ para: '/dashboard', rotulo: 'Suas mesas' }}
        acoes={
          <>
            {!arquivada && <XCard mesaId={id} isGestor={isGestor} />}
            <Link to={`/mesa/${id}/mapa`} aria-label="Mapa da mesa" data-dica="Mapa da mesa" className="botao-icone lg:px-3 lg:gap-2">
              <Icone nome="mapa" tamanho={20} /><span className="hidden lg:inline text-sm">Mapa</span>
            </Link>
            {!isCriador && (
              <button
                onClick={() => { setLeaveError(''); setDeletarFichas(false); setShowLeave(true) }}
                aria-label="Sair da mesa" data-dica="Sair da mesa" className="botao-icone hover:!text-harm"
              ><Icone nome="porta" tamanho={20} /></button>
            )}
          </>
        }
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* ── Herói da campanha: qual mesa, meu papel, quem joga e a sessão ── */}
        <section className="relative mt-5 sm:mt-6 overflow-hidden rounded-3xl border border-border bg-raised/50 shadow-nivel-2" aria-label="A mesa">
          <div className="absolute inset-x-0 top-0" aria-hidden="true">
            <CapaMesa capa={capaDaMesa(mesa)} altura={150} />
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-bg/40 to-bg/80" aria-hidden="true" />
          <div className="relative p-5 sm:p-8 grid gap-6 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:items-end">
            <div className="min-w-0 pt-14 sm:pt-20">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <SeloPapel papel={meuRole} />
                {arquivada && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border border-amber-700/60 text-amber-200 bg-amber-950/50">
                    <Icone nome="cadeado" tamanho={12} /> Arquivada
                  </span>
                )}
              </div>
              <h1 className="font-sora text-3xl sm:text-4xl font-bold text-ink tracking-tight break-words">{mesa?.nome}</h1>
              {mesa?.descricao && <p className="text-ink-dim mt-2 max-w-2xl">{mesa.descricao}</p>}
              <button
                onClick={() => setActiveTab('Membros')}
                className="mt-5 inline-flex items-center gap-3 rounded-full pr-3 hover:bg-hover/60 transition-colors duration-rapida"
                aria-label={`${membros.length} pessoas na mesa — ver membros`}
              >
                <span className="flex -space-x-2">
                  {membros.slice(0, 5).map(m => (
                    <Avatar key={m.usuario.id} url={m.avatar_url} nome={nomeDoMembro(m)} tamanho="sm" className="ring-2 ring-bg" />
                  ))}
                </span>
                <span className="text-sm text-ink-dim">
                  {membros.length} {membros.length === 1 ? 'pessoa' : 'pessoas'}{membros.length > 5 ? ` (+${membros.length - 5})` : ''}
                </span>
              </button>
            </div>
            {/* Fase 13.1 — a sessão é a ação principal (não em mesa arquivada) */}
            {!arquivada && <SessaoBanner mesaId={id} isGestor={isGestor} />}
          </div>
        </section>

        {/* Arquivada (16.8) — somente leitura */}
        {arquivada && (
          <div className="mt-4 rounded-2xl border border-amber-800/50 bg-amber-950/30 px-5 py-4 flex items-center justify-between gap-3 flex-wrap">
            <p className="text-amber-200 text-sm">Esta mesa está arquivada: dá para ler tudo, mas nada muda.</p>
            {isCriador && <Botao variante="dado" tamanho="sm" onClick={() => handleArquivar(false)}>Desarquivar</Botao>}
          </div>
        )}

        {/* F47 — convidado: lembrete de criar conta */}
        <BannerConvidado className="mt-4" />
        {/* F40 — próxima sessão no mundo real, com confirmação de presença */}
        {!arquivada && <AgendaMesa mesaId={id} isGestor={isGestor} className="mt-4" />}
        {/* F43 — trilha sonora e efeitos (canto da tela) */}
        {!arquivada && <TrilhaMesa mesaId={id} isGestor={isGestor} />}

      </div>

      {/* ── Abas: o traço desliza; no celular a faixa rola e esmaece nas pontas.
          Gruda embaixo do cabeçalho, de ponta a ponta da tela. ── */}
      <div className="sticky top-16 z-[15] mt-8 bg-bg/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <Abas
            rotulo="Seções da mesa" abas={abas} atual={activeTab} idPainel="painel-da-mesa"
            onTrocar={tab => { setActiveTab(tab); if (tab === 'Dados') setNovasRolagens(0) }}
          />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6">

        {activeTab !== 'Sistema' && (
        <div key={activeTab} id="painel-da-mesa" role="tabpanel" aria-label={activeTab} className="entra-aba py-8">
          {activeTab === 'Fichas' && (
            <div className="space-y-6">
              <CabecalhoSecao
                titulo="Personagens"
                descricao={loadingFichas ? 'Carregando…' : fichas.length > 0 ? `${fichas.length} ficha${fichas.length > 1 ? 's' : ''} nesta mesa` : 'Nenhuma ficha ainda'}
                acoes={podeEscrever && (
                  <>
                    <ImportarFicha
                      mesaId={id} donoId={session?.user?.id}
                      className="botao inline-flex items-center gap-1.5 px-3 py-2 min-h-[36px] rounded-lg border border-border text-ink text-sm hover:border-accent-500"
                      onImportada={novoId => { refetchFichas(); navigate(`/mesa/${id}/ficha/${novoId}`) }}
                    />
                    <Botao variante="primario" onClick={() => setShowFichaCreate(true)}>
                      <Icone nome="mais" tamanho={18} /> Nova ficha
                    </Botao>
                  </>
                )}
              />

              {loadingFichas ? (
                <EsqueletoCartoes quantos={2} className="grid gap-4 md:grid-cols-2" altura="h-32" />
              ) : fichas.length === 0 ? (
                <EstadoVazio
                  arte="pergaminho" titulo="Nenhuma ficha criada"
                  descricao={podeEscrever
                    ? 'Crie o seu primeiro personagem para começar a aventura.'
                    : arquivada ? 'Mesa arquivada: somente leitura.' : 'Como espectador, você acompanha as fichas dos outros.'}
                >
                  {podeEscrever && (
                    <Botao variante="primario" onClick={() => setShowFichaCreate(true)}><Icone nome="mais" tamanho={18} /> Criar ficha</Botao>
                  )}
                </EstadoVazio>
              ) : (
                <div className="space-y-6">
                  {agruparPorPasta(fichas).map(({ pasta, fichas: daPasta }, _i, grupos) => {
                    const cartoes = (
                      <div className="entra-lista grid gap-4 md:grid-cols-2">
                        {daPasta.map((f, i) => {
                          const ehDono = f.dono?.id === session?.user?.id
                          // Órfã: dono não é mais membro da mesa (saiu/expulso) — Fase 16.2
                          const orfa = !f.dono?.id || !membroIds.has(f.dono.id)
                          return (
                            <div key={f.id} style={{ '--i': i }}>
                              <CartaoFicha
                                ficha={f} mesaId={id} orfa={orfa}
                                donoNome={f.dono?.username}
                                voceEdita={!ehDono && podeEditarFicha(f, session?.user?.id)}
                                podePasta={(isGestor || podeEditarFicha(f, session?.user?.id)) && !arquivada}
                                podeExcluir={ehDono || (orfa && isGestor)}
                                onPasta={() => moverParaPasta(f)}
                                onExcluir={() => { setDeleteFichaError(''); setFichaToDelete(f) }}
                              />
                            </div>
                          )
                        })}
                      </div>
                    )
                    // Sem nenhuma pasta na mesa: lista simples, como sempre foi
                    if (grupos.length === 1 && pasta === null) return <div key="sem-pasta">{cartoes}</div>
                    return (
                      <details key={pasta ?? ''} open className="group/pasta">
                        <summary className="cursor-pointer list-none inline-flex items-center gap-2 text-ink font-medium mb-3 select-none rounded-lg hover:text-accent-300 transition-colors duration-rapida">
                          <Icone nome="chevron-dir" tamanho={16} className="transition-transform duration-normal group-open/pasta:rotate-90 text-ink-dim" />
                          <Icone nome="pasta" tamanho={18} className="text-dice-400" />
                          {pasta ?? 'Sem pasta'} <span className="text-ink-dim font-normal text-sm">({daPasta.length})</span>
                        </summary>
                        {cartoes}
                      </details>
                    )
                  })}
                </div>
              )}

              {showFichaCreate && (
                <FichaCreate
                  mesaId={id}
                  onCriada={ficha => {
                    setShowFichaCreate(false)
                    toast.ok('Ficha criada', { detalhe: ficha.nome_personagem })
                    refetchFichas()
                    navigate(`/mesa/${id}/ficha/${ficha.id}`)
                  }}
                  onFechar={() => setShowFichaCreate(false)}
                />
              )}
              {/* F49 — baú do grupo */}
              <BauGrupo mesaId={id} meuId={session?.user?.id} isGestor={isGestor} podeEscrever={podeEscrever} fichas={fichas} />
            </div>
          )}

          {activeTab === 'Bestiário' && (
            <PainelBestiario
              mesaId={id} meuId={session?.user?.id} isGestor={isGestor}
              podeEscrever={podeEscrever}
              onAbrir={fichaId => navigate(`/mesa/${id}/ficha/${fichaId}`)}
            />
          )}

          {activeTab === 'Enciclopédia' && (
            <PainelEnciclopedia mesaId={id} meuId={session?.user?.id} isGestor={isGestor} />
          )}

          {activeTab === 'Dados' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              <div className="space-y-10">
                {podeEscrever && (
                  <section className="space-y-4">
                    <CabecalhoSecao titulo="Rolar dados" descricao="O resultado aparece para a mesa toda, no histórico ao lado." />
                    <RoladorGenerico mesaId={id} />
                  </section>
                )}
                {/* F28 — minigames: resultado vai ao feed ao lado */}
                <section className="space-y-4">
                  <CabecalhoSecao titulo="Minigames" nivel={3} />
                  <PainelMinigames mesaId={id} meuId={session?.user?.id} podeJogar={podeEscrever} />
                </section>
                {/* F28.5 — desafios: o mestre põe vários jogadores na mesma partida */}
                <section className="space-y-4">
                  <CabecalhoSecao titulo="Desafios" nivel={3} />
                  <PainelDesafios mesaId={id} meuId={session?.user?.id} isGestor={isGestor} podeJogar={podeEscrever} />
                </section>
              </div>
              <section className="space-y-4 lg:sticky lg:top-32">
                <CabecalhoSecao titulo="Histórico" descricao="Rolagens da mesa, das mais novas para as mais antigas." />
                <FeedRolagens mesaId={id} onNovaRolagem={() => setNovasRolagens(n => n + 1)} />
              </section>
            </div>
          )}

          {activeTab === 'Chat' && (
            <div className="max-w-3xl">
              <PainelChat chat={chat} mesaId={id} meuId={session?.user?.id} isGestor={isGestor} podeFalar={!arquivada} podeRolar={podeEscrever} className="h-[65vh]" />
            </div>
          )}

          {activeTab === 'Resumo' && (
            <div className="space-y-8">
              {/* F29.4 — calendário do mundo */}
              <PainelCalendario mesaId={id} isGestor={isGestor && !arquivada} />
              <PainelRelogios mesaId={id} isGestor={isGestor} />
              {/* F29.3 — notas privadas ou compartilhadas */}
              <section className="space-y-3">
                <CabecalhoSecao titulo="Notas" descricao="Só suas, ou compartilhadas com a mesa." nivel={3} />
                <PainelNotas mesaId={id} meuId={session?.user?.id} />
              </section>
              <RecapSessao mesaId={id} />
              {/* Fase 13.5 — histórico de sessões encerradas */}
              <SessoesHistorico mesaId={id} />
            </div>
          )}

          {activeTab === 'Escudo' && isGestor && (
            <PainelEscudo mesaId={id} isGestor={isGestor} />
          )}

          {activeTab === 'Membros' && (
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] items-start">
              <div className="space-y-6">
                <section className="rounded-2xl border border-border bg-raised/70 overflow-hidden" aria-label="Membros">
                  <div className="px-5 py-4 border-b border-border/70">
                    <CabecalhoSecao titulo={`Membros (${membros.length})`} nivel={3} descricao="Quem está nesta mesa e com qual papel." />
                  </div>
                  <ul className="divide-y divide-border/60">
                    {membros.map(m => (
                      <li key={m.usuario.id} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-hover/40 transition-colors duration-rapida">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar url={m.avatar_url} nome={nomeDoMembro(m)} tamanho="md" />
                          <div className="min-w-0">
                            <p className="text-ink text-sm font-medium truncate">
                              {nomeDoMembro(m)}
                              {m.usuario.id === session?.user?.id && <span className="text-ink-dim font-normal"> (você)</span>}
                            </p>
                            {m.apelido && <p className="text-ink-dim text-xs truncate">{m.usuario.username}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Dono altera papel (16.5) de todos exceto ele mesmo e o próprio 'mestre' */}
                          {isCriador && m.usuario.id !== session?.user?.id && m.role !== 'mestre' ? (
                            <select
                              value={m.role}
                              onChange={e => handleDefinirRole(m.usuario.id, e.target.value)}
                              className="campo !min-h-[34px] !py-1 !px-2 !text-sm"
                              aria-label={`Papel de ${nomeDoMembro(m)}`}
                            >
                              <option value="co-mestre">Co-mestre</option>
                              <option value="jogador">Jogador</option>
                              <option value="espectador">Espectador</option>
                            </select>
                          ) : (
                            <SeloPapel papel={m.role} />
                          )}
                          {podeExpulsar(m) && (
                            <button
                              onClick={() => { setExpelError(''); setMembroToExpel(m) }}
                              aria-label={`Expulsar ${nomeDoMembro(m)}`} data-dica="Expulsar da mesa"
                              className="botao-icone hover:!text-harm"
                            ><Icone nome="x" tamanho={18} /></button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>

                {isGestor && (
                  <section className="rounded-2xl border border-border bg-raised/70 p-5 space-y-4" aria-label="Convite">
                    <CabecalhoSecao titulo="Convidar jogadores" nivel={3} descricao="Mande o link: quem abrir entra direto na mesa, com conta ou como convidado." />
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="flex-1 min-w-[12rem] text-center font-mono text-xl tracking-[0.25em] text-ink bg-void border border-border rounded-xl py-3 px-4 uppercase select-all">
                        {mesa?.codigo_convite}
                      </code>
                      <Botao variante={copiado ? 'secundario' : 'primario'} tamanho="lg" onClick={copiarCodigo} aria-live="polite">
                        <Icone nome={copiado ? 'check' : 'copiar'} tamanho={18} /> {copiado ? 'Copiado' : 'Copiar código'}
                      </Botao>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Botao variante="contorno" onClick={copiarLink}>
                        <Icone nome={linkCopiado ? 'check' : 'link'} tamanho={16} /> {linkCopiado ? 'Link copiado' : 'Copiar link de convite'}
                      </Botao>
                      <Botao variante="fantasma" onClick={handleRegenerarConvite} disabled={regenerating}>
                        {regenerating ? 'Gerando…' : 'Gerar novo código'}
                      </Botao>
                    </div>
                    {regenError && <p className="aviso-erro" role="alert">{regenError}</p>}
                  </section>
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
              </div>

              <div className="space-y-6">
                {/* F44 — combinados, linhas e véus (anônimos) */}
                <PainelLimites mesaId={id} isGestor={isGestor} />
                {/* F51 — anunciar na Comunidade e responder pedidos de vaga */}
                {isGestor && !arquivada && <AnuncioMesa mesaId={id} />}
                {/* F45 — qualquer membro leva a sua cópia (o RLS decide o que vai) */}
                <BaixarMesa mesaId={id} nome={mesa?.nome} />

                {isCriador && (
                  <section className="rounded-2xl border border-border bg-raised/50 p-5 space-y-5" aria-label="Administração da mesa">
                    <CabecalhoSecao titulo="Administração" nivel={3} descricao="Só o dono da mesa vê esta parte." />
                    {/* Capa da mesa (37.4) */}
                    <SeletorCapa mesaId={id} capaAtual={mesa?.capa || null} onTrocou={capa => setMesa(prev => ({ ...prev, capa }))} />

                    {/* Transferir posse (16.4) */}
                    {membros.length > 1 && (
                      <div className="pt-5 border-t border-border/60">
                        <p className="text-ink text-sm font-medium">Transferir posse</p>
                        <p className="text-ink-dim text-sm mt-0.5 mb-3">Passe a mesa para outro membro. Você deixa de ser o dono e vira co-mestre.</p>
                        <Botao variante="contorno" onClick={() => { setTransferError(''); setNovoDonoId(''); setShowTransferir(true) }}>
                          Transferir posse da mesa
                        </Botao>
                      </div>
                    )}

                    {/* Arquivar mesa (16.8) */}
                    <div className="pt-5 border-t border-border/60">
                      <p className="text-ink text-sm font-medium">{arquivada ? 'Mesa arquivada' : 'Arquivar mesa'}</p>
                      <p className="text-ink-dim text-sm mt-0.5 mb-3">
                        {arquivada
                          ? 'A mesa está em somente leitura. Desarquive para voltar a jogar.'
                          : 'Guarda a mesa em somente leitura (sem novas sessões, fichas ou rolagens). Pode ser desarquivada depois.'}
                      </p>
                      <Botao variante="secundario" onClick={() => handleArquivar(!arquivada)}>
                        {arquivada ? 'Desarquivar mesa' : 'Arquivar mesa'}
                      </Botao>
                    </div>

                    {/* Apagar mesa — zona de perigo, separada */}
                    <div className="pt-5 border-t border-red-900/50">
                      <p className="text-red-300 text-sm font-medium">Apagar mesa</p>
                      <p className="text-ink-dim text-sm mt-0.5 mb-3">
                        Apaga a mesa, as fichas, o sistema e o histórico. Não tem como desfazer; para só parar de jogar, arquive.
                      </p>
                      <Botao variante="perigo" onClick={() => setShowDeleteMesa(true)}>Apagar esta mesa</Botao>
                    </div>
                  </section>
                )}
              </div>
            </div>
          )}
        </div>
        )}

        {/* F52 — o editor de sistema continua montado depois da 1ª visita:
            trocar de aba não joga fora o que ainda não foi salvo */}
        {sistemaVisto && (
          <div
            hidden={activeTab !== 'Sistema'} id={activeTab === 'Sistema' ? 'painel-da-mesa' : undefined}
            role="tabpanel" aria-label="Sistema" className="entra-aba py-8"
          >
            <SistemaEditor mesaId={id} isMestre={isGestor} />
          </div>
        )}
      </div>

      {/* Modal: deletar mesa */}
      {showDeleteMesa && (
        <Modal
          onFechar={() => { setShowDeleteMesa(false); setDeleteMesaError('') }} bloqueado={deletingMesa}
          tamanho="sm" tom="perigo" titulo="Apagar a mesa?"
          rodape={
            <>
              <FecharModal disabled={deletingMesa} />
              <Botao variante="perigo" onClick={handleDeleteMesa} disabled={deletingMesa}>{deletingMesa ? 'Apagando…' : 'Apagar mesa'}</Botao>
            </>
          }
        >
          <p className="text-ink text-sm"><strong>{mesa?.nome}</strong> será apagada com todas as fichas, o sistema, as imagens e o histórico de sessões.</p>
          <p className="text-ink-dim text-sm mt-2">Esta ação não pode ser desfeita. Se a ideia é só parar de jogar, arquive a mesa.</p>
          {deleteMesaError && <p className="aviso-erro mt-3" role="alert">{deleteMesaError}</p>}
        </Modal>
      )}

      {/* Modal: deletar ficha */}
      {fichaToDelete && (
        <Modal
          onFechar={() => { setFichaToDelete(null); setDeleteFichaError('') }} bloqueado={deletingFicha}
          tamanho="sm" tom="perigo" titulo="Apagar ficha?"
          rodape={
            <>
              <FecharModal disabled={deletingFicha} />
              <Botao
                variante="perigo" disabled={deletingFicha}
                onClick={() => (
                  fichaToDelete.dono?.id === session?.user?.id
                    ? handleDeleteFicha()          // própria → delete direto (RLS dono)
                    : handleDeletarFichaOrfa(fichaToDelete) // órfã → RPC (gestor)
                )}
              >{deletingFicha ? 'Apagando…' : 'Apagar ficha'}</Botao>
            </>
          }
        >
          <p className="text-ink text-sm">
            <strong>{fichaToDelete.nome_personagem}</strong> será apagada com todos os atributos, equipamentos e imagens.
          </p>
          <p className="text-ink-dim text-sm mt-2">Esta ação não pode ser desfeita.</p>
          {deleteFichaError && <p className="aviso-erro mt-3" role="alert">{deleteFichaError}</p>}
        </Modal>
      )}

      {/* Modal: sair da mesa (16.1) */}
      {showLeave && (
        <Modal
          onFechar={() => { setShowLeave(false); setLeaveError('') }} bloqueado={leaving}
          tamanho="sm" titulo="Sair da mesa?"
          subtitulo={`Você deixa ${mesa?.nome || 'a mesa'} e ela sai da sua lista.`}
          rodape={
            <>
              <FecharModal disabled={leaving} />
              <Botao variante={deletarFichas ? 'perigo' : 'primario'} onClick={handleLeaveMesa} disabled={leaving}>
                {leaving ? 'Saindo…' : 'Sair da mesa'}
              </Botao>
            </>
          }
        >
          <fieldset className="space-y-2">
            <legend className="text-ink text-sm mb-2">O que fazer com as suas fichas desta mesa?</legend>
            <label className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-colors duration-rapida ${
              !deletarFichas ? 'selecionado' : 'border-border hover:border-accent-700'
            }`}>
              <input type="radio" name="destinoFichas" checked={!deletarFichas} onChange={() => setDeletarFichas(false)} className="mt-0.5 accent-purple-500" />
              <span>
                <span className="text-ink text-sm font-medium block">Deixar na mesa</span>
                <span className="text-ink-dim text-sm">As fichas ficam para o mestre decidir. Se você voltar, elas ainda são suas.</span>
              </span>
            </label>
            <label className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-colors duration-rapida ${
              deletarFichas ? 'border-red-600 bg-red-950/30' : 'border-border hover:border-accent-700'
            }`}>
              <input type="radio" name="destinoFichas" checked={deletarFichas} onChange={() => setDeletarFichas(true)} className="mt-0.5 accent-red-500" />
              <span>
                <span className="text-ink text-sm font-medium block">Apagar minhas fichas</span>
                <span className="text-ink-dim text-sm">Apaga para sempre as suas fichas desta mesa.</span>
              </span>
            </label>
          </fieldset>
          {leaveError && <p className="aviso-erro mt-3" role="alert">{leaveError}</p>}
        </Modal>
      )}

      {/* Modal: expulsar membro (16.2) */}
      {membroToExpel && (
        <Modal
          onFechar={() => { setMembroToExpel(null); setExpelError('') }} bloqueado={expelling}
          tamanho="sm" tom="perigo" titulo="Expulsar da mesa?"
          rodape={
            <>
              <FecharModal disabled={expelling} />
              <Botao variante="perigo" onClick={handleExpulsar} disabled={expelling}>{expelling ? 'Expulsando…' : 'Expulsar'}</Botao>
            </>
          }
        >
          <p className="text-ink text-sm">Remover <strong>{membroToExpel.apelido || membroToExpel.usuario.username}</strong> da mesa?</p>
          <p className="text-ink-dim text-sm mt-2">
            As fichas dessa pessoa ficam como <span className="text-amber-300">órfãs</span>: você pode apagá-las ou mantê-las depois. Ela recebe uma notificação.
          </p>
          {expelError && <p className="aviso-erro mt-3" role="alert">{expelError}</p>}
        </Modal>
      )}

      {/* Modal: transferir posse (16.4) */}
      {showTransferir && (
        <Modal
          onFechar={() => { setShowTransferir(false); setTransferError('') }} bloqueado={transferring}
          tamanho="sm" tom="aviso" titulo="Transferir posse da mesa"
          rodape={
            <>
              <FecharModal disabled={transferring} />
              <Botao variante="dado" onClick={handleTransferirPosse} disabled={transferring || !novoDonoId}>{transferring ? 'Transferindo…' : 'Transferir'}</Botao>
            </>
          }
        >
          <p className="text-ink text-sm">
            O novo dono ganha todos os controles de mestre. <strong className="text-amber-300">Você vira co-mestre</strong> e
            só o novo dono pode te devolver a posse.
          </p>
          <label className="block mt-4">
            <span className="rotulo">Novo dono</span>
            <select value={novoDonoId} onChange={e => setNovoDonoId(e.target.value)} className="campo w-full">
              <option value="">Escolher membro…</option>
              {membros
                .filter(m => m.usuario.id !== session?.user?.id)
                .map(m => (
                  <option key={m.usuario.id} value={m.usuario.id}>
                    {m.apelido || m.usuario.username} — {rotuloPapel(m.role)}
                  </option>
                ))}
            </select>
          </label>
          {transferError && <p className="aviso-erro mt-3" role="alert">{transferError}</p>}
        </Modal>
      )}

    </div>
  )
}
