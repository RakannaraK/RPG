import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useMapas } from '../hooks/useMapas'
import { useTokensMapa } from '../hooks/useTokensMapa'
import { useDesenhosMapa } from '../hooks/useDesenhosMapa'
import { useCardsDaMesa } from '../hooks/useSessaoFichas'
import { useSessoes } from '../hooks/useSessoes'
import { useEncontro } from '../hooks/useEncontro'
import { useAvancarTurno } from '../hooks/useAvancarTurno'
import { useAplicarHp } from '../hooks/useAplicarHp'
import { ordenarPorIniciativa } from '../lib/iniciativa'
import { adicionarOpNevoa, espalhar, normalizarGrade, normalizarNevoa, tokenVisivelParaJogador } from '../lib/mapaEngine'
import MapaVisor from '../components/mapa/MapaVisor'
import PainelCenas from '../components/mapa/PainelCenas'
import PainelTokens from '../components/mapa/PainelTokens'
import InvocarBestiario from '../components/bestiario/InvocarBestiario'
import CamadaTokens, { MenuToken } from '../components/mapa/CamadaTokens'
import { BarraNevoa, CamadaNevoa, EditorNevoa } from '../components/mapa/Nevoa'
import {
  BarraDesenho, BarraFerramentas, CamadaDesenhos, CamadaPings, CamadaReguas, EditorDesenho, EditorPing, EditorRegua,
} from '../components/mapa/Desenhos'
import { GavetaFicha, MenuCamadas, PainelCombateMapa, PainelRolagens } from '../components/mapa/PainelMesa'
import PainelChat from '../components/mesa/PainelChat'
import PainelNotas from '../components/mesa/PainelNotas'
import { useChatMesa } from '../hooks/useChatMesa'
import { podeEditarFicha } from '../lib/permissoesFicha'

const BTN_ICONE = 'h-9 min-w-9 px-2 rounded-lg text-sm transition-colors'
const telaCheiaDisponivel = typeof document !== 'undefined' && document.fullscreenEnabled

// Camadas visíveis: preferência de cada pessoa, lembrada neste navegador.
// "Ver como jogador" não é lembrado (surpreenderia na próxima visita).
const CAMADAS_PADRAO = { grade: true, desenhos: true, tokens: true, comoJogador: false }
function lerCamadas() {
  try { return { ...CAMADAS_PADRAO, ...JSON.parse(localStorage.getItem('mapa-camadas') || '{}'), comoJogador: false } }
  catch { return CAMADAS_PADRAO }
}

/** Vida exibida no token: ficha (motor da sessão, ou caixinhas livres da trilha) ou combatente. */
function vidaDoToken(card, combatente, verTudo) {
  if (card?.trilhaVida) {
    const m = card.trilhaVida.marcas || []
    return m.length ? { atual: m.filter(x => x == null).length, max: m.length, temp: 0 } : null
  }
  const max = card ? card.hpMax || card.hpMaxBase || 0 : 0
  if (card && max > 0) return { atual: card.hpAtual ?? 0, max, temp: card.vidaTemp || 0 }
  // Vida de inimigo/NPC só para o mestre
  if (combatente && !combatente.ficha_id && verTudo && combatente.hp_maximo > 0) {
    return { atual: combatente.hp_atual ?? 0, max: combatente.hp_maximo, temp: 0 }
  }
  return null
}

/**
 * Fase 26 — mesa virtual (mapa) em tela cheia.
 *  26.1 cenas, pan/zoom, grade · 26.2 tokens · 26.3 névoa · 26.4 desenho, régua, ping
 *  26.5 painel da mesa (rolagens, combate, ficha), camadas por pessoa
 */
export default function MapaPage() {
  const { id: mesaId } = useParams()
  const { session } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const voltarPara = location.state?.voltar || `/mesa/${mesaId}`
  const meuId = session?.user?.id

  const [isGestor, setIsGestor] = useState(false)
  const [papel, setPapel] = useState(null) // role em membros_mesa (espectador não desenha nem rola)
  const [papelCarregado, setPapelCarregado] = useState(false)
  const { mapas, ativo, loading, indisponivel, criar, ativar, atualizar, remover } = useMapas(mesaId)

  const [vistaId, setVistaId] = useState(null)
  const [painel, setPainel] = useState(null) // 'cenas' | 'tokens' | 'rolagens' | 'chat' | 'notas' | 'combate' | 'ficha'
  const chat = useChatMesa(mesaId, meuId) // F29.2
  const [fichaAberta, setFichaAberta] = useState(null)
  const [camadas, setCamadasEstado] = useState(lerCamadas)
  const [menuCamadas, setMenuCamadas] = useState(false)
  const [chaveEnquadrar, setChaveEnquadrar] = useState(0)
  const [rascunho, setRascunho] = useState({ cenaId: null, grade: null })
  const [selecionadoId, setSelecionadoId] = useState(null)
  const visorApi = useRef(null)
  const [ferramenta, setFerramenta] = useState('mover') // 'mover' | 'desenho' | 'regua' | 'ping' | 'nevoa'
  const [configDesenho, setConfigDesenho] = useState({ forma: 'livre', cor: '#FBBF24', espessura: 4 })
  const [rascunhoDesenho, setRascunhoDesenho] = useState(null)
  const [configNevoa, setConfigNevoa] = useState({ modo: 'revelar', forma: 'ret', raio: null })
  const [rascunhoNevoa, setRascunhoNevoa] = useState(null)
  const [nevoaLocal, setNevoaLocal] = useState(null) // { cenaId, nevoa } — cópia otimista enquanto grava
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
        if (gestor) setPainel(p => p ?? 'cenas')
      }
    }
    if (session) carregar()
    return () => { cancelado = true }
  }, [mesaId, session])

  // Atalhos: V mover · D desenhar · R régua · P ping · N névoa · Esc volta a mover.
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

  // Gestor escolhe qual cena ver; jogador vê a ativa (o RLS só entrega ela).
  const cena = isGestor ? (mapas.find(m => m.id === vistaId) || ativo || mapas[0] || null) : ativo
  const grade = cena && rascunho.cenaId === cena.id && rascunho.grade ? rascunho.grade : cena?.grade

  const { cards, sistema } = useCardsDaMesa(mesaId)
  const camposCombate = sistema?.config_layout?.campos_combate || [] // F31.3
  const { sessaoAtiva } = useSessoes(mesaId)
  const encontroApi = useEncontro(sessaoAtiva?.id, mesaId)
  const { encontro, combatentes } = encontroApi
  // F32.3 — avançar turno pelo mapa aplica os mesmos efeitos da sessão
  const aplicarHp = useAplicarHp({ cards, encontroApi, mesaId, sessaoId: sessaoAtiva?.id })
  const turno = useAvancarTurno({ encontroApi, cards, mesaId, sessaoId: sessaoAtiva?.id, aplicarHp })
  const tokensApi = useTokensMapa(cena?.id, mesaId)
  const desenhosApi = useDesenhosMapa(cena?.id)

  // "Ver como jogador" (26.5): o mestre enxerga exatamente o que a mesa enxerga.
  const verTudo = isGestor && !camadas.comoJogador
  // Mesmas regras do RLS (26.4): gestor sempre; jogador se liberado e não espectador.
  const podeDesenhar = isGestor || (!!cena?.jogadores_desenham && papel !== 'espectador')
  const ferramentaAtiva = (ferramenta === 'desenho' && !podeDesenhar) || (ferramenta === 'nevoa' && !isGestor) ? 'mover' : ferramenta
  // Painéis de gestor não abrem para jogador
  const painelVisivel = !isGestor && (painel === 'cenas' || painel === 'tokens') ? null : painel

  function setCamadas(c) {
    setCamadasEstado(c)
    try {
      const { comoJogador: _ignorado, ...lembrar } = c
      localStorage.setItem('mapa-camadas', JSON.stringify(lembrar))
    } catch { /* navegador sem storage: vale só nesta visita */ }
  }

  function escolherFerramenta(f) {
    setFerramenta(f)
    setSelecionadoId(null)
  }

  const alternarPainel = nome => setPainel(p => (p === nome ? null : nome))

  async function tentar(fn) {
    try { await fn() } catch (err) { setAviso(err.message || 'Algo deu errado.') }
  }

  const combatentesAtivos = encontro ? combatentes : []
  const daVez = encontro ? ordenarPorIniciativa(combatentes)[encontro.turno_atual ?? 0] : null
  const minhasFichas = cards.filter(c => podeEditarFicha(c.ficha, meuId))
  const fichasDaGaveta = isGestor ? cards : minhasFichas

  function abrirFicha(fichaId) {
    setFichaAberta(fichaId || fichasDaGaveta[0]?.id || null)
    setPainel('ficha')
  }

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
      vida: vidaDoToken(card, comb, verTudo),
      daVez: !!daVez && ((!!tk.ficha_id && tk.ficha_id === daVez.ficha_id) || tk.combatente_id === daVez.id),
      podeMover: isGestor || podeEditarFicha(card?.ficha, meuId),
      meu: podeEditarFicha(card?.ficha, meuId),
    }
  })
  // Memo: mantém a identidade entre quadros do pan/zoom (CamadaNevoa é memo).
  const nevoaSalva = cena && nevoaLocal?.cenaId === cena.id ? nevoaLocal.nevoa : cena?.nevoa
  const nevoa = useMemo(() => normalizarNevoa(nevoaSalva), [nevoaSalva])
  // Jogador não recebe tokens sob a névoa nem ocultos (a máscara só pinta; nome e
  // barra vazariam). O próprio token segue visível para o dono.
  const tokensNaTela = verTudo ? tokensVisuais : tokensVisuais.filter(t => tokenVisivelParaJogador(t, nevoa))
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

  // F31.3 — invocar do bestiário no mapa: combatentes (se há combate) + tokens com a arte
  async function invocarNoMapa(linhas, { criatura, noMapa }) {
    const combs = encontro ? await encontroApi.adicionarCombatentes(linhas) : []
    if (!noMapa || !cena) return
    await adicionarTokens(linhas.map((l, i) => ({
      nome: l.nome,
      imagem_url: criatura.imagem_url || null,
      // só a cópia do boss carrega ficha; mook fica ligado ao combatente
      ficha_id: l.ficha_id && l.ficha_id !== criatura.id ? l.ficha_id : null,
      combatente_id: combs[i]?.id || null,
      cor: '#B91C1C',
    })))
  }

  function focarCombatente(c) {
    const tk = tokensNaTela.find(t => (c.ficha_id && t.ficha_id === c.ficha_id) || t.combatente_id === c.id)
    if (!tk) { setAviso(`${c.nome} não tem token nesta cena.`); return }
    visorApi.current?.centralizar(tk)
    setSelecionadoId(tk.id)
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
        {isGestor ? 'Envie a imagem do primeiro mapa no painel de cenas.' : 'O mestre ainda não mostrou nenhum mapa.'}
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
        mostrarGrade={camadas.grade}
        chaveEnquadrar={chaveEnquadrar}
        apiRef={visorApi}
        onToqueVazio={() => { setSelecionadoId(null); setMenuCamadas(false) }}
        onToqueLongo={p => desenhosApi.pingar(p.x, p.y)}
        camadas={ctx => (
          <>
            {camadas.desenhos && (
              <CamadaDesenhos
                zoom={ctx.vista.zoom}
                desenhos={desenhosApi.desenhos}
                rascunho={rascunhoDesenho}
                borracha={ferramentaAtiva === 'desenho' && configDesenho.forma === 'borracha'}
                meuId={meuId}
                apagaTodos={isGestor}
                onApagar={id => tentar(() => desenhosApi.apagar(id))}
              />
            )}
            {camadas.tokens && (
              <CamadaTokens ctx={ctx} tokens={verTudo ? tokensNaTela : tokensNaTela.filter(t => !t.meu)} {...propsTokens} />
            )}
            <CamadaNevoa nevoa={nevoa} rascunho={rascunhoNevoa} largura={cena.largura} altura={cena.altura} translucida={verTudo} />
            {/* Jogador: o próprio token fica ACIMA da névoa (nunca some para o dono) */}
            {camadas.tokens && !verTudo && (
              <CamadaTokens ctx={ctx} tokens={tokensNaTela.filter(t => t.meu)} comDefs={false} {...propsTokens} />
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
            onAbrirFicha={abrirFicha}
          />
        )}
      />
    )
  }

  const botaoPainel = (nome, icone, rotulo, extra = {}) => (
    <button
      onClick={() => (nome === 'ficha' && painelVisivel !== 'ficha' ? abrirFicha(fichaAberta) : alternarPainel(nome))}
      className={`${BTN_ICONE} hover:bg-hover ${painelVisivel === nome ? 'text-accent-300 bg-hover' : 'text-ink'}`}
      title={rotulo}
      aria-label={rotulo}
      {...extra}
    >
      {icone} <span className="hidden lg:inline">{rotulo}</span>
      {nome === 'chat' && chat.naoLidas > 0 && painelVisivel !== 'chat' && (
        <span className="ml-1 inline-flex items-center justify-center text-[10px] font-bold bg-amber-500 text-amber-950 rounded-full w-4 h-4">
          {chat.naoLidas > 9 ? '9+' : chat.naoLidas}
        </span>
      )}
    </button>
  )
  const avisoAtual = aviso || turno.avisoTurno

  return (
    <div className="h-[100dvh] flex flex-col bg-void overflow-hidden">
      <header className="relative h-12 shrink-0 flex items-center gap-1 sm:gap-2 px-2 sm:px-3 border-b border-border bg-bg/90 backdrop-blur z-20">
        <button onClick={() => navigate(voltarPara)} className="text-accent-400 hover:text-ink text-sm px-1 sm:px-2 shrink-0">
          ← <span className="hidden sm:inline">Voltar</span>
        </button>
        <h1 className="text-ink font-semibold truncate min-w-0">{cena?.nome || 'Mapa'}</h1>
        {isGestor && cena && (
          <span className={`hidden md:inline text-xs shrink-0 ${cena.ativo ? 'text-ok' : 'text-ink-dim'}`}>
            {cena.ativo ? '● jogadores veem' : 'só gestores veem'}
          </span>
        )}
        {camadas.comoJogador && <span className="hidden sm:inline text-xs text-warn shrink-0">vendo como jogador</span>}
        {daVez && <span className="hidden xl:inline text-xs text-dice-400 shrink-0 truncate">Vez de {daVez.nome}</span>}
        <div className="ml-auto flex items-center gap-0.5 sm:gap-1 shrink-0">
          {!indisponivel && (
            <>
              {botaoPainel('rolagens', '🎲', 'Rolagens')}
              {botaoPainel('chat', '💬', 'Chat')}
              {botaoPainel('notas', '📝', 'Notas')}
              {(encontro || (isGestor && sessaoAtiva)) && botaoPainel('combate', '⚔', 'Combate')}
              {fichasDaGaveta.length > 0 && botaoPainel('ficha', '📜', 'Ficha')}
              <button
                onClick={() => setMenuCamadas(v => !v)}
                className={`${BTN_ICONE} hover:bg-hover ${menuCamadas ? 'text-accent-300 bg-hover' : 'text-ink'}`}
                title="Camadas visíveis"
                aria-label="Camadas visíveis"
              >
                👁
              </button>
            </>
          )}
          {isGestor && !indisponivel && (
            <>
              {botaoPainel('tokens', '●', 'Tokens', { disabled: !cena })}
              {botaoPainel('cenas', '🗺', 'Cenas')}
            </>
          )}
        </div>
        {menuCamadas && <MenuCamadas camadas={camadas} onCamadas={setCamadas} isGestor={isGestor} />}
      </header>

      <div className="relative flex-1 flex min-h-0">
        <main className="relative flex-1 min-w-0">
          {conteudo}
          {avisoAtual && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 w-[min(28rem,calc(100%-1.5rem))] rounded-xl border border-amber-700/70 bg-amber-950/90 px-4 py-2 flex items-start gap-3">
              <p className="text-amber-100 text-sm flex-1">{avisoAtual}</p>
              <button onClick={() => { setAviso(''); turno.setAvisoTurno('') }} className="text-amber-400 hover:text-amber-100 text-sm" title="Dispensar">✕</button>
            </div>
          )}
          {cena && !indisponivel && (
            <BarraFerramentas
              ferramenta={ferramentaAtiva}
              onFerramenta={escolherFerramenta}
              podeDesenhar={podeDesenhar}
              isGestor={isGestor}
              onEnquadrar={() => setChaveEnquadrar(k => k + 1)}
              onTelaCheia={telaCheiaDisponivel ? alternarTelaCheia : null}
            />
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

        {!indisponivel && painelVisivel && (
          <aside
            className={`absolute sm:static right-0 inset-y-0 z-10 max-w-[92vw] shrink-0 border-l border-border bg-bg ${
              painelVisivel === 'ficha' ? 'w-[28rem] flex flex-col overflow-hidden'
                : painelVisivel === 'chat' ? 'w-80 flex flex-col overflow-hidden p-3' : 'w-80 overflow-y-auto'
            }`}
          >
            {painelVisivel === 'cenas' || (painelVisivel === 'tokens' && !cena) ? (
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
            ) : painelVisivel === 'tokens' ? (
              <PainelTokens
                cards={cards}
                combatentes={combatentesAtivos}
                tokens={tokensApi.tokens}
                onAdicionar={adicionarTokens}
                onEnviarImagem={tokensApi.enviarImagem}
                acoesBestiario={isGestor && (
                  <InvocarBestiario
                    mesaId={mesaId} meuId={meuId} isGestor={isGestor}
                    camposCombate={camposCombate}
                    nomesExistentes={combatentes.map(c => c.nome)}
                    comMapa={!!cena}
                    onInvocar={invocarNoMapa}
                    className="w-full py-2 rounded-lg bg-hover text-ink text-sm hover:bg-border transition-colors"
                    rotulo="🐾 Invocar do bestiário"
                  />
                )}
              />
            ) : painelVisivel === 'rolagens' ? (
              <PainelRolagens mesaId={mesaId} podeRolar={papel !== 'espectador'} meuId={meuId} sessaoId={sessaoAtiva?.id} />
            ) : painelVisivel === 'chat' ? (
              <PainelChat chat={chat} mesaId={mesaId} meuId={meuId} isGestor={isGestor} podeRolar={papel !== 'espectador'} sessaoId={sessaoAtiva?.id} className="flex-1" />
            ) : painelVisivel === 'notas' ? (
              <div className="p-4"><PainelNotas mesaId={mesaId} meuId={meuId} estreito /></div>
            ) : painelVisivel === 'combate' ? (
              <PainelCombateMapa
                encontro={encontro}
                combatentes={combatentes}
                isGestor={isGestor}
                onProximo={turno.proximoTurno}
                onAnterior={encontroApi.turnoAnterior}
                onFocar={focarCombatente}
                onAbrirSessao={sessaoAtiva ? () => navigate(`/mesa/${mesaId}/sessao/${sessaoAtiva.id}`) : null}
              />
            ) : (
              <GavetaFicha
                mesaId={mesaId}
                fichaId={fichaAberta}
                // Ficha de outra pessoa aberta pelo token também entra na lista
                fichas={fichasDaGaveta.some(f => f.id === fichaAberta) ? fichasDaGaveta : [...fichasDaGaveta, ...cards.filter(c => c.id === fichaAberta)]}
                onEscolher={setFichaAberta}
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
