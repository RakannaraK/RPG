import { useState, useEffect, useRef } from 'react'
import { useMatch } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useChamada } from '../../hooks/useChamada'
import Botao from '../ui/Botao'
import Icone from '../ui/Icone'
import Avatar from '../ui/Avatar'
import { t, tx } from '../../i18n'

/**
 * Fase 65 — chamada de voz e vídeo da mesa. Montada uma vez no App (fora da
 * transição de página): a chamada segue ao trocar de ficha, sessão ou mapa, e
 * acaba ao sair da mesa. Fica no canto superior direito, abaixo da barra do
 * mapa: o canto inferior esquerdo é da trilha e o inferior direito, dos desafios.
 */
export default function BarraChamada() {
  const mesaId = useMatch('/mesa/:id/*')?.params.id
  const { session } = useAuth()
  const meuId = session?.user?.id
  if (!mesaId || !meuId) return null
  return <ChamadaDaMesa key={mesaId} mesaId={mesaId} />
}

/** Quem está falando agora: um AnalyserNode por fluxo, lido ~10 vezes por segundo. */
function useFalando(fluxos, ativo) {
  const [falando, setFalando] = useState([])
  useEffect(() => {
    if (!ativo) return
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const medidores = Object.entries(fluxos)
      .filter(([, s]) => s.getAudioTracks().length)
      .map(([id, s]) => {
        const an = ctx.createAnalyser()
        an.fftSize = 512
        ctx.createMediaStreamSource(s).connect(an)
        return { id, an, buf: new Uint8Array(an.fftSize) }
      })
    const timer = setInterval(() => {
      const ids = medidores.filter(({ an, buf }) => {
        an.getByteTimeDomainData(buf)
        return buf.some(v => Math.abs(v - 128) > 12)
      }).map(m => m.id)
      setFalando(antes => (antes.join() === ids.join() ? antes : ids))
    }, 100)
    return () => { clearInterval(timer); ctx.close().catch(() => {}) }
  }, [fluxos, ativo])
  return falando
}

function Audio({ fluxo }) {
  const ref = useRef(null)
  useEffect(() => { if (ref.current) ref.current.srcObject = fluxo }, [fluxo])
  return <audio ref={ref} autoPlay />
}

function Quadro({ p, fluxo, eu, falando, cam }) {
  const ref = useRef(null)
  const video = cam && fluxo?.getVideoTracks().length > 0
  useEffect(() => { if (ref.current) ref.current.srcObject = fluxo }, [fluxo, video])
  return (
    <li className={`relative aspect-video rounded-lg overflow-hidden bg-void flex items-center justify-center ring-2 ${falando ? 'ring-accent-400' : 'ring-transparent'}`}>
      {video
        ? <video ref={ref} autoPlay playsInline muted className={`w-full h-full object-cover ${eu ? '-scale-x-100' : ''}`} />
        : <Avatar url={p.avatar} nome={p.nome} tamanho="md" />}
      {p.ligacao && <span role="status" className="absolute top-1 inset-x-1 text-center text-xs text-ink bg-bg/80 rounded">{p.ligacao === 'sem' ? t('Sem ligação') : t('Reconectando…')}</span>}
      <span className="absolute bottom-0 inset-x-0 px-1.5 py-0.5 text-xs text-ink bg-bg/80 truncate flex items-center gap-1">
        {!p.mic && <><Icone nome="mudo" tamanho={12} /><span className="sr-only">{t('Microfone desligado')}</span></>}
        {eu ? t('{nome} (você)', { nome: p.nome }) : p.nome}
      </span>
    </li>
  )
}

function ChamadaDaMesa({ mesaId }) {
  const ch = useChamada(mesaId)
  const [recolhido, setRecolhido] = useState(false)
  const falando = useFalando(ch.fluxos, ch.naChamada && !recolhido)

  const aviso = ch.erro && <p role="alert" className="text-xs text-harm">{ch.erro}</p>
  const caixa = 'fixed top-14 right-3 z-[45] max-w-[calc(100vw-1.5rem)] print:hidden'

  if (!ch.naChamada) {
    const n = ch.participantes.length
    return (
      <section aria-label={t('Chamada da mesa')} className={`${caixa} flex flex-col items-end gap-1`}>
        <Botao tamanho="sm" variante="contorno" onClick={ch.entrar} disabled={ch.estado === 'entrando'} className="bg-raised/95">
          <Icone nome="pessoas" tamanho={14} />
          {ch.estado === 'entrando' ? t('Entrando…') : t('Entrar na chamada')}
          {n > 0 && <span className="text-ink-dim">· {n}</span>}
        </Botao>
        {aviso}
      </section>
    )
  }

  const outros = Object.entries(ch.fluxos).filter(([id]) => id !== ch.meuId)
  return (
    <section aria-label={t('Chamada da mesa')} className={`${caixa} w-72 rounded-2xl border border-border bg-raised/95 backdrop-blur-md shadow-nivel-3 p-2 space-y-2`}>
      {outros.map(([id, f]) => <Audio key={id} fluxo={f} />)}
      <p className="text-xs text-ink-dim px-1">{t('{n} na chamada', { n: ch.participantes.length })}</p>
      <div className="flex items-center gap-1.5">
        <Botao tamanho="sm" variante="fantasma" aria-expanded={!recolhido} aria-label={t('Quadros da chamada')} onClick={() => setRecolhido(v => !v)}>
          <Icone nome={recolhido ? 'chevron-baixo' : 'chevron-cima'} tamanho={14} />
        </Botao>
        <span className="flex-1" />
        <Botao tamanho="sm" variante={ch.micLigado ? 'secundario' : 'perigo'} aria-pressed={ch.micLigado} aria-label={t('Microfone')} onClick={ch.alternarMic}>
          <Icone nome={ch.micLigado ? 'volume' : 'mudo'} tamanho={14} /> {t('Mic')}
        </Botao>
        <Botao tamanho="sm" variante={ch.camLigada ? 'primario' : 'secundario'} aria-pressed={ch.camLigada} aria-label={t('Câmera')} onClick={ch.alternarCam}>
          {t('Câmera')}
        </Botao>
        <Botao tamanho="sm" variante="perigo" aria-label={t('Sair da chamada')} onClick={ch.sair}>{tx('chamada', 'Sair')}</Botao>
      </div>
      {!recolhido && (
        <ul className="grid grid-cols-2 gap-1.5 max-h-[40vh] overflow-y-auto">
          {ch.participantes.map(p => (
            <Quadro key={p.id} p={p} eu={p.id === ch.meuId} fluxo={ch.fluxos[p.id]} falando={falando.includes(p.id)} cam={p.id === ch.meuId ? ch.camLigada : p.cam} />
          ))}
        </ul>
      )}
      {aviso}
    </section>
  )
}
