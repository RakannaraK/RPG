import { useState } from 'react'
import { validarFormula } from '../../lib/formulaEngine'

// 17.6 — referência rápida da gramática (aberta pelo "?")
function AjudaGramatica() {
  return (
    <div className="mt-1.5 bg-slate-900 border border-purple-800 rounded-lg p-3 text-[11px] space-y-1.5">
      <p className="text-purple-300"><span className="font-semibold">Operadores:</span> <span className="font-mono">+ − * / ( )</span></p>
      <p className="text-purple-300"><span className="font-semibold">Funções:</span> <span className="font-mono">piso(x) teto(x) arredondar(x) abs(x) min(a,b) max(a,b)</span></p>
      <p className="text-purple-300"><span className="font-semibold">Variáveis:</span> <span className="font-mono">atributo(nome) mod(nome) nivel nivel(classe) proficiencia pericia(nome) recurso(nome) vida_atual vida_max</span></p>
      <p className="text-purple-500"><span className="font-semibold">Ex:</span> <span className="font-mono">10 + mod(destreza) + mod(constituicao)</span> · <span className="font-mono">5 * nivel(paladino)</span> · <span className="font-mono">proficiencia + mod(carisma)</span></p>
      <p className="text-purple-600">Na fórmula do modificador de atributo, <span className="font-mono">x</span> é o valor do atributo.</p>
      <div className="border-t border-purple-900 pt-1.5 mt-1.5">
        <p className="text-purple-300 font-semibold mb-0.5">Como os bônus se combinam (ordem)</p>
        <p className="text-purple-500">base → somas → <span className="text-amber-400">percentuais (somados entre si)</span> → multiplicadores → definir</p>
        <p className="text-purple-500">Ex: base 20, +5, <span className="text-amber-400">+13% e +10% = +23%</span> → piso(25 × 1,23) = <span className="text-green-400">30</span></p>
      </div>
    </div>
  )
}

/**
 * Fase 17 — editor de fórmula reutilizável (campos calculados, modificador de
 * atributo, modificadores, descansos). Validação de sintaxe ao vivo + presets +
 * variáveis clicáveis + ajuda da gramática.
 */
export default function FormulaInput({
  value,
  onChange,
  placeholder = 'ex: 10 + mod(destreza)',
  presets = [],
  variaveis = [],
  className = '',
}) {
  const [ajuda, setAjuda] = useState(false)
  const v = (value ?? '').trim()
  const status = v === '' ? null : validarFormula(v)
  const invalida = status && !status.valida

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          spellCheck={false}
          className={`flex-1 px-3 py-2 rounded-lg bg-purple-950 border text-white text-sm font-mono placeholder-purple-600 focus:outline-none focus:ring-2 ${
            invalida ? 'border-red-600 focus:ring-red-500' : 'border-purple-700 focus:ring-purple-500'
          }`}
        />
        <button
          type="button"
          onClick={() => setAjuda(a => !a)}
          title="Referência da gramática"
          className={`w-7 h-7 shrink-0 rounded-lg border text-sm transition-colors ${
            ajuda ? 'bg-purple-700 border-purple-500 text-white' : 'border-purple-700 text-purple-400 hover:text-white'
          }`}
        >
          ?
        </button>
      </div>

      {ajuda && <AjudaGramatica />}

      {presets.length > 0 && (
        <div className="flex gap-1.5 flex-wrap mt-1.5">
          {presets.map(p => (
            <button
              key={p.label}
              type="button"
              onClick={() => onChange(p.valor)}
              className="text-xs px-2 py-1 bg-purple-900/60 hover:bg-purple-800 text-purple-300 hover:text-white rounded-lg transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {variaveis.length > 0 && (
        <div className="flex gap-1 flex-wrap mt-1.5">
          {variaveis.map(vv => (
            <button
              key={vv}
              type="button"
              onClick={() => onChange(`${value || ''}${vv}`)}
              className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-700/60 hover:bg-slate-600 text-purple-300 rounded transition-colors"
              title="Inserir na fórmula"
            >
              {vv}
            </button>
          ))}
        </div>
      )}

      {invalida && <p className="text-red-400 text-xs mt-1">⚠ {status.erro}</p>}
      {status && status.valida && <p className="text-green-600 text-xs mt-1">✓ sintaxe válida</p>}
    </div>
  )
}
