import { useEffect, useState } from 'react'
import './Dice3D.css'

// Rotation applied to the cube container to bring each d6 face toward the viewer.
// Derived as the inverse of each face's positioning transform.
const FACE_TRANSFORM = {
  1: 'rotateX(0deg)   rotateY(0deg)',    // front
  2: 'rotateX(0deg)   rotateY(-90deg)',  // right → front
  3: 'rotateX(-90deg) rotateY(0deg)',    // top → front
  4: 'rotateX(90deg)  rotateY(0deg)',    // bottom → front
  5: 'rotateX(0deg)   rotateY(90deg)',   // left → front
  6: 'rotateX(0deg)   rotateY(180deg)',  // back → front
}

// 9-cell flat array (TL TC TR / ML MC MR / BL BC BR): 1 = pip present
const PIPS = {
  1: [0, 0, 0,  0, 1, 0,  0, 0, 0],
  2: [0, 0, 1,  0, 0, 0,  1, 0, 0],
  3: [0, 0, 1,  0, 1, 0,  1, 0, 0],
  4: [1, 0, 1,  0, 0, 0,  1, 0, 1],
  5: [1, 0, 1,  0, 1, 0,  1, 0, 1],
  6: [1, 0, 1,  1, 0, 1,  1, 0, 1],
}

function PipFace({ n }) {
  const cells = PIPS[n] || PIPS[1]
  return (
    <div className="pip-grid">
      {cells.map((has, i) => (
        <div key={i} className="pip-cell">
          {has ? <span className="pip" /> : null}
        </div>
      ))}
    </div>
  )
}

// Face layout: front=1, back=6, right=2, left=5, top=3, bottom=4
// (standard Western die: opposite faces sum to 7)
function D6Cube({ resultado, rolando, descartado }) {
  const [animando, setAnimando] = useState(false)

  useEffect(() => {
    if (rolando) {
      setAnimando(true)
      const t = setTimeout(() => setAnimando(false), 1200)
      return () => clearTimeout(t)
    } else {
      setAnimando(false)
    }
  }, [rolando])

  const r = Math.max(1, Math.min(6, resultado || 1))
  const finalTransform = FACE_TRANSFORM[r]

  return (
    <div className="dice-perspective">
      <div
        className={[
          'dice-cube',
          animando ? 'rolling' : '',
          descartado ? 'discarded' : '',
        ].filter(Boolean).join(' ')}
        style={animando ? undefined : { transform: finalTransform }}
      >
        <div className="dice-face face-front">  <PipFace n={1} /></div>
        <div className="dice-face face-back">   <PipFace n={6} /></div>
        <div className="dice-face face-right">  <PipFace n={2} /></div>
        <div className="dice-face face-left">   <PipFace n={5} /></div>
        <div className="dice-face face-top">    <PipFace n={3} /></div>
        <div className="dice-face face-bottom"> <PipFace n={4} /></div>
      </div>
    </div>
  )
}

// Accent colors for each die type
const DICE_STYLE = {
  4:   'bg-rose-950   border-rose-500   text-rose-100',
  8:   'bg-sky-950    border-sky-500    text-sky-100',
  10:  'bg-teal-950   border-teal-500   text-teal-100',
  12:  'bg-violet-950 border-violet-500 text-violet-100',
  20:  'bg-amber-950  border-amber-500  text-amber-100',
  100: 'bg-slate-800  border-slate-500  text-slate-100',
}

function DiceGenerico({ lados, resultado, rolando, descartado }) {
  const [animando, setAnimando] = useState(false)

  useEffect(() => {
    if (rolando) {
      setAnimando(true)
      const t = setTimeout(() => setAnimando(false), 1200)
      return () => clearTimeout(t)
    } else {
      setAnimando(false)
    }
  }, [rolando])

  const style = DICE_STYLE[lados] || DICE_STYLE[20]

  return (
    <div
      className={[
        'w-16 h-16 rounded-xl border-2 flex flex-col items-center justify-center select-none',
        style,
        animando ? 'dice-generic-rolling' : '',
        descartado ? 'opacity-35' : '',
      ].filter(Boolean).join(' ')}
    >
      <span className="text-[10px] opacity-50 font-mono leading-none">d{lados}</span>
      <span className={`font-bold leading-none mt-0.5 ${resultado >= 100 ? 'text-lg' : 'text-3xl'}`}>
        {animando ? '?' : resultado}
      </span>
    </div>
  )
}

/**
 * Dado 3D — cubo CSS para d6 com pips, token animado para os demais.
 *
 * Props:
 *   lados      — 4 | 6 | 8 | 10 | 12 | 20 | 100
 *   resultado  — valor final (1..lados)
 *   rolando    — true enquanto a animação deve tocar
 *   descartado — true quando o dado foi descartado por kh/kl (visual dimmed)
 */
export default function Dice3D({ lados, resultado, rolando, descartado = false }) {
  if (lados === 6) {
    return <D6Cube resultado={resultado} rolando={rolando} descartado={descartado} />
  }
  return <DiceGenerico lados={lados} resultado={resultado} rolando={rolando} descartado={descartado} />
}
