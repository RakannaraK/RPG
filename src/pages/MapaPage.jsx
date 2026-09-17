import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useMapas } from '../hooks/useMapas'
import { useTokensMapa } from '../hooks/useTokensMapa'
import { useCardsDaMesa } from '../hooks/useSessaoFichas'
import { useSessoes } from '../hooks/useSessoes'
import { useEncontro } from '../hooks/useEncontro'
import { ordenarPorIniciativa } from '../lib/iniciativa'
import { adicionarOpNevoa, espalhar, normalizarGrade, normalizarNevoa, pontoRevelado } from '../lib/mapaEngine'
import MapaVisor from '../components/mapa/MapaVisor'
import PainelCenas from '../components/mapa/PainelCenas'
import PainelTokens from '../components/mapa/PainelTokens'
import CamadaTokens, { MenuToken } from '../components/mapa/CamadaTokens'
import { BarraNevoa, CamadaNevoa, EditorNevoa } from '../components/mapa/Nevoa'
import {
  BarraDesenho, BarraFerramentas, CamadaDesenhos, CamadaPings, CamadaReguas, EditorDesenho, EditorPing, EditorRegua,
} from '../components/mapa/Desenhos'
import { useDesenhosMapa } from '../hooks/useDesenhosMapa'

const BTN_ICONE = 'h-9 min-w-9 px-2 rounded-lg text-sm transition-colors'
const telaCheiaDisponivel = typeof document !== 'undefined' && document.fullscreenEnabled

/** Vida exibida no token: ficha (motor da sessão, ou caixinhas livres da trilha) ou combatente. */
function vidaDoToken(card, combatente, isGestor) {
  if (card?.trilhaVida) {
    const m = card.trilhaVida.marcas || []
    return m.length ? { atual: m.filter(x => x == null).length, max: m.length, temp: 0 } : null
  }
  const max = card ? card.hpMax || card.hpMaxBase || 0 : 0
  if (card && max > 0) return { atual: card.hpAtual ?? 0, max, temp: card.vidaTemp || 0 }
  // Vida de inimigo/NPC só para o mestre
  if (combatente && !combatente.ficha_id && isGestor && combatente.hp_maximo > 0) {
    return { atual: combatente.hp_atual ?? 0, max: combatente.hp_maximo, temp: 0 }
  }
  return null
}

/**
 * Fase 26 — mesa virtual (mapa) em tela cheia.
 *  26.1 — cenas, pan/zoom, grade, painel do mestre.
 *  26.2 — tokens (fichas, combatentes, avulsos), arraste ao vivo, vida, turno.
 *  26.3+ — névoa, desenho/régua/ping, painel da mesa.
 */
export default function MapaPage() {
  const { id: mesaId } = useParams()
  const { session } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const voltarPara = location.state?.voltar || `/mesa/${mesaId}`
  const meuId = session?.user?.id

  const [isGestor, setIsGestor] = useState(false)
  const [papelCarregado, setPapelCarregado] = useState(false)
  const { mapas, ativo, loading, indisponivel, criar, ativar, atualizar, remover } = useMapas(mesaId)

  const [vistaId, setVistaId] = useState(null)
  const [painel, setPainel] = useState('cenas') // 'cenas' | 'tokens' | null
  const [mostrarGrade, setMostrarGrade] = useState(true)
  const [chaveEnquadrar, setChaveEnquadrar] = useState(0)
  const [rascunho, setRascunho] = useState({ cenaId: null, grade: null })
  const [selecionadoId, setSelecionadoId] = useState(null)
  const visorApi = useRef(null)
  const [papel, setPapel] = useState(null) // role em membros_mesa (espectador não desenha)
  const [ferramenta, setFerramenta] = useState('mover') // 'mover' | 'desenho' | 'regua' | 'ping' | 'nevoa'
  // 26.4 — desenho
  const [configDesenho, setConfigDesenho] = useState({ forma: 'livre', cor: '#FBBF24', espessura: 4 })
  const [rascunhoDesenho, setRascunhoDesenho] = useState(null)
  // 26.3 — névoa: cópia local otimista enquanto grava
  const [configNevoa, setConfigNevoa] = useState({ modo: 'revelar', forma: 'ret', raio: null })
  const [rascunhoNevoa, setRascunhoNevoa] = useState(null)
  const [nevoaLocal, setNevoaLocal] = useState(null) // { cenaId, nevoa }
  const seqNevoa = useRef(0)
  const [aviso, setAviso] = useState('')

  // Gestor = criador OU co-mestre (mesmo critério da SessaoPage, F16.5)
  useEffect(() => {
    let cancelado = false
    async function carregar() {
      const { data: mesa } = await supabase.from('mesas').select('criador_id').eq('id', mesaId).maybeSingle()
      const { data: membro } = await supabase
        .from('membros_mesa').select('role')
        .eq('mesa_id', mesaId).eq('usuario_id', session.user.id)
        .maybeSingle()
      const gestor = mesa?.criador_id === session.user.id || membro?.role === 'co-mestre'
      if (!cancelado) {
        setIsGestor(gestor)
        setPapel(membro?.role || null)
        setPapelCarregado(true)
      }
    }
    if (session) carregar()
    return () => { cancelado = true }
  }, [mesaId, session])

  // Gestor escolhe qual cena ver; jogador vê a ativa (o RLS só entrega ela).
  const cena = isGestor ? (mapas.find(m => m.id === vistaId) || ativo || mapas[0] || null) : ativo
  const grade = rascunho.cenaId === cena?.id && rascunho.grade ? rascunho.grade : cena?.grade

  // Fichas (vida pelo motor) e combate ativo (turno, combatentes)
  const { cards } = useCardsDaMesa(mesaId)
  const { sessaoAtiva } = useSessoes(mesaId)
  const { encontro, combatentes } = useEncontro(sessaoAtiva?.id, mesaId)
  const tokensApi = useTokensMapa(cena?.id, mesaId)
  const desenhosApi = useDesenhosMapa(cena?.id)

  // Mesmas regras do RLS (26.4): gestor sempre; jogador se liberado e não espectador.
  const podeDesenhar = isGestor || (!!cena?.jogadores_desenham && papel !== 'espectador')
  // Ferramentas de gestor/desenho caem para "mover" quando a permissão some.
  const ferramentaAtiva = (ferramenta === 'desenho' && !podeDesenhar) || (ferramenta === 'nevoa' && !isGestor) ? 'mover' : ferramenta

  function escolherFerramenta(f) {
    setFerramenta(f)
    setSelecionadoId(null)
  }

  // Atalhos: V mover · D desenhar · R régua · P ping · N névoa · Esc volta a mover.
  // Sem permissão, `ferramentaAtiva` já cai para "mover".
  useEffect(() => {
    const atalhos = { v: 'mover', d: 'desenho', r: 'regua', p: 'ping', n: 'nevoa', escape: 'mover' }
    const aoTeclar = e => {
      if (e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return
      const f = atalhos[e.key.toLowerCase()]
      if (!f) return
      setFerramenta(f)
      setSelecionadoId(null)
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [])

  async function tentar(fn) {
    try { await fn() } catch (err) { setAviso(err.message || 'Algo deu errado.') }
  }

  const combatentesAtivos = encontro ? combatentes : []
  const daVez = encontro ? ordenarPorIniciativa(combatentes)[encontro.turno_atual ?? 0] : null

  const tokensVisuais = tokensApi.tokens.map(tk => {
    const card = tk.ficha_id ? cards.find(c => c.id === tk.ficha_id) : null
    const comb = tk.combatente_id ? combatentesAtivos.find(c => c.id === tk.combatente_id) : null
    const remoto = tokensApi.remotos[tk.id]
    return {
      ...tk,
      x: remoto?.x ?? tk.x,
      y: remoto?.y ?? tk.y,
      nome: card?.nome || tk.nome,
      imagem: card?.imagem || tk.imagem_url,
      vida: vidaDoToken(card, comb, isGestor),
      daVez: !!daVez && ((!!tk.ficha_id && tk.ficha_id === daVez.ficha_id) || tk.combatente_id === daVez.id),
      podeMover: isGestor || (!!card && card.ficha?.dono_id === meuId),
    }
  })
  const nevoa = normalizarNevoa(nevoaLocal?.cenaId === cena?.id ? nevoaLocal.nevoa : cena?.nevoa)
  // Jogador não recebe tokens sob a névoa (a máscara só pinta; nome/barra vazariam).
  // O próprio token segue visível para o dono.
  const tokensNaTela = isGestor ? tokensVisuais : tokensVisuais.filter(t => t.podeMover || pontoRevelado(nevoa, t))
  const selecionado = tokensNaTela.find(t => t.id === selecionadoId) || null
  const tamanhoGrade = Number(normalizarGrade(grade).tamanho) > 0 ? Number(normalizarGrade(grade).tamanho) : 70

  async function salvarNevoa(nova) {
    const seq = ++seqNevoa.current
    const cenaId = cena.id
    setNevoaLocal({ cenaId, nevoa: nova })
    try {
      await atualizar(cenaId, { nevoa: nova })
    } catch (err) {
      setAviso(`A névoa não foi salva: ${err.message || 'erro'}`)
    } finally {
      if (seqNevoa.current === seq) setNevoaLocal(null)
    }
  }

  const aplicarOpNevoa = op => salvarNevoa(adicionarOpNevoa({ ...nevoa, ativa: true }, op))

  async function adicionarTokens(lista, tamanho = 1) {
    if (!cena) return
    const centro = visorApi.current?.centroVisivel() || { x: cena.largura / 2, y: cena.altura / 2 }
    const posicoes = espalhar(centro, lista.length, normalizarGrade(grade), cena.largura, cena.altura, tamanho, tokensApi.tokens)
    await tokensApi.adicionar(lista.map((t, i) => ({ ...t, ...posicoes[i] })))
  }

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
    const propsTokens = {
      largura: cena.largura,
      altura: cena.altura,
      selecionadoId,
      onSelecionar: setSelecionadoId,
      onArrastar: tokensApi.arrastar,
      onSoltar: tokensApi.mover,
    }
    conteudo = (
      <MapaVisor
        mapa={cena}
        grade={grade}
        mostrarGrade={mostrarGrade}
        chaveEnquadrar={chaveEnquadrar}
        apiRef={visorApi}
        onToqueVazio={() => setSelecionadoId(null)}
        onToqueLongo={p => desenhosApi.pingar(p.x, p.y)}
        camadas={ctx => (
          <>
            <CamadaDesenhos
              ctx={ctx}
              desenhos={desenhosApi.desenhos}
              rascunho={rascunhoDesenho}
              borracha={ferramentaAtiva === 'desenho' && configDesenho.forma === 'borracha'}
              podeApagar={d => isGestor || d.autor_id === meuId}
              onApagar={id => tentar(() => desenhosApi.apagar(id))}
            />
            <CamadaTokens
              ctx={ctx}
              tokens={isGestor ? tokensNaTela : tokensNaTela.filter(t => !t.podeMover)}
              {...propsTokens}
            />
            <CamadaNevoa nevoa={nevoa} rascunho={rascunhoNevoa} largura={cena.largura} altura={cena.altura} translucida={isGestor} />
            {/* Jogador: o próprio token fica ACIMA da névoa (nunca some para o dono) */}
            {!isGestor && (
              <CamadaTokens ctx={ctx} tokens={tokensNaTela.filter(t => t.podeMover)} comDefs={false} {...propsTokens} />
            )}
            <CamadaReguas ctx={ctx} reguas={desenhosApi.reguas} />
            <CamadaPings ctx={ctx} pings={desenhosApi.pings} />
            {ferramentaAtiva === 'nevoa' && (
              <EditorNevoa
                ctx={ctx}
                largura={cena.largura}
                altura={cena.altura}
                config={{ ...configNevoa, raio: configNevoa.raio ?? tamanhoGrade }}
                onRascunho={setRascunhoNevoa}
                onConcluir={aplicarOpNevoa}
              />
            )}
            {ferramentaAtiva === 'desenho' && configDesenho.forma !== 'borracha' && (
              <EditorDesenho
                ctx={ctx}
                largura={cena.largura}
                altura={cena.altura}
                config={configDesenho}
                onRascunho={setRascunhoDesenho}
                onConcluir={d => tentar(() => desenhosApi.desenhar(d))}
              />
            )}
            {ferramentaAtiva === 'regua' && (
              <EditorRegua ctx={ctx} largura={cena.largura} altura={cena.altura} onMedir={desenhosApi.medir} onFim={desenhosApi.encerrarRegua} />
            )}
            {ferramentaAtiva === 'ping' && (
              <EditorPing ctx={ctx} largura={cena.largura} altura={cena.altura} onPing={desenhosApi.pingar} />
            )}
          </>
        )}
        sobreposicao={ctx => selecionado && (
          <MenuToken
            ctx={ctx}
            token={selecionado}
            isGestor={isGestor}
            onAtualizar={tokensApi.atualizar}
            onRemover={async id => { await tokensApi.remover(id); setSelecionadoId(null) }}
            onAbrirFicha={fichaId => window.open(`/mesa/${mesaId}/ficha/${fichaId}`, '_blank')}
          />
        )}
      />
    )
  }

  const alternarPainel = nome => setPainel(p => (p === nome ? null : nome))

  return (
    <div className="h-[100dvh] flex flex-col bg-void overflow-hidden">
      <header className="h-12 shrink-0 flex items-center gap-2 px-2 sm:px-3 border-b border-border bg-bg/90 backdrop-blur z-20">
        <button onClick={() => navigate(voltarPara)} className="text-accent-400 hover:text-ink text-sm px-2 shrink-0">
          ← Voltar
        </button>
        <h1 className="text-ink font-semibold truncate min-w-0">{cena?.nome || 'Mapa'}</h1>
        {isGestor && cena && (
          <span className={`hidden sm:inline text-xs shrink-0 ${cena.ativo ? 'text-ok' : 'text-ink-dim'}`}>
            {cena.ativo ? '● jogadores veem' : 'só gestores veem'}
          </span>
        )}
        {daVez && <span className="hidden md:inline text-xs text-dice-400 shrink-0 truncate">Vez de {daVez.nome}</span>}
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
            <>
              <button
                onClick={() => alternarPainel('tokens')}
                className={`${BTN_ICONE} hover:bg-hover ${painel === 'tokens' ? 'text-accent-300' : 'text-ink'}`}
                title="Tokens"
                disabled={!cena}
              >
                ● <span className="hidden sm:inline">Tokens</span>
              </button>
              <button
                onClick={() => alternarPainel('cenas')}
                className={`${BTN_ICONE} hover:bg-hover ${painel === 'cenas' ? 'text-accent-300' : 'text-ink'}`}
                title="Cenas"
              >
                🗺 <span className="hidden sm:inline">Cenas</span>
              </button>
            </>
          )}
        </div>
      </header>

      <div className="relative flex-1 flex min-h-0">
        <main className="relative flex-1 min-w-0">
          {conteudo}
          {aviso && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 max-w-md rounded-xl border border-amber-700/70 bg-amber-950/90 px-4 py-2 flex items-start gap-3">
              <p className="text-amber-100 text-sm flex-1">{aviso}</p>
              <button onClick={() => setAviso('')} className="text-amber-400 hover:text-amber-100 text-sm" title="Dispensar">✕</button>
            </div>
          )}
          {cena && !indisponivel && (
            <BarraFerramentas ferramenta={ferramentaAtiva} onFerramenta={escolherFerramenta} podeDesenhar={podeDesenhar} isGestor={isGestor} />
          )}
          {cena && ferramentaAtiva === 'nevoa' && (
            <BarraNevoa
              nevoa={nevoa}
              config={{ ...configNevoa, raio: configNevoa.raio ?? tamanhoGrade }}
              tamanhoGrade={tamanhoGrade}
              onConfig={setConfigNevoa}
              onAlternar={() => salvarNevoa({ ...nevoa, ativa: !nevoa.ativa })}
              onTudo={modo => aplicarOpNevoa({ modo, forma: 'tudo' })}
              onFechar={() => escolherFerramenta('mover')}
            />
          )}
          {cena && ferramentaAtiva === 'desenho' && (
            <BarraDesenho
              config={configDesenho}
              onConfig={setConfigDesenho}
              isGestor={isGestor}
              jogadoresDesenham={!!cena.jogadores_desenham}
              onAlternarJogadores={() => tentar(() => atualizar(cena.id, { jogadores_desenham: !cena.jogadores_desenham }))}
              onLimpar={todos => tentar(() => desenhosApi.limpar(todos))}
              onFechar={() => escolherFerramenta('mover')}
            />
          )}
        </main>
        {isGestor && !indisponivel && painel && (
          <aside className="absolute sm:static right-0 inset-y-0 z-10 w-80 max-w-[85vw] shrink-0 overflow-y-auto border-l border-border bg-bg">
            {painel === 'cenas' || !cena ? (
              <PainelCenas
                mapas={mapas}
                cena={cena}
                onVer={id => { setVistaId(id); setSelecionadoId(null) }}
                onCriar={async dados => {
                  const nova = await criar(dados)
                  setVistaId(nova.id)
                }}
                onAtivar={ativar}
                onRemover={remover}
                onAtualizar={atualizar}
                onRascunhoGrade={(cenaId, g) => setRascunho({ cenaId, grade: g })}
              />
            ) : (
              <PainelTokens
                cards={cards}
                combatentes={combatentesAtivos}
                tokens={tokensApi.tokens}
                onAdicionar={adicionarTokens}
                onEnviarImagem={tokensApi.enviarImagem}
              />
            )}
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
