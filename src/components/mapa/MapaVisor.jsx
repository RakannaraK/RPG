import { useEffect, useRef, useState } from 'react'
import { enquadrar, normalizarGrade, pinca, zoomNoPonto } from '../../lib/mapaEngine'

const centro = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)

/**
 * Fase 26.1 — visor do mapa: pan (arrastar / botão do meio), zoom na roda e
 * pinça com dois dedos. Tudo desenhado num SVG em px do mapa, transformado
 * pela visão local { x, y, zoom } (nunca gravada).
 *
 * Props:
 *   mapa            — linha de `mapas` (imagem_url, largura, altura, grade)
 *   grade           — grade a exibir (rascunho do editor ou a salva)
 *   mostrarGrade    — camada local (liga/desliga por pessoa)
 *   chaveEnquadrar  — mudar o valor re-enquadra o mapa na tela
 */
export default function MapaVisor({ mapa, grade, mostrarGrade = true, chaveEnquadrar }) {
  const areaRef = useRef(null)
  const [vista, setVista] = useState({ x: 0, y: 0, zoom: 1 })
  const vistaRef = useRef(vista)
  const ponteiros = useRef(new Map())
  const gesto = useRef(null)

  useEffect(() => { vistaRef.current = vista }, [vista])

  const largura = mapa?.largura || 0
  const altura = mapa?.altura || 0

  // Enquadra ao abrir/trocar de cena ou ao pedir "ajustar à tela".
  useEffect(() => {
    const el = areaRef.current
    if (!el || !largura) return
    setVista(enquadrar(largura, altura, el.clientWidth, el.clientHeight))
  }, [mapa?.id, largura, altura, chaveEnquadrar])

  // Roda do mouse (e pinça do touchpad, que chega como wheel+ctrl). Listener
  // nativo porque o onWheel do React é passivo e não impede o zoom da página.
  useEffect(() => {
    const el = areaRef.current
    if (!el) return
    const aoRolar = e => {
      e.preventDefault()
      const r = el.getBoundingClientRect()
      const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY
      const fator = Math.exp(-delta * (e.ctrlKey ? 0.01 : 0.0015))
      setVista(v => zoomNoPonto(v, fator, { x: e.clientX - r.left, y: e.clientY - r.top }))
    }
    el.addEventListener('wheel', aoRolar, { passive: false })
    return () => el.removeEventListener('wheel', aoRolar)
  }, [])

  const local = e => {
    const r = areaRef.current.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  function iniciarGesto() {
    const pts = [...ponteiros.current.values()]
    if (pts.length === 1) gesto.current = { tipo: 'pan', inicio: pts[0], vista0: vistaRef.current }
    else if (pts.length >= 2) gesto.current = { tipo: 'pinca', c0: centro(pts[0], pts[1]), d0: dist(pts[0], pts[1]), vista0: vistaRef.current }
  }

  function aoPressionar(e) {
    if (e.pointerType === 'mouse' && e.button !== 0 && e.button !== 1) return
    e.currentTarget.setPointerCapture(e.pointerId)
    ponteiros.current.set(e.pointerId, local(e))
    iniciarGesto()
  }

  function aoMover(e) {
    if (!ponteiros.current.has(e.pointerId)) return
    ponteiros.current.set(e.pointerId, local(e))
    const g = gesto.current
    if (!g) return
    const pts = [...ponteiros.current.values()]
    if (g.tipo === 'pan') {
      setVista({ ...g.vista0, x: g.vista0.x + pts[0].x - g.inicio.x, y: g.vista0.y + pts[0].y - g.inicio.y })
    } else if (pts.length >= 2) {
      setVista(pinca(g.vista0, g.c0, g.d0, centro(pts[0], pts[1]), dist(pts[0], pts[1])))
    }
  }

  function aoSoltar(e) {
    ponteiros.current.delete(e.pointerId)
    gesto.current = null
    // De 2 dedos para 1: segue como pan a partir daqui, sem salto.
    if (ponteiros.current.size > 0) iniciarGesto()
  }

  const g = normalizarGrade(grade)
  const t = Number(g.tamanho)

  return (
    <div
      ref={areaRef}
      className="absolute inset-0 overflow-hidden touch-none select-none cursor-grab active:cursor-grabbing"
      onPointerDown={aoPressionar}
      onPointerMove={aoMover}
      onPointerUp={aoSoltar}
      onPointerCancel={aoSoltar}
      onContextMenu={e => e.preventDefault()}
    >
      {largura > 0 && (
        <svg
          width={largura}
          height={altura}
          className="absolute left-0 top-0"
          style={{
            transformOrigin: '0 0',
            transform: `translate(${vista.x}px, ${vista.y}px) scale(${vista.zoom})`,
            willChange: 'transform',
          }}
        >
          <image href={mapa.imagem_url} width={largura} height={altura} pointerEvents="none" />
          {mostrarGrade && g.ativa && t > 0 && (
            <>
              <defs>
                <pattern id="grade-mapa" x={g.offset_x} y={g.offset_y} width={t} height={t} patternUnits="userSpaceOnUse">
                  {/* metade do traço é cortada na borda do ladrilho → 2/zoom ≈ 1 px de tela */}
                  <path d={`M ${t} 0 L 0 0 0 ${t}`} fill="none" stroke={g.cor} strokeWidth={Math.max(2, 2 / vista.zoom)} />
                </pattern>
              </defs>
              <rect width={largura} height={altura} fill="url(#grade-mapa)" opacity={g.opacidade} pointerEvents="none" />
            </>
          )}
        </svg>
      )}
    </div>
  )
}
