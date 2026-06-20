import { useState } from 'react'
import Dice3D from '../components/dados/Dice3D'
import { listarSkins } from '../lib/diceSkins'
import { tocarSomDado } from '../lib/diceSounds'

const TIPOS = [4, 6, 8, 10, 12, 20, 100]
const SKINS = listarSkins()

export default function DadosTestePage() {
  const [rolando, setRolando] = useState(false)
  const [resultados, setResultados] = useState({ 4: 3, 6: 5, 8: 7, 10: 9, 12: 11, 20: 17, 100: 42 })
  const [skin, setSkin] = useState('padrao')
  const [somAtivo, setSomAtivo] = useState(true)
  const [volume, setVolume] = useState(0.6)

  function rolarTodos() {
    const novos = {}
    TIPOS.forEach(t => { novos[t] = Math.ceil(Math.random() * t) })
    setResultados(novos)
    setRolando(true)
    tocarSomDado(skin, { ativo: somAtivo, volume, numDados: TIPOS.length })
    setTimeout(() => setRolando(false), 1400)
  }

  function ouvir(skinId) {
    tocarSomDado(skinId, { ativo: somAtivo, volume, numDados: 3 })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-slate-900 to-black flex flex-col items-center justify-center gap-10 p-8">
      <h1 className="text-white text-2xl font-bold">Teste — Dados 3D</h1>

      {/* Seletor de skin */}
      <div className="flex flex-col items-center gap-3">
        <p className="text-purple-300 text-sm">Skin do material</p>
        <div className="flex flex-wrap gap-2 justify-center">
          {SKINS.map(s => (
            <div
              key={s.id}
              className={`flex items-center rounded-lg border transition-colors ${
                skin === s.id
                  ? 'bg-purple-600 border-purple-400'
                  : 'bg-purple-950/50 border-purple-800 hover:border-purple-600'
              }`}
            >
              <button
                onClick={() => setSkin(s.id)}
                className={`pl-3 pr-2 py-1.5 text-sm font-semibold flex items-center gap-2 ${
                  skin === s.id ? 'text-white' : 'text-purple-300'
                }`}
              >
                <span
                  className="w-3 h-3 rounded-full border border-white/30"
                  style={{ backgroundColor: s.corCss }}
                />
                {s.nome}
              </button>
              <button
                onClick={() => ouvir(s.id)}
                title={`Ouvir ${s.nome}`}
                className="px-2 py-1.5 text-sm border-l border-white/10 text-purple-200 hover:text-white"
              >
                🔊
              </button>
            </div>
          ))}
        </div>

        {/* Controles de som */}
        <div className="flex items-center gap-4 mt-1">
          <label className="flex items-center gap-2 text-purple-300 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={somAtivo}
              onChange={e => setSomAtivo(e.target.checked)}
              className="accent-purple-500"
            />
            Som
          </label>
          <label className="flex items-center gap-2 text-purple-300 text-sm">
            Volume
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={e => setVolume(Number(e.target.value))}
              disabled={!somAtivo}
              className="accent-purple-500 disabled:opacity-40"
            />
            <span className="w-8 tabular-nums text-purple-400">{Math.round(volume * 100)}%</span>
          </label>
        </div>
      </div>

      {/* Todos os tipos */}
      <div className="flex flex-wrap gap-6 justify-center items-end">
        {TIPOS.map(t => (
          <div key={t} className="flex flex-col items-center gap-2">
            <Dice3D lados={t} resultado={resultados[t]} rolando={rolando} skin={skin} />
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
              <Dice3D lados={6} resultado={n} rolando={false} skin={skin} />
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
              <Dice3D lados={6} resultado={n} rolando={false} descartado={i === 3} skin={skin} />
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
