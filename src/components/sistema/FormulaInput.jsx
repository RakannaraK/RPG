import { validarFormula } from '../../lib/formulaEngine'

/**
 * Fase 17 — editor de fórmula reutilizável (campos calculados, modificador de
 * atributo, modificadores, descansos). Validação de sintaxe ao vivo + presets.
 */
export default function FormulaInput({
  value,
  onChange,
  placeholder = 'ex: 10 + mod(destreza)',
  presets = [],
  variaveis = [],
  className = '',
}) {
  const v = (value ?? '').trim()
  const status = v === '' ? null : validarFormula(v)
  const invalida = status && !status.valida

  return (
    <div className={className}>
      <input
        type="text"
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        spellCheck={false}
        className={`w-full px-3 py-2 rounded-lg bg-purple-950 border text-white text-sm font-mono placeholder-purple-600 focus:outline-none focus:ring-2 ${
          invalida ? 'border-red-600 focus:ring-red-500' : 'border-purple-700 focus:ring-purple-500'
        }`}
      />

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
