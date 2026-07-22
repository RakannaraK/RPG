import { useEffect, useState } from 'react'
import './Dice3D.css'

const FACE_TRANSFORM = {
  1: 'rotateX(0deg)   rotateY(0deg)',
  2: 'rotateX(0deg)   rotateY(-90deg)',
  3: 'rotateX(-90deg) rotateY(0deg)',
  4: 'rotateX(90deg)  rotateY(0deg)',
  5: 'rotateX(0deg)   rotateY(90deg)',
  6: 'rotateX(0deg)   rotateY(180deg)',
}

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

const DICE_STYLE = {
  4:   'bg-rose-950   border-rose-500   text-rose-100',
  8:   'bg-sky-950    border-sky-500    text-sky-100',
  10:  'bg-teal-950   border-teal-500   text-teal-100',
  12:  'bg-violet-950 border-violet-500 text-violet-100',
  20:  'bg-dice-700  border-dice-500  text-dice-200',
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
 * Fallback CSS 3D — usado quando WebGL não está disponível.
 * Mantido da Fase 7 sem alterações.
 */
export default function Dice3DCSS({ lados, resultado, rolando, descartado = false }) {
  if (lados === 6) {
    return <D6Cube resultado={resultado} rolando={rolando} descartado={descartado} />
  }
  return <DiceGenerico lados={lados} resultado={resultado} rolando={rolando} descartado={descartado} />
}
