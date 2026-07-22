import { useState, useEffect, useRef } from 'react'
import { aplicarRegra } from '../../lib/dice'

export default function DiceRoller({ regra, onConfirmar }) {
  const [resultado, setResultado] = useState(null)
  const [animando, setAnimando] = useState(false)
  const [animValues, setAnimValues] = useState([])
  const intervalRef = useRef(null)
  const timerRef = useRef(null)

  useEffect(() => {
    return () => {
      clearInterval(intervalRef.current)
      clearTimeout(timerRef.current)
    }
  }, [])

  function rolar() {
    if (animando) return

    if (regra.tipo === 'fixo') {
      setResultado(aplicarRegra(regra))
      return
    }

    if (regra.tipo !== 'dados') return

    setAnimando(true)
    setResultado(null)
    const qtd = regra.quantidade || 1
    const lados = regra.lados || 6

    intervalRef.current = setInterval(() => {
      setAnimValues(Array.from({ length: qtd }, () => Math.ceil(Math.random() * lados)))
    }, 60)

    timerRef.current = setTimeout(() => {
      clearInterval(intervalRef.current)
      const real = aplicarRegra(regra)
      setResultado(real)
      setAnimando(false)
      setAnimValues([])
    }, 400)
  }

  const descartar_menores = regra.descartar_menores || 0
  const descartar_maiores = regra.descartar_maiores || 0

  let dadosDisplay = null
  if (animando && animValues.length > 0) {
    dadosDisplay = animValues.map(v => ({ valor: v, tipo: 'animando' }))
  } else if (resultado?.resultados?.length > 0) {
    const sorted = [...resultado.resultados].sort((a, b) => a - b)
    dadosDisplay = sorted.map((v, i) => {
      const isDescartado =
        i < descartar_menores ||
        (descartar_maiores > 0 && i >= sorted.length - descartar_maiores)
      return { valor: v, tipo: isDescartado ? 'descartado' : 'mantido' }
    })
  }

  return (
    <div className="space-y-3">
      {dadosDisplay && (
        <div className="flex flex-wrap gap-2">
          {dadosDisplay.map((d, i) => (
            <span
              key={i}
              className={`w-10 h-10 flex items-center justify-center rounded-lg font-bold text-sm border-2 transition-all ${
                d.tipo === 'animando'
                  ? 'bg-hover border-accent-500 text-ink'
                  : d.tipo === 'mantido'
                  ? 'bg-accent-700 border-accent-400 text-ink'
                  : 'bg-raised border-border text-ink-dim line-through opacity-40'
              }`}
            >
              {d.valor}
            </span>
          ))}
          {resultado && resultado.bonus !== 0 && (
            <span className="px-2 h-10 flex items-center rounded-lg bg-dice-700 border-2 border-dice-500 text-dice-400 text-sm font-bold">
              {resultado.bonus > 0 ? '+' : ''}{resultado.bonus}
            </span>
          )}
        </div>
      )}

      {resultado && (
        <div>
          <p className="text-xs text-ink-dim font-mono">{resultado.formula}</p>
          <p className="text-ink mt-1">
            Total:{' '}
            <span className="text-ink font-bold text-2xl ml-1">{resultado.valor}</span>
          </p>
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={rolar}
          disabled={animando}
          className="flex-1 py-2.5 text-sm bg-dice-500 hover:bg-dice-700 disabled:opacity-50 disabled:cursor-not-allowed text-ink font-semibold rounded-lg transition-colors"
        >
          {animando ? '🎲 Rolando...' : resultado ? '🎲 Rolar novamente' : '🎲 Rolar'}
        </button>
        {resultado && (
          <button
            type="button"
            onClick={() => onConfirmar(resultado)}
            className="px-4 py-2.5 text-sm bg-ok/80 hover:bg-ok text-ink font-semibold rounded-lg transition-colors"
          >
            ✓ Confirmar
          </button>
        )}
      </div>
    </div>
  )
}
