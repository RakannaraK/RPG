import { validarFaixas } from '../../lib/faixas'

const inputCls =
  'px-2 py-1 rounded-lg bg-purple-950 border border-purple-700 text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-500'

/**
 * Fase 19.4 — edita o escalonamento por faixa de um modificador.
 *
 * spec = { variavel: 'nivel' | 'nivel:<classe_id>', faixas: [{de, ate, valor}] }
 *
 * A última faixa pode ficar aberta ("até" vazio). A validação exige faixas
 * contíguas e sem sobreposição — o erro aparece ao vivo.
 *
 * `valorPlaceholder` muda conforme o campo (número, fórmula ou notação de dado).
 */
export default function FaixasEditor({ spec, onChange, classes = [], valorPlaceholder = 'ex: 2', campos = [] }) {
  const faixas = spec?.faixas || []
  const variavel = spec?.variavel || 'nivel'
  const campo = spec?.campo || 'valor'
  const status = faixas.length > 0 ? validarFaixas(spec) : null

  function setSpec(patch) {
    onChange({ variavel, campo, faixas, ...patch })
  }

  function setFaixa(i, patch) {
    setSpec({ faixas: faixas.map((f, j) => (j === i ? { ...f, ...patch } : f)) })
  }

  function adicionar() {
    // Nova faixa começa logo depois da anterior; a anterior deixa de ser aberta.
    const ultima = faixas[faixas.length - 1]
    if (!ultima) {
      setSpec({ faixas: [{ de: 1, ate: null, valor: '' }] })
      return
    }
    const fim = ultima.ate == null || ultima.ate === '' ? Number(ultima.de) : Number(ultima.ate)
    const anteriores = faixas.map((f, j) =>
      j === faixas.length - 1 && (f.ate == null || f.ate === '') ? { ...f, ate: fim } : f
    )
    setSpec({ faixas: [...anteriores, { de: fim + 1, ate: null, valor: '' }] })
  }

  function remover(i) {
    setSpec({ faixas: faixas.filter((_, j) => j !== i) })
  }

  return (
    <div className="space-y-2 border-l-2 border-purple-800 pl-3">
      <div className="flex items-center gap-2 flex-wrap">
        <label className="text-purple-400 text-xs">Escala por</label>
        <select
          value={variavel}
          onChange={e => setSpec({ variavel: e.target.value })}
          className={inputCls}
        >
          <option value="nivel">Nível total</option>
          {classes.map(c => (
            <option key={c.id} value={`nivel:${c.id}`}>Nível de {c.nome}</option>
          ))}
        </select>

        {campos.length > 1 && (
          <>
            <label className="text-purple-400 text-xs">escalando</label>
            <select value={campo} onChange={e => setSpec({ campo: e.target.value })} className={inputCls}>
              {campos.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </>
        )}
      </div>

      {faixas.map((f, i) => {
        const aberta = f.ate == null || f.ate === ''
        return (
          <div key={i} className="flex items-center gap-1.5 flex-wrap">
            <span className="text-purple-600 text-xs">de</span>
            <input
              type="number"
              value={f.de ?? ''}
              onChange={e => setFaixa(i, { de: e.target.value === '' ? '' : Number(e.target.value) })}
              className={`${inputCls} w-16 text-center`}
            />
            <span className="text-purple-600 text-xs">até</span>
            <input
              type="number"
              value={aberta ? '' : f.ate}
              onChange={e => setFaixa(i, { ate: e.target.value === '' ? null : Number(e.target.value) })}
              placeholder="∞"
              className={`${inputCls} w-16 text-center placeholder-purple-600`}
            />
            <span className="text-purple-600 text-xs">→</span>
            <input
              type="text"
              value={f.valor ?? ''}
              onChange={e => setFaixa(i, { valor: e.target.value })}
              placeholder={valorPlaceholder}
              spellCheck={false}
              className={`${inputCls} flex-1 min-w-[6rem] font-mono`}
            />
            <button
              type="button"
              onClick={() => remover(i)}
              className="w-6 h-6 flex items-center justify-center text-purple-500 hover:text-red-400 transition-colors"
              title="Remover faixa"
            >
              ×
            </button>
          </div>
        )
      })}

      <button
        type="button"
        onClick={adicionar}
        className="text-xs px-2 py-1 rounded-lg border border-dashed border-purple-700 text-purple-300 hover:text-white hover:border-purple-500 transition-colors"
      >
        + Faixa
      </button>

      {status && !status.valida && <p className="text-red-400 text-xs">⚠ {status.erro}</p>}
      {status && status.valida && (
        <p className="text-green-600 text-xs">✓ faixas contíguas{faixas[faixas.length - 1]?.ate == null ? ' (última aberta)' : ''}</p>
      )}
    </div>
  )
}
