import { useRef, useState } from 'react'

/**
 * F61.B — alças para arrastar efeitos locais e fontes de luz direto no mapa (só gestor).
 * Mesmo gesto do token: captura do ponteiro, limiar de 4 px; só grava ao soltar.
 */
export default function AlcasAtmosfera({ alcas, ctx, largura, altura, onMover }) {
  const [local, setLocal] = useState(null) // { chave, x, y }
  const arraste = useRef(null)
  const z = ctx.vista.zoom

  function pressionar(e, a) {
    if (e.pointerType === 'mouse' && e.button !== 0) return // botão do meio segue p/ o pan
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    const p = ctx.paraMapa(e.clientX, e.clientY)
    arraste.current = { a, pointerId: e.pointerId, dx: a.x - p.x, dy: a.y - p.y, x0: e.clientX, y0: e.clientY, pos: null }
  }

  function mover(e) {
    const d = arraste.current
    if (!d || d.pointerId !== e.pointerId) return
    if (!d.pos && Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < 4) return
    const p = ctx.paraMapa(e.clientX, e.clientY)
    d.pos = { x: p.x + d.dx, y: p.y + d.dy }
    setLocal({ chave: d.a.chave, ...d.pos })
  }

  function soltar(e) {
    const d = arraste.current
    if (!d || d.pointerId !== e.pointerId) return
    arraste.current = null
    if (d.pos && e.type === 'pointerup') {
      onMover(d.a.tipo, d.a.id, Math.min(Math.max(d.pos.x, 0), largura), Math.min(Math.max(d.pos.y, 0), altura))
    }
    // sem salto: onMover grava a cópia local otimista da atmosfera no mesmo lote deste setLocal
    setLocal(null)
  }

  return (
    <g>
      {alcas.map(a => {
        const pos = local?.chave === a.chave ? local : a
        return (
          <g
            key={a.chave}
            transform={`translate(${pos.x} ${pos.y})`}
            style={{ cursor: 'grab', touchAction: 'none' }}
            onPointerDown={e => pressionar(e, a)}
            onPointerMove={mover}
            onPointerUp={soltar}
            onPointerCancel={soltar}
            onLostPointerCapture={soltar}
          >
            <circle r={a.raioPx} fill="none" stroke="var(--accent-300)" strokeOpacity="0.7" strokeWidth={1.5 / z} strokeDasharray={`${6 / z} ${4 / z}`} pointerEvents="none" />
            <circle r={14 / z} fill="var(--bg)" fillOpacity="0.55" stroke="var(--accent-300)" strokeWidth={2 / z} />
            <circle r={6 / z} fill={a.cor} pointerEvents="none" />
            <title>{a.nome}</title>
          </g>
        )
      })}
    </g>
  )
}
