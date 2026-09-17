import { useEffect, useMemo, useRef, useState } from 'react'
import { cronometroVisivel, iniciarCronometro, pararCronometro } from '../../lib/minigames/cronometro'

const fmt = s => s.toFixed(2).replace('.', ',')

/**
 * Fase 28.2 — Cronômetro jogável: começa sozinho; parar com o botão,
 * espaço ou enter. Quem não para até o limite fica com 0 pontos.
 */
export default function JogoCronometro({ config, semente, onFim }) {
  const c = useMemo(() => iniciarCronometro(config, semente), [config, semente])
  const [t, setT] = useState(0)
  const inicioRef = useRef(0)
  const paradoRef = useRef(false)
  const onFimRef = useRef(onFim)
  useEffect(() => { onFimRef.current = onFim }, [onFim])

  function parar() {
    if (paradoRef.current) return
    paradoRef.current = true
    const tempo = (performance.now() - inicioRef.current) / 1000
    setT(tempo)
    onFimRef.current(pararCronometro(c, Math.min(tempo, c.limite)))
  }

  useEffect(() => {
    inicioRef.current = performance.now()
    let raf = 0
    const quadro = () => {
      if (paradoRef.current) return
      const agora = (performance.now() - inicioRef.current) / 1000
      if (agora >= c.limite) { parar(); return }
      setT(agora)
      raf = requestAnimationFrame(quadro)
    }
    raf = requestAnimationFrame(quadro)
    const aoTeclar = e => {
      if (e.code !== 'Space' && e.key !== 'Enter') return
      e.preventDefault()
      if (!e.repeat) parar()
    }
    window.addEventListener('keydown', aoTeclar)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', aoTeclar)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c])

  const visivel = cronometroVisivel(c, t) || paradoRef.current
  return (
    <div className="flex flex-col items-center gap-5 select-none">
      <p className="text-ink-dim text-sm">Pare exatamente em</p>
      <p className="text-dice-400 text-5xl font-bold tabular-nums">{fmt(c.alvo)} s</p>
      <p
        className={`text-6xl font-mono tabular-nums transition-all ${visivel ? 'text-ink' : 'text-ink-dim blur-md'}`}
        aria-live="off"
      >
        {visivel ? fmt(t) : '??,??'}
      </p>
      {!cronometroVisivel(c, t) && !paradoRef.current && <p className="text-ink-dim text-xs">Sumiu! Conte de cabeça…</p>}
      <button
        type="button"
        onPointerDown={e => { e.preventDefault(); parar() }}
        className="w-48 h-20 rounded-2xl bg-red-600 hover:bg-red-500 text-white text-2xl font-bold shadow-xl active:scale-95 transition-transform touch-none"
      >
        PARAR
      </button>
      <p className="text-ink-dim text-xs">ou aperte espaço</p>
    </div>
  )
}
