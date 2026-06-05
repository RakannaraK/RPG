import { useState } from 'react'
import { aplicarRegra, calcularEstatisticas } from '../../lib/dice'

const LADOS_OPCOES = [4, 6, 8, 10, 12, 20, 100]

const REGRA_PADRAO_DADOS = {
  tipo: 'dados',
  quantidade: 2,
  lados: 6,
  descartar_menores: 0,
  descartar_maiores: 0,
  bonus_fixo: 0,
}

function SliderField({ label, value, min, max, onChange, disabled }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-purple-300 mb-1">
        <span>{label}</span>
        <span className="font-mono font-bold text-white">{value >= 0 ? '+' : ''}{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        disabled={disabled}
        className="w-full accent-purple-500 disabled:opacity-40"
      />
      <div className="flex justify-between text-xs text-purple-600 mt-0.5">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  )
}

function SimulacaoDados({ resultado }) {
  if (!resultado || !resultado.resultados.length) return null

  const { resultados, mantidos, descartados } = resultado
  const ordenados = [...resultados].sort((a, b) => a - b)

  return (
    <div className="mt-3 p-3 bg-slate-900 rounded-lg">
      <p className="text-xs text-purple-400 mb-2">Simulação:</p>
      <div className="flex flex-wrap gap-2 mb-2">
        {ordenados.map((v, i) => {
          const isDescartado = descartados.includes(v) &&
            descartados.filter(d => d === v).length > ordenados.slice(0, i).filter(o => o === v).length
            ? false
            : descartados.indexOf(v) !== -1 && i < descartados.length

          const mantidoIdx = mantidos.indexOf(v)
          const isMantido = mantidoIdx !== -1

          return (
            <span
              key={i}
              className={`w-9 h-9 flex items-center justify-center rounded-lg font-bold text-sm border-2 ${
                isMantido
                  ? 'bg-purple-700 border-purple-400 text-white'
                  : 'bg-slate-800 border-slate-600 text-slate-400 line-through opacity-50'
              }`}
            >
              {v}
            </span>
          )
        })}
        {resultado.bonus !== 0 && (
          <span className="px-2 h-9 flex items-center rounded-lg bg-amber-900 border-2 border-amber-500 text-amber-300 text-sm font-bold">
            {resultado.bonus > 0 ? '+' : ''}{resultado.bonus}
          </span>
        )}
      </div>
      <p className="text-purple-200 text-sm">
        Total: <span className="text-white font-bold text-lg">{resultado.valor}</span>
      </p>
    </div>
  )
}

export default function RegraRolagem({ value, onChange }) {
  const [simulacao, setSimulacao] = useState(null)

  const regra = value || REGRA_PADRAO_DADOS

  function update(campo, val) {
    const nova = { ...regra, [campo]: val }

    // Garante que descartar não ultrapassa o limite
    if (campo === 'quantidade') {
      const maxDesc = val - 1
      nova.descartar_menores = Math.min(nova.descartar_menores, Math.floor(maxDesc / 2))
      nova.descartar_maiores = Math.min(nova.descartar_maiores, Math.floor(maxDesc / 2))
    }

    setSimulacao(null)
    onChange(nova)
  }

  function mudarTipo(tipo) {
    setSimulacao(null)
    if (tipo === 'dados') onChange({ ...REGRA_PADRAO_DADOS })
    else if (tipo === 'fixo') onChange({ tipo: 'fixo', valor: 10 })
    else if (tipo === 'pontos') onChange({ tipo: 'pontos', pool_total: 27 })
  }

  function simular() {
    try {
      setSimulacao(aplicarRegra(regra))
    } catch { /* tipo inválido */ }
  }

  const stats = (() => {
    try { return calcularEstatisticas(regra) } catch { return null }
  })()

  const maxDescartar = regra.tipo === 'dados'
    ? Math.max(0, regra.quantidade - 1)
    : 0

  return (
    <div className="space-y-4">
      {/* Tipo */}
      <div>
        <p className="text-xs text-purple-300 font-medium mb-2">Tipo de regra</p>
        <div className="flex gap-2">
          {['dados', 'fixo', 'pontos'].map(tipo => (
            <button
              key={tipo}
              type="button"
              onClick={() => mudarTipo(tipo)}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-colors capitalize ${
                regra.tipo === tipo
                  ? 'bg-purple-700 border-purple-500 text-white font-semibold'
                  : 'bg-slate-800 border-purple-800 text-purple-400 hover:border-purple-600'
              }`}
            >
              {tipo}
            </button>
          ))}
        </div>
      </div>

      {regra.tipo === 'dados' && (
        <>
          {/* Quantidade e lados */}
          <div className="grid grid-cols-2 gap-4">
            <SliderField
              label="Quantidade de dados"
              value={regra.quantidade}
              min={1}
              max={10}
              onChange={v => update('quantidade', v)}
            />
            <div>
              <p className="text-xs text-purple-300 mb-1">Lados do dado</p>
              <select
                value={regra.lados}
                onChange={e => update('lados', Number(e.target.value))}
                className="w-full px-3 py-2 bg-purple-950 border border-purple-700 text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {LADOS_OPCOES.map(l => (
                  <option key={l} value={l}>d{l}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Descartar */}
          <div className="grid grid-cols-2 gap-4">
            <SliderField
              label="Descartar menores"
              value={regra.descartar_menores}
              min={0}
              max={Math.max(0, maxDescartar - regra.descartar_maiores)}
              onChange={v => update('descartar_menores', v)}
            />
            <SliderField
              label="Descartar maiores"
              value={regra.descartar_maiores}
              min={0}
              max={Math.max(0, maxDescartar - regra.descartar_menores)}
              onChange={v => update('descartar_maiores', v)}
            />
          </div>

          {/* Bônus fixo */}
          <SliderField
            label="Bônus fixo"
            value={regra.bonus_fixo ?? 0}
            min={-10}
            max={20}
            onChange={v => update('bonus_fixo', v)}
          />
        </>
      )}

      {regra.tipo === 'fixo' && (
        <div>
          <label className="block text-xs text-purple-300 mb-1">Valor fixo</label>
          <input
            type="number"
            min={0}
            max={100}
            value={regra.valor ?? 10}
            onChange={e => onChange({ ...regra, valor: Number(e.target.value) })}
            className="w-full px-3 py-2 bg-purple-950 border border-purple-700 text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      )}

      {regra.tipo === 'pontos' && (
        <div>
          <label className="block text-xs text-purple-300 mb-1">Total de pontos para distribuir</label>
          <input
            type="number"
            min={1}
            max={200}
            value={regra.pool_total ?? 27}
            onChange={e => onChange({ ...regra, pool_total: Number(e.target.value) })}
            className="w-full px-3 py-2 bg-purple-950 border border-purple-700 text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <p className="text-purple-500 text-xs mt-1">Os jogadores distribuem esses pontos entre os atributos.</p>
        </div>
      )}

      {/* Fórmula e estatísticas */}
      {stats && (
        <div className="bg-slate-900 rounded-lg px-4 py-3 space-y-1">
          <p className="text-xs text-purple-400">
            Fórmula: <span className="text-amber-400 font-mono font-semibold">
              {regra.tipo === 'dados'
                ? `${regra.quantidade}d${regra.lados}${regra.descartar_menores > 0 ? ` descartar ${regra.descartar_menores}↓` : ''}${regra.descartar_maiores > 0 ? ` descartar ${regra.descartar_maiores}↑` : ''}${regra.bonus_fixo > 0 ? ` +${regra.bonus_fixo}` : regra.bonus_fixo < 0 ? ` ${regra.bonus_fixo}` : ''}`
                : regra.tipo === 'fixo' ? `Valor ${regra.valor ?? 10}`
                : `${regra.pool_total ?? 27} pts`
              }
            </span>
          </p>
          <p className="text-xs text-purple-400">
            Resultados possíveis: <span className="text-white">{stats.min}</span>
            <span className="text-purple-600"> – </span>
            <span className="text-white">{stats.max}</span>
            <span className="text-purple-500"> (média {stats.media})</span>
          </p>
        </div>
      )}

      {/* Simular */}
      {regra.tipo === 'dados' && (
        <div>
          <button
            type="button"
            onClick={simular}
            className="w-full py-2 text-sm bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition-colors"
          >
            🎲 Simular rolagem
          </button>
          <SimulacaoDados resultado={simulacao} />
        </div>
      )}
    </div>
  )
}
