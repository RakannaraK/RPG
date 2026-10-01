import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTrilha } from '../../hooks/useTrilha'
import { usePreferencias } from '../../context/PreferenciasContext'
import { tocarPresetAcao } from '../../audio/actionSynth'
import { EFEITOS_MESA, extrairVideo, posicaoAgora, precisaAjustar } from '../../lib/trilha'
import Botao from '../ui/Botao'
import Icone from '../ui/Icone'

// F52 — cada efeito tem ícone e uma reação própria no botão (só nele, nunca na tela)
const ICONE_EFEITO = {
  trovao: 'raio', sino: 'sino', porta: 'porta', lamina: 'espada', impacto: 'impacto', disparo: 'mira',
  projetil: 'flecha', arcano: 'magia', cura: 'coracao', escudo: 'escudo', critico: 'estrela', falha: 'caveira',
}
const ANIM_EFEITO = {
  trovao: 'ef-tremer', impacto: 'ef-tremer', lamina: 'ef-tremer', disparo: 'ef-tremer', porta: 'ef-tremer', falha: 'ef-tremer',
  critico: 'ef-critico', arcano: 'ef-flash', cura: 'ef-flash', escudo: 'ef-flash', sino: 'ef-flash', projetil: 'ef-flash',
}

// API de iframe do YouTube: um <script> só, carregado na primeira vez que alguém ouve
let apiYouTube = null
function carregarYouTube() {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (!apiYouTube) {
    apiYouTube = new Promise((ok, falha) => {
      const anterior = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => { anterior?.(); ok(window.YT) }
      const s = document.createElement('script')
      s.src = 'https://www.youtube.com/iframe_api'
      s.onerror = () => { apiYouTube = null; falha(new Error('Não foi possível carregar o YouTube.')) }
      document.head.appendChild(s)
    })
  }
  return apiYouTube
}

// preferência de cada pessoa, não da mesa: fica no navegador
const ler = (k, padrao) => { try { const v = localStorage.getItem(k); return v === null ? padrao : JSON.parse(v) } catch { return padrao } }
const gravar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* sem armazenamento: vale só nesta visita */ } }

const TOCANDO = 1
const PAUSADO = 2
const CARREGANDO = 3
const FIM = 0

/**
 * Fase 43 — trilha sonora da mesa (vídeo do YouTube, sincronizado) e efeitos
 * que o mestre dispara para todo mundo. Fica num canto da tela, nas páginas da mesa.
 */
export default function TrilhaMesa({ mesaId, isGestor, reservarEspaco = true }) {
  const { preferencias } = usePreferencias()
  const { estado, indisponivel, atualizar, disparar } = useTrilha(mesaId, efeito =>
    tocarPresetAcao(efeito, { ativo: preferencias.som_acao_ativo, volume: preferencias.som_acao_volume }))
  const [recolhido, setRecolhido] = useState(() => ler('dp-trilha-recolhida', true))
  const [ouvir, setOuvir] = useState(() => ler('dp-trilha-ouvir', true))
  const [volume, setVolume] = useState(() => ler('dp-trilha-volume', 40))
  const [bloqueado, setBloqueado] = useState(false)
  const [link, setLink] = useState('')
  const [erro, setErro] = useState('')
  const [animando, setAnimando] = useState(null) // { id, n } — reação do botão do efeito
  const alvoRef = useRef(null)
  const secaoRef = useRef(null)
  const playerRef = useRef(null)
  const estadoRef = useRef(estado)
  const volumeRef = useRef(volume)
  useEffect(() => { estadoRef.current = estado; volumeRef.current = volume })

  const videoId = estado?.video_id || null
  const ativo = ouvir && !!videoId

  /** Põe o tocador daqui onde a mesa está: mesmo vídeo, mesmo segundo, tocando ou não. */
  function sincronizar() {
    const p = playerRef.current
    const e = estadoRef.current
    if (!p?.getPlayerState || !e?.video_id) return
    const dur = p.getDuration() || 0
    const alvo = posicaoAgora(e, Date.now(), dur)
    if (p.getVideoData()?.video_id !== e.video_id) {
      if (e.tocando) p.loadVideoById(e.video_id, alvo)
      else p.cueVideoById(e.video_id, alvo)
      return
    }
    const st = p.getPlayerState()
    if (e.tocando && !(dur && !e.repetir && alvo >= dur)) {
      if (precisaAjustar(p.getCurrentTime(), alvo)) p.seekTo(alvo, true)
      if (st !== TOCANDO && st !== CARREGANDO) p.playVideo()
      // o navegador barra som sem um clique na página: pede o clique
      setTimeout(() => {
        const s = playerRef.current?.getPlayerState?.()
        setBloqueado(!!estadoRef.current?.tocando && ((s !== TOCANDO && s !== CARREGANDO) || !!playerRef.current?.isMuted?.()))
      }, 1500)
    } else {
      if (st === TOCANDO) p.pauseVideo()
      if (st === PAUSADO && precisaAjustar(p.getCurrentTime(), alvo)) p.seekTo(alvo, true)
      setBloqueado(false)
    }
  }

  // cria o tocador quando há música e a pessoa quer ouvir; destrói quando não
  useEffect(() => {
    if (!ativo) return
    let cancelado = false
    carregarYouTube().then(YT => {
      if (cancelado || !alvoRef.current) return
      const el = document.createElement('div')
      alvoRef.current.replaceChildren(el) // o YouTube troca este div pelo iframe; o React não mexe aqui
      const e = estadoRef.current
      playerRef.current = new YT.Player(el, {
        width: 160, height: 90, videoId: e.video_id,
        playerVars: { start: Math.floor(posicaoAgora(e)), controls: 0, disablekb: 1, playsinline: 1, rel: 0 },
        events: {
          onReady: ({ target }) => { target.setVolume(volumeRef.current); sincronizar() },
          onStateChange: ({ data, target }) => {
            if (data === TOCANDO) {
              setBloqueado(target.isMuted())
              const titulo = target.getVideoData()?.title
              // o mestre grava o nome da música na primeira vez que ela toca
              if (isGestor && titulo && !estadoRef.current?.titulo) atualizar({ titulo: titulo.slice(0, 120) }).catch(() => {})
            }
            if (data === FIM) sincronizar() // repetir: volta ao começo
          },
        },
      })
    }).catch(err => setErro(err.message))
    const relogio = setInterval(sincronizar, 5000) // corrige o escorregão aos poucos
    return () => {
      cancelado = true
      clearInterval(relogio)
      try { playerRef.current?.destroy?.() } catch { /* já foi */ }
      playerRef.current = null
    }
  // sincronizar/atualizar leem refs: o tocador nasce uma vez por "ouvir"
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ativo])

  // cada mudança vinda do mestre
  useEffect(() => { sincronizar() }, [estado])

  useEffect(() => { playerRef.current?.setVolume?.(volume); gravar('dp-trilha-volume', volume) }, [volume])
  useEffect(() => { gravar('dp-trilha-ouvir', ouvir) }, [ouvir])
  useEffect(() => { gravar('dp-trilha-recolhida', recolhido) }, [recolhido])

  const aparece = !indisponivel && (!!videoId || isGestor)

  // a barra é fixa no canto: reserva a altura dela no fim da página, senão tampa
  // o último conteúdo (botão "Criar mapa" etc.). No mapa (tela cheia) não reserva.
  useEffect(() => {
    const el = secaoRef.current
    if (!reservarEspaco || !aparece || !el) return
    const ro = new ResizeObserver(() => { document.body.style.paddingBottom = `${el.offsetHeight + 24}px` })
    ro.observe(el)
    return () => { ro.disconnect(); document.body.style.paddingBottom = '' }
  }, [reservarEspaco, aparece])

  if (!aparece) return null

  function destravar() {
    const p = playerRef.current
    p?.unMute?.()
    p?.playVideo?.()
    setBloqueado(false)
    sincronizar()
  }

  async function acao(fn) { setErro(''); try { await fn() } catch (e) { setErro(e.message) } }
  const agoraISO = () => new Date().toISOString()
  function posicao() { return posicaoAgora(estadoRef.current, Date.now(), playerRef.current?.getDuration?.() || 0) }

  async function tocarLink(e) {
    e.preventDefault()
    const v = extrairVideo(link)
    if (!v) { setErro('Cole o link de um vídeo do YouTube.'); return }
    await acao(() => atualizar({ video_id: v.id, titulo: null, tocando: true, posicao_s: v.inicio, marcado_em: agoraISO() }))
    setLink('')
  }

  const titulo = videoId ? (estado.titulo || 'Música do YouTube') : 'Trilha e efeitos'
  const tocando = !!videoId && !!estado?.tocando
  const caixa = 'trilha-caixa fixed bottom-4 left-4 z-menu max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-raised/95 backdrop-blur-md shadow-nivel-3'
  const ROTULO = 'text-ink-dim text-xs font-semibold uppercase tracking-wider'

  function dispararEfeito(id) {
    setAnimando(a => ({ id, n: (a?.n || 0) + 1 }))
    acao(() => disparar(id))
  }

  // portal: dentro da página, um ancestral com animação/transform prende o `fixed`
  // ao conteúdo em vez da tela (a barra rolava junto e tampava botões)
  return createPortal(
    <section ref={secaoRef} aria-label="Trilha e efeitos da mesa" className={recolhido ? `${caixa} w-auto p-1.5 pr-2 flex items-center gap-2` : `${caixa} pop-entra w-80 p-3 space-y-3`}>
      {/* o mesmo div nos dois tamanhos: trocar de lugar recriaria o tocador */}
      {ativo && <div ref={alvoRef} className={`${recolhido ? 'w-16 h-9' : 'w-full aspect-video'} shrink-0 rounded-lg overflow-hidden bg-void [&_iframe]:w-full [&_iframe]:h-full`} />}
      {recolhido ? (
        <>
          {!ativo && (
            <span className="w-9 h-9 rounded-xl bg-accent-800/40 text-accent-300 inline-flex items-center justify-center shrink-0">
              <Icone nome="volume" tamanho={18} />
            </span>
          )}
          <div className="min-w-0 max-w-[11rem]">
            <p className="text-sm text-ink font-medium truncate" title={titulo}>{videoId ? titulo : 'Trilha e efeitos'}</p>
            {videoId && (
              <p className="text-xs text-ink-dim flex items-center gap-1.5">
                <span className={`equalizador ${tocando ? '' : 'parado'}`} aria-hidden="true"><i /><i /><i /></span>
                {tocando ? 'Tocando agora' : 'Pausada'}
              </p>
            )}
          </div>
          {bloqueado && ativo
            ? <Botao variante="primario" tamanho="sm" onClick={destravar}>Ouvir</Botao>
            : (
              <button className="botao-icone" aria-expanded={false} aria-label="Abrir trilha e efeitos" data-dica="Abrir" onClick={() => setRecolhido(false)}>
                <Icone nome="chevron-cima" tamanho={18} />
              </button>
            )}
        </>
      ) : (<>
      <div className="flex items-center gap-2">
        <Icone nome="volume" tamanho={18} className="text-accent-300" />
        <p className="flex-1 text-ink text-sm font-semibold">Trilha e efeitos</p>
        <button className="botao-icone !min-w-[32px] !min-h-[32px]" aria-expanded aria-label="Recolher trilha e efeitos" data-dica="Recolher" onClick={() => setRecolhido(true)}>
          <Icone nome="chevron-baixo" tamanho={18} />
        </button>
      </div>

      {/* ── Trilha ── */}
      <div className="space-y-2">
        <p className={ROTULO}>Trilha</p>
        {videoId ? (
          <div className="rounded-xl bg-void/70 border border-border/70 p-2.5 space-y-2">
            <div className="flex items-center gap-2">
              <span className={`equalizador ${tocando ? '' : 'parado'}`} aria-hidden="true"><i /><i /><i /></span>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-ink-dim">{tocando ? 'Tocando agora' : 'Pausada'}</p>
                <p className="text-sm text-ink truncate" title={titulo}>{titulo}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="botao-icone !min-w-[32px] !min-h-[32px]" aria-pressed={!ouvir}
                aria-label={ouvir ? 'Silenciar para mim' : 'Ouvir'} data-dica={ouvir ? 'Silenciar para mim' : 'Ouvir'} data-dica-lado="dir"
                onClick={() => setOuvir(o => !o)}
              ><Icone nome={ouvir ? 'volume' : 'mudo'} tamanho={18} /></button>
              {ouvir && (
                <input
                  type="range" min={0} max={100} value={volume} aria-label="Volume da trilha (só para você)"
                  onChange={e => setVolume(Number(e.target.value))} className="flex-1 min-w-0 accent-accent-500"
                />
              )}
            </div>
          </div>
        ) : (
          <p className="text-ink-dim text-sm">{isGestor ? 'Cole um link do YouTube: a mesa toda ouve, no mesmo ponto da música.' : 'Nenhuma música tocando.'}</p>
        )}
        {bloqueado && ativo && (
          <Botao variante="primario" tamanho="sm" className="w-full" onClick={destravar}>Clique para ouvir a trilha</Botao>
        )}

        {isGestor && videoId && (
          <div className="flex flex-wrap gap-1">
            {estado.tocando
              ? <Botao variante="secundario" tamanho="sm" onClick={() => acao(() => atualizar({ tocando: false, posicao_s: posicao(), marcado_em: agoraISO() }))}><Icone nome="pausa" tamanho={14} /> Pausar</Botao>
              : <Botao variante="primario" tamanho="sm" onClick={() => acao(() => atualizar({ tocando: true, marcado_em: agoraISO() }))}><Icone nome="play" tamanho={14} /> Continuar</Botao>}
            <Botao variante="secundario" tamanho="sm" onClick={() => acao(() => atualizar({ posicao_s: 0, marcado_em: agoraISO() }))}>Do começo</Botao>
            <Botao
              variante={estado.repetir ? 'primario' : 'contorno'} tamanho="sm" aria-pressed={!!estado.repetir}
              onClick={() => acao(() => atualizar({ repetir: !estado.repetir, posicao_s: posicao(), marcado_em: agoraISO() }))}
            >Repetir</Botao>
            <Botao variante="fantasma" tamanho="sm" onClick={() => acao(() => atualizar({ video_id: null, titulo: null, tocando: false, posicao_s: 0, marcado_em: agoraISO() }))}>Tirar</Botao>
          </div>
        )}
        {isGestor && (
          <form onSubmit={tocarLink} className="flex gap-1.5">
            <input value={link} onChange={e => setLink(e.target.value)} placeholder="Link do YouTube" aria-label="Link do YouTube" className="campo flex-1 min-w-0 !min-h-[34px] !py-1.5 !text-sm" />
            <Botao type="submit" variante="primario" tamanho="sm"><Icone nome="play" tamanho={14} /> Tocar</Botao>
          </form>
        )}
      </div>

      {/* ── Efeitos rápidos (só o mestre dispara; todo mundo ouve) ── */}
      {isGestor && (
        <div className="space-y-2 pt-3 border-t border-border/70">
          <p className={ROTULO}>Efeitos rápidos <span className="normal-case tracking-normal font-normal">· a mesa toda ouve</span></p>
          <div className="grid grid-cols-3 gap-1.5">
            {EFEITOS_MESA.map(ef => {
              const anim = animando?.id === ef.id
              return (
                <button
                  key={anim ? `${ef.id}-${animando.n}` : ef.id}
                  type="button" onClick={() => dispararEfeito(ef.id)}
                  className={`efeito botao flex flex-col items-center gap-1 rounded-xl border border-border bg-void/60 hover:border-accent-500 hover:bg-hover/70 py-2 text-xs text-ink ${anim ? ANIM_EFEITO[ef.id] || 'ef-flash' : ''}`}
                >
                  <Icone nome={ICONE_EFEITO[ef.id] || 'magia'} tamanho={18} className="text-accent-300" />
                  {ef.nome}
                </button>
              )
            })}
          </div>
        </div>
      )}
      </>)}
      {erro && <p className="aviso-erro !text-xs" role="alert">{erro}</p>}
    </section>,
    document.body,
  )
}
