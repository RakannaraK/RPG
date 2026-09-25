import { useEffect, useRef, useState } from 'react'
import { useTrilha } from '../../hooks/useTrilha'
import { usePreferencias } from '../../context/PreferenciasContext'
import { tocarPresetAcao } from '../../audio/actionSynth'
import { EFEITOS_MESA, extrairVideo, posicaoAgora, precisaAjustar } from '../../lib/trilha'
import Botao from '../ui/Botao'
import Ilustra from '../arte/Ilustra'

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
const CAMPO = 'flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-void border border-border text-ink text-xs placeholder:text-ink-dim focus:outline-none focus:ring-1 focus:ring-accent-500'

/**
 * Fase 43 — trilha sonora da mesa (vídeo do YouTube, sincronizado) e efeitos
 * que o mestre dispara para todo mundo. Fica num canto da tela, nas páginas da mesa.
 */
export default function TrilhaMesa({ mesaId, isGestor }) {
  const { preferencias } = usePreferencias()
  const { estado, indisponivel, atualizar, disparar } = useTrilha(mesaId, efeito =>
    tocarPresetAcao(efeito, { ativo: preferencias.som_acao_ativo, volume: preferencias.som_acao_volume }))
  const [recolhido, setRecolhido] = useState(() => ler('dp-trilha-recolhida', true))
  const [ouvir, setOuvir] = useState(() => ler('dp-trilha-ouvir', true))
  const [volume, setVolume] = useState(() => ler('dp-trilha-volume', 40))
  const [bloqueado, setBloqueado] = useState(false)
  const [link, setLink] = useState('')
  const [erro, setErro] = useState('')
  const alvoRef = useRef(null)
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

  if (indisponivel || (!videoId && !isGestor)) return null

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
  const caixa = 'fixed bottom-3 left-3 z-40 max-w-[calc(100vw-1.5rem)] rounded-2xl border border-border bg-raised/95 backdrop-blur shadow-xl'

  return (
    <section aria-label="Trilha da mesa" className={recolhido ? `${caixa} w-auto p-1.5 flex items-center gap-2` : `${caixa} w-72 p-2.5 space-y-2`}>
      {/* o mesmo div nos dois tamanhos: trocar de lugar recriaria o tocador */}
      {ativo && <div ref={alvoRef} className={`${recolhido ? 'w-16 h-9' : 'w-40 h-[90px]'} shrink-0 rounded-lg overflow-hidden bg-void [&_iframe]:w-full [&_iframe]:h-full`} />}
      {recolhido ? (
        <>
          {!ativo && <Ilustra nome="som" tamanho={18} className="shrink-0 ml-1" />}
          <p className="min-w-0 max-w-[10rem] text-xs text-ink truncate" title={titulo}>{titulo}</p>
          {bloqueado && ativo
            ? <Botao variante="primario" tamanho="sm" onClick={destravar}>Ouvir</Botao>
            : <Botao variante="fantasma" tamanho="sm" aria-expanded={false} aria-label="Abrir a trilha" onClick={() => setRecolhido(false)}>Abrir</Botao>}
        </>
      ) : (<>
      <div className="flex items-center gap-2">
        <Ilustra nome="som" tamanho={18} className="shrink-0" />
        <p className="flex-1 min-w-0 text-xs text-ink truncate" title={titulo}>{titulo}</p>
        {videoId && <span className="text-xs text-ink-dim shrink-0">{estado.tocando ? 'tocando' : 'pausada'}</span>}
        <Botao variante="fantasma" tamanho="sm" aria-expanded aria-label="Recolher a trilha" onClick={() => setRecolhido(true)}>Recolher</Botao>
      </div>

      {videoId && (
        <div className="flex items-center gap-2">
          <Botao variante={ouvir ? 'contorno' : 'primario'} tamanho="sm" aria-pressed={!ouvir} onClick={() => setOuvir(o => !o)}>
            {ouvir ? 'Silenciar' : 'Ouvir'}
          </Botao>
          {ouvir && (
            <input
              type="range" min={0} max={100} value={volume} aria-label="Volume da trilha"
              onChange={e => setVolume(Number(e.target.value))} className="flex-1 min-w-0 accent-accent-500"
            />
          )}
        </div>
      )}
      {bloqueado && ativo && (
        <Botao variante="primario" tamanho="sm" className="w-full" onClick={destravar}>Clique para ouvir a trilha</Botao>
      )}

      {isGestor && (
        <div className="space-y-2 border-t border-border pt-2">
          {videoId && (
            <div className="flex flex-wrap gap-1">
              {estado.tocando
                ? <Botao variante="secundario" tamanho="sm" onClick={() => acao(() => atualizar({ tocando: false, posicao_s: posicao(), marcado_em: agoraISO() }))}>Pausar</Botao>
                : <Botao variante="primario" tamanho="sm" onClick={() => acao(() => atualizar({ tocando: true, marcado_em: agoraISO() }))}>Continuar</Botao>}
              <Botao variante="secundario" tamanho="sm" onClick={() => acao(() => atualizar({ posicao_s: 0, marcado_em: agoraISO() }))}>Do começo</Botao>
              <Botao
                variante={estado.repetir ? 'primario' : 'contorno'} tamanho="sm" aria-pressed={!!estado.repetir}
                onClick={() => acao(() => atualizar({ repetir: !estado.repetir, posicao_s: posicao(), marcado_em: agoraISO() }))}
              >Repetir</Botao>
              <Botao variante="fantasma" tamanho="sm" onClick={() => acao(() => atualizar({ video_id: null, titulo: null, tocando: false, posicao_s: 0, marcado_em: agoraISO() }))}>Tirar</Botao>
            </div>
          )}
          <form onSubmit={tocarLink} className="flex gap-1">
            <input value={link} onChange={e => setLink(e.target.value)} placeholder="Link do YouTube" aria-label="Link do YouTube" className={CAMPO} />
            <Botao type="submit" variante="primario" tamanho="sm">Tocar</Botao>
          </form>
          <p className="text-xs text-ink-dim">Efeitos — a mesa toda ouve</p>
          <div className="grid grid-cols-3 gap-1">
            {EFEITOS_MESA.map(ef => (
              <Botao key={ef.id} variante="secundario" tamanho="sm" onClick={() => acao(() => disparar(ef.id))}>{ef.nome}</Botao>
            ))}
          </div>
        </div>
      )}
      </>)}
      {erro && <p className="text-harm text-xs" role="alert">{erro}</p>}
    </section>
  )
}
