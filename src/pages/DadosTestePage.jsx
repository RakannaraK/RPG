import { useState } from 'react'
import Dice3D from '../components/dados/Dice3D'

const TIPOS = [4, 6, 8, 10, 12, 20, 100]

export default function DadosTestePage() {
  const [rolando, setRolando] = useState(false)
  const [resultados, setResultados] = useState({ 4: 3, 6: 5, 8: 7, 10: 9, 12: 11, 20: 17, 100: 42 })

  function rolarTodos() {
    const novos = {}
    TIPOS.forEach(t => { novos[t] = Math.ceil(Math.random() * t) })
    setResultados(novos)
    setRolando(true)
    setTimeout(() => setRolando(false), 1400)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-slate-900 to-black flex flex-col items-center justify-center gap-10 p-8">
      <h1 className="text-white text-2xl font-bold">Teste — Dados 3D</h1>

      {/* Todos os tipos */}
      <div className="flex flex-wrap gap-6 justify-center items-end">
        {TIPOS.map(t => (
          <div key={t} className="flex flex-col items-center gap-2">
            <Dice3D lados={t} resultado={resultados[t]} rolando={rolando} />
            <span className="text-purple-400 text-xs">d{t}</span>
          </div>
        ))}
      </div>

      {/* d6 mostrando todos os valores */}
      <div>
        <p className="text-purple-300 text-sm mb-3 text-center">d6 — todas as faces</p>
        <div className="flex gap-4 justify-center">
          {[1, 2, 3, 4, 5, 6].map(n => (
            <div key={n} className="flex flex-col items-center gap-2">
              <Dice3D lados={6} resultado={n} rolando={false} />
              <span className="text-purple-500 text-xs">{n}</span>
            </div>
          ))}
        </div>
      </div>

      {/* kh/kl: descartado */}
      <div>
        <p className="text-purple-300 text-sm mb-3 text-center">kh3 de 4d6 — 3 mantidos + 1 descartado</p>
        <div className="flex gap-4 justify-center">
          {[6, 5, 4, 2].map((n, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <Dice3D lados={6} resultado={n} rolando={false} descartado={i === 3} />
              <span className={`text-xs ${i === 3 ? 'text-red-500' : 'text-green-400'}`}>
                {i === 3 ? 'descartado' : 'mantido'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={rolarTodos}
        disabled={rolando}
        className="px-8 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-lg transition-colors shadow-lg shadow-purple-900/50"
      >
        {rolando ? '🎲 Rolando...' : '🎲 Rolar tudo'}
      </button>
    </div>
  )
}
