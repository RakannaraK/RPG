import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useMapas } from '../hooks/useMapas'
import MapaVisor from '../components/mapa/MapaVisor'
import PainelCenas from '../components/mapa/PainelCenas'

const BTN_ICONE = 'h-9 min-w-9 px-2 rounded-lg text-sm transition-colors'
const telaCheiaDisponivel = typeof document !== 'undefined' && document.fullscreenEnabled

/**
 * Fase 26 — mesa virtual (mapa) em tela cheia.
 *  26.1 — cenas, pan/zoom, grade, painel do mestre (aqui).
 *  26.2+ — tokens, névoa, desenho/régua/ping, painel da mesa.
 */
export default function MapaPage() {
  const { id: mesaId } = useParams()
  const { session } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const voltarPara = location.state?.voltar || `/mesa/${mesaId}`

  const [isGestor, setIsGestor] = useState(false)
  const [papelCarregado, setPapelCarregado] = useState(false)
  const { mapas, ativo, loading, indisponivel, criar, ativar, atualizar, remover } = useMapas(mesaId)

  const [vistaId, setVistaId] = useState(null)
  const [painelAberto, setPainelAberto] = useState(true)
  const [mostrarGrade, setMostrarGrade] = useState(true)
  const [chaveEnquadrar, setChaveEnquadrar] = useState(0)
  const [rascunho, setRascunho] = useState({ cenaId: null, grade: null })

  // Gestor = criador OU co-mestre (mesmo critério da SessaoPage, F16.5)
  useEffect(() => {
    let cancelado = false
    async function carregar() {
      const { data: mesa } = await supabase.from('mesas').select('criador_id').eq('id', mesaId).maybeSingle()
      let gestor = mesa?.criador_id === session.user.id
      if (!gestor) {
        const { data: membro } = await supabase
          .from('membros_mesa').select('role')
          .eq('mesa_id', mesaId).eq('usuario_id', session.user.id)
          .maybeSingle()
        gestor = membro?.role === 'co-mestre'
      }
      if (!cancelado) {
        setIsGestor(gestor)
        setPapelCarregado(true)
      }
    }
    if (session) carregar()
    return () => { cancelado = true }
  }, [mesaId, session])

  // Gestor escolhe qual cena ver; jogador vê a ativa (o RLS só entrega ela).
  const cena = isGestor ? (mapas.find(m => m.id === vistaId) || ativo || mapas[0] || null) : ativo
  const grade = rascunho.cenaId === cena?.id && rascunho.grade ? rascunho.grade : cena?.grade

  function alternarTelaCheia() {
    if (document.fullscreenElement) document.exitFullscreen()
    else document.documentElement.requestFullscreen()
  }

  let conteudo
  if (loading || !papelCarregado) {
    conteudo = <Aviso>Carregando mapa…</Aviso>
  } else if (indisponivel) {
    conteudo = (
      <Aviso>
        O mapa ainda não está ativado neste banco.
        {isGestor && <span className="block mt-2 text-ink-dim text-sm">Rode o arquivo <code>sql/fase26_mesa_virtual.sql</code> no SQL Editor do Supabase.</span>}
      </Aviso>
    )
  } else if (!cena) {
    conteudo = (
      <Aviso>
        {isGestor ? 'Envie a imagem do primeiro mapa no painel ao lado.' : 'O mestre ainda não mostrou nenhum mapa.'}
      </Aviso>
    )
  } else {
    conteudo = <MapaVisor mapa={cena} grade={grade} mostrarGrade={mostrarGrade} chaveEnquadrar={chaveEnquadrar} />
  }

  return (
    <div className="h-[100dvh] flex flex-col bg-void overflow-hidden">
      <header className="h-12 shrink-0 flex items-center gap-2 px-2 sm:px-3 border-b border-border bg-bg/90 backdrop-blur z-10">
        <button onClick={() => navigate(voltarPara)} className="text-accent-400 hover:text-ink text-sm px-2 shrink-0">
          ← Voltar
        </button>
        <h1 className="text-ink font-semibold truncate min-w-0">{cena?.nome || 'Mapa'}</h1>
        {isGestor && cena && (
          <span className={`hidden sm:inline text-xs shrink-0 ${cena.ativo ? 'text-ok' : 'text-ink-dim'}`}>
            {cena.ativo ? '● jogadores veem' : 'só gestores veem'}
          </span>
        )}
        <div className="ml-auto flex items-center gap-1 shrink-0">
          <button onClick={() => setChaveEnquadrar(k => k + 1)} className={`${BTN_ICONE} text-ink hover:bg-hover`} title="Ajustar à tela">
            ⤢
          </button>
          <button
            onClick={() => setMostrarGrade(v => !v)}
            className={`${BTN_ICONE} hover:bg-hover ${mostrarGrade ? 'text-accent-300' : 'text-ink-dim'}`}
            title={mostrarGrade ? 'Esconder grade (só para você)' : 'Mostrar grade'}
          >
            #
          </button>
          {telaCheiaDisponivel && (
            <button onClick={alternarTelaCheia} className={`${BTN_ICONE} text-ink hover:bg-hover`} title="Tela cheia">
              ⛶
            </button>
          )}
          {isGestor && !indisponivel && (
            <button
              onClick={() => setPainelAberto(v => !v)}
              className={`${BTN_ICONE} hover:bg-hover ${painelAberto ? 'text-accent-300' : 'text-ink'}`}
              title="Cenas"
            >
              🗺 <span className="hidden sm:inline">Cenas</span>
            </button>
          )}
        </div>
      </header>

      <div className="relative flex-1 flex min-h-0">
        <main className="relative flex-1 min-w-0">{conteudo}</main>
        {isGestor && !indisponivel && painelAberto && (
          <aside className="absolute sm:static right-0 inset-y-0 z-10 w-80 max-w-[85vw] shrink-0 overflow-y-auto border-l border-border bg-bg">
            <PainelCenas
              mapas={mapas}
              cena={cena}
              onVer={setVistaId}
              onCriar={async dados => {
                const nova = await criar(dados)
                setVistaId(nova.id)
              }}
              onAtivar={ativar}
              onRemover={remover}
              onAtualizar={atualizar}
              onRascunhoGrade={(cenaId, g) => setRascunho({ cenaId, grade: g })}
            />
          </aside>
        )}
      </div>
    </div>
  )
}

function Aviso({ children }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center p-6">
      <p className="text-ink text-center max-w-sm">{children}</p>
    </div>
  )
}
