import { useRef } from 'react'

/**
 * Fase 26 — retângulo invisível que captura um gesto de UM ponteiro sobre o
 * mapa (névoa, desenho, régua, ping) e entrega pontos já em px do mapa.
 * Fica por cima das camadas enquanto a ferramenta está ativa; a roda do
 * mouse continua dando zoom (tratada no visor).
 */
export default function CapturaMapa({ ctx, largura, altura, cursor = 'crosshair', onInicio, onMover, onFim }) {
  const ponteiro = useRef(null)
  const ponto = e => {
    const p = ctx.paraMapa(e.clientX, e.clientY)
    return { x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 }
  }
  const terminar = concluiu => e => {
    if (ponteiro.current !== e.pointerId) return
    ponteiro.current = null
    onFim?.(ponto(e), concluiu)
  }

  return (
    <rect
      width={largura}
      height={altura}
      fill="transparent"
      style={{ cursor, touchAction: 'none' }}
      onPointerDown={e => {
        if (e.pointerType === 'mouse' && e.button !== 0) return
        e.stopPropagation()
        e.currentTarget.setPointerCapture(e.pointerId)
        ponteiro.current = e.pointerId
        onInicio?.(ponto(e))
      }}
      onPointerMove={e => { if (ponteiro.current === e.pointerId) onMover?.(ponto(e)) }}
      onPointerUp={terminar(true)}
      onPointerCancel={terminar(false)}
    />
  )
}
