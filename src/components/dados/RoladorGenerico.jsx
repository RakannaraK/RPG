import { useState } from 'react'
import { useRolagem } from '../../hooks/useRolagem'
import { validarNotacao } from '../../lib/diceNotation'
import { playDiceRoll } from '../../lib/diceSound'
import Dice3D from './Dice3D'

const ATALHOS = [
  { label: 'd4',   notacao: '1d4' },
  { label: 'd6',   notacao: '1d6' },
  { label: 'd8',   notacao: '1d8' },
  { label: 'd10',  notacao: '1d10' },
  { label: 'd12',  notacao: '1d12' },
  { label: 'd20',  notacao: '1d20' },
  { label: 'd100', notacao: '1d100' },
]

function ResultadoDisplay({ resultado, rotulo, rolando }) {
  const { notacao, dados, mantidos, descartados, modificador, total } = resultado

  return (
    <div className="bg-slate-800/60 border border-purple-800/50 rounded-2xl p-5 space-y-4">
      {/* Rótulo e notação */}
      <div className="flex items-baseline gap-2 flex-wrap">
        {rotulo && <span className="text-white font-semibold">{rotulo}</span>}
        <span className="text-purple-400 font-mono text-sm">{notacao}</span>
      </div>

      {/* Dados 3D */}
      <div className="flex flex-wrap gap-3 items-end">
        {dados.map((d, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <Dice3D
              lados={d.lados}
              resultado={d.valor}
              rolando={rolando}
              descartado={d.descartado}
            />
            {d.descartado && (
              <span className="text-red-500 text-[10px] leading-none">descartado</span>
            )}
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="flex items-baseline gap-3 flex-wrap pt-1 border-t border-purple-900/60">
        <span className="text-purple-400 text-sm">Total</span>
        <span className="text-4xl font-bold text-white leading-none">{total}</span>
        {/* Breakdown */}
        {(mantidos.length > 1 || modificador !== 0) && (
          <span className="text-purple-500 text-sm">
            ({mantidos.join(' + ')}
            {modificador > 0 && ` + ${modificador}`}
            {modificador < 0 && ` − ${Math.abs(modificador)}`}
            )
          </span>
        )}
        {descartados.length > 0 && (
          <span className="text-red-500 text-xs ml-auto">
            descartados: {descartados.join(', ')}
          </span>
        )}
      </div>
    </div>
  )
}

/**
 * Rolador genérico de dados.
 *
 * Props:
 *   mesaId  — obrigatório (para registrar a rolagem no feed)
 *   fichaId — opcional (null para rolagem genérica fora de ficha)
 */
export default function RoladorGenerico({ mesaId, fichaId = null }) {
  const { registrarRolagem, rolando: salvando, erro: erroHook } = useRolagem()
  const [notacao, setNotacao] = useState('')
  const [rotulo, setRotulo] = useState('')
  const [resultado, setResultado] = useState(null)
  const [rotuloDisplay, setRotuloDisplay] = useState('')
  const [rolando, setRolando] = useState(false)
  const [erroLocal, setErroLocal] = useState('')

  async function handleRolar() {
    const n = notacao.trim()
    if (!n) { setErroLocal('Digite uma notação de dados.'); return }
    if (!validarNotacao(n)) {
      setErroLocal(`Notação inválida: "${n}". Exemplos: 1d20, 2d6+3, 4d6kh3`)
      return
    }
    setErroLocal('')
    playDiceRoll()

    try {
      const res = await registrarRolagem({
        mesaId,
        fichaId,
        rotulo: rotulo.trim() || null,
        notacao: n,
      })
      setResultado(res)
      setRotuloDisplay(rotulo.trim())
      setRolando(true)
      setTimeout(() => setRolando(false), 1400)
    } catch {
      // erroHook exibe o erro
    }
  }

  function handleAtalho(nota) {
    setNotacao(nota)
    setErroLocal('')
  }

  const erro = erroLocal || erroHook

  return (
    <div className="space-y-5">
      {/* Botões de atalho */}
      <div className="flex flex-wrap gap-2">
        {ATALHOS.map(a => (
          <button
            key={a.label}
            onClick={() => handleAtalho(a.notacao)}
            className={`px-3 py-1.5 text-sm font-mono font-semibold rounded-lg border transition-colors ${
              notacao === a.notacao
                ? 'bg-purple-600 border-purple-500 text-white'
                : 'bg-purple-950/50 border-purple-800 text-purple-300 hover:border-purple-600 hover:text-white'
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>

      {/* Inputs */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={notacao}
            onChange={e => { setNotacao(e.target.value); setErroLocal('') }}
            onKeyDown={e => e.key === 'Enter' && handleRolar()}
            placeholder="Ex: 2d6+3, 4d6kh3, 1d20"
            className="flex-1 px-4 py-3 rounded-xl bg-purple-950/70 border border-purple-700/70 text-white placeholder-purple-500 font-mono focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
          />
          <button
            onClick={handleRolar}
            disabled={rolando || salvando}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors shadow-lg shadow-purple-900/40"
          >
            {rolando ? '🎲' : 'Rolar'}
          </button>
        </div>
        <input
          type="text"
          value={rotulo}
          onChange={e => setRotulo(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleRolar()}
          placeholder="Rótulo opcional — Ex: Iniciativa, Ataque, Dano"
          className="w-full px-4 py-2.5 rounded-xl bg-purple-950/40 border border-purple-800/60 text-white placeholder-purple-600 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
        />
      </div>

      {erro && (
        <div className="flex items-start gap-2 text-red-400 text-sm bg-red-950/60 border border-red-800/60 rounded-xl px-4 py-3">
          <span className="shrink-0">⚠</span>
          <span>{erro}</span>
        </div>
      )}

      {resultado && (
        <ResultadoDisplay
          resultado={resultado}
          rotulo={rotuloDisplay}
          rolando={rolando}
        />
      )}
    </div>
  )
}
