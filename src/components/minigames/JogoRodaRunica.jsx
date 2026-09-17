import { useEffect, useRef, useState } from 'react'
import { avancarRoda, iniciarRoda, pontosPorAcerto, resultadoRoda, tocarRoda } from '../../lib/minigames/rodaRunica'
import { RUNAS } from '../../lib/minigames/memoria'

const R = 78 // raio do anel no viewBox 200×200
const ponto = (angulo, raio = R) => {
  const rad = (angulo * Math.PI) / 180
  return [100 + raio * Math.sin(rad), 100 - raio * Math.cos(rad)] // 0° no topo, sentido horário
}

function caminhoArco(centro, largura) {
  const [x1, y1] = ponto(centro - largura / 2)
  const [x2, y2] = ponto(centro + largura / 2)
  return `M ${x1} ${y1} A ${R} ${R} 0 ${largura > 180 ? 1 : 0} 1 ${x2} ${y2}`
}

/**
 * Fase 28.2 — Roda Rúnica jogável. Tocar/clicar na roda, ou espaço/enter.
 * O relógio é o requestAnimationFrame (aba em segundo plano = jogo pausa).
 */
export default function JogoRodaRunica({ config, semente, onFim }) {
  const [estado, setEstado] = useState(() => iniciarRoda(config, semente))
  const estadoRef = useRef(estado)
  const onFimRef = useRef(onFim)
  useEffect(() => { onFimRef.current = onFim }, [onFim])

  useEffect(() => {
    let raf = 0
    let anterior = 0
    const quadro = agora => {
      const dt = anterior ? Math.min(0.05, (agora - anterior) / 1000) : 0
      anterior = agora
      estadoRef.current = avancarRoda(estadoRef.current, dt)
      setEstado(estadoRef.current)
      if (estadoRef.current.fim) {
        onFimRef.current(resultadoRoda(estadoRef.current))
        return
      }
      raf = requestAnimationFrame(quadro)
    }
    raf = requestAnimationFrame(quadro)
    const aoTeclar = e => {
      if (e.code !== 'Space' && e.key !== 'Enter') return
      e.preventDefault()
      if (!e.repeat) tocar()
    }
    window.addEventListener('keydown', aoTeclar)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', aoTeclar)
    }
  }, [])

  function tocar() {
    estadoRef.current = tocarRoda(estadoRef.current)
    setEstado(estadoRef.current)
  }

  const { alvo, angulo, ultimo } = estado
  const flash = ultimo && estado.t - ultimo.t < 0.25 ? ultimo.tipo : null
  const corAnel = flash === 'acerto' ? 'var(--ok)' : flash === 'erro' ? 'var(--harm)' : 'var(--border)'
  const [px, py] = ponto(angulo, R + 10)
  const [rx, ry] = ponto(alvo.centro, R - 26)
  const runa = RUNAS[Math.floor((alvo.centro / 360) * RUNAS.length) % RUNAS.length]
  const proximoValor = pontosPorAcerto(estado.combo + 1)

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      <div className="flex items-center justify-between w-full max-w-sm text-sm">
        <span className="text-ink font-bold tabular-nums">{estado.pontos} pts</span>
        <span className={`tabular-nums ${estado.combo >= 5 ? 'text-dice-400 font-bold' : 'text-ink-dim'}`}>
          combo {estado.combo}{proximoValor > 1 ? ` · ×${proximoValor}` : ''}
        </span>
        <span className="text-harm tracking-widest" aria-label={`${estado.vidas} vidas`}>{'♥'.repeat(Math.max(0, estado.vidas))}</span>
      </div>
      <button
        type="button"
        onPointerDown={e => { e.preventDefault(); tocar() }}
        className="relative w-[min(80vw,22rem)] aspect-square rounded-full touch-none focus:outline-none"
        aria-label="Roda Rúnica — toque quando o ponteiro estiver na runa acesa"
      >
        <svg viewBox="0 0 200 200" className="w-full h-full">
          <circle cx="100" cy="100" r={R} fill="none" stroke={corAnel} strokeWidth="10" style={{ transition: 'stroke .12s' }} />
          <path d={caminhoArco(alvo.centro, alvo.largura)} fill="none" stroke="var(--dice-400)" strokeWidth="14" strokeLinecap="round"
            style={{ filter: 'drop-shadow(0 0 6px var(--dice-500))' }} />
          <text x={rx} y={ry} textAnchor="middle" dominantBaseline="central" fontSize="18" fill="var(--dice-200)">{runa}</text>
          <line x1="100" y1="100" x2={px} y2={py} stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" />
          <circle cx={px} cy={py} r="5" fill="var(--ink)" />
          <circle cx="100" cy="100" r="7" fill="var(--accent-500)" />
        </svg>
      </button>
      <span className="text-ink-dim text-xs tabular-nums">{estado.t.toFixed(1).replace('.', ',')} s</span>
    </div>
  )
}
