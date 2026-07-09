/**
 * Fase 15.1 — editor de tipos de descanso do sistema (salvo em config_layout.descansos).
 * Cada descanso define como recupera vida, vida temporária e recursos de habilidade.
 * Nada é fixo em D&D: nomes e regras são livres.
 * Fase 17.5 — modos fixo/dado aceitam fórmula/notação com variáveis.
 */
import FormulaInput from './FormulaInput'

const inputCls = 'px-2 py-1 rounded-lg bg-purple-950 border border-purple-700 text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-500'
const selectCls = inputCls

function novoDescanso() {
  return {
    id: `desc_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    nome: '',
    vida: { modo: 'nada' },
    vida_temp: { modo: 'manter' },
    recursos_habilidade: { modo: 'nada' },
  }
}

// Editor genérico de uma regra { modo, valor, valor_e_formula } com os modos disponíveis
function RegraEditor({ label, regra, modos, onChange }) {
  const modo = regra?.modo || modos[0].value
  const precisaValor = { fixo: 'num', fracao: 'frac', parcial: 'frac', dado: 'texto' }[modo]
  const ehFormula = !!regra?.valor_e_formula
  const setRegra = patch => onChange({ modo, valor: regra?.valor, valor_e_formula: ehFormula, ...patch })
  return (
    <div className="flex items-start gap-2 flex-wrap">
      <span className="text-purple-300 text-xs w-28 shrink-0 pt-1.5">{label}</span>
      <select value={modo} onChange={e => onChange({ modo: e.target.value, valor: regra?.valor, valor_e_formula: ehFormula })} className={selectCls}>
        {modos.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
      </select>
      {precisaValor === 'num' && !ehFormula && (
        <input type="number" value={regra?.valor ?? ''} onChange={e => setRegra({ valor: e.target.value })} placeholder="ex: 10" className={`${inputCls} w-20`} />
      )}
      {precisaValor === 'frac' && (
        <input type="number" step="0.05" min="0" max="1" value={regra?.valor ?? ''} onChange={e => setRegra({ valor: e.target.value })} placeholder="0.5" className={`${inputCls} w-20`} title="Fração do máximo (0 a 1)" />
      )}
      {precisaValor === 'texto' && (
        <input type="text" value={regra?.valor ?? ''} onChange={e => setRegra({ valor: e.target.value })} placeholder="ex: 1d8+nivel" className={`${inputCls} w-32`} title="Notação; aceita variáveis (ex: 1d8+nivel)" />
      )}
      {modo === 'fixo' && (
        <label className="text-purple-400 text-[11px] flex items-center gap-1 cursor-pointer pt-1.5" title="Usar fórmula (ex: 5*nivel)">
          <input type="checkbox" checked={ehFormula} onChange={e => setRegra({ valor_e_formula: e.target.checked })} className="accent-purple-500" />
          ƒ
        </label>
      )}
      {precisaValor === 'num' && ehFormula && (
        <div className="w-52">
          <FormulaInput value={regra?.valor ?? ''} onChange={v => setRegra({ valor: v })} placeholder="ex: 5*nivel" />
        </div>
      )}
    </div>
  )
}

const MODOS_VIDA = [
  { value: 'nada', label: 'Não recupera' },
  { value: 'total', label: 'Total (cheia)' },
  { value: 'fixo', label: 'Quantidade fixa' },
  { value: 'fracao', label: 'Fração do máximo' },
  { value: 'dado', label: 'Dado/notação' },
]
const MODOS_VIDA_TEMP = [
  { value: 'manter', label: 'Mantém' },
  { value: 'zerar', label: 'Zera' },
]
const MODOS_RECURSOS = [
  { value: 'nada', label: 'Não recupera' },
  { value: 'total', label: 'Total (máximo)' },
  { value: 'parcial', label: 'Parcial (fração)' },
]

export default function DescansosEditor({ descansos = [], onChange }) {
  function add() {
    onChange([...descansos, novoDescanso()])
  }
  function update(idx, patch) {
    onChange(descansos.map((d, i) => (i === idx ? { ...d, ...patch } : d)))
  }
  function remove(idx) {
    onChange(descansos.filter((_, i) => i !== idx))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-purple-200">Tipos de descanso {descansos.length > 0 && `(${descansos.length})`}</p>
          <p className="text-purple-500 text-xs mt-0.5">Defina como cada descanso recupera vida e recursos. Sem descansos, a funcionalidade fica oculta.</p>
        </div>
        <button type="button" onClick={add} className="text-sm px-3 py-1.5 bg-purple-800 hover:bg-purple-700 text-white rounded-lg transition-colors shrink-0">
          + Adicionar descanso
        </button>
      </div>

      {descansos.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-purple-800 rounded-xl text-purple-500 text-sm">
          Nenhum descanso configurado. Ex: "Descanso Curto" (vida 1d8, recursos metade) e "Descanso Longo" (vida total, recursos total).
        </div>
      ) : (
        <div className="space-y-3">
          {descansos.map((d, i) => (
            <div key={d.id} className="bg-slate-800 border border-purple-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={d.nome}
                  onChange={e => update(i, { nome: e.target.value })}
                  placeholder="Nome do descanso (ex: Descanso Longo)"
                  className={`${inputCls} flex-1`}
                />
                <button type="button" onClick={() => remove(i)} className="text-red-800 hover:text-red-500 transition-colors shrink-0" title="Remover descanso">✕</button>
              </div>
              <div className="space-y-2 pl-1">
                <RegraEditor label="Vida" regra={d.vida} modos={MODOS_VIDA} onChange={r => update(i, { vida: r })} />
                <RegraEditor label="Vida temporária" regra={d.vida_temp} modos={MODOS_VIDA_TEMP} onChange={r => update(i, { vida_temp: r })} />
                <RegraEditor label="Recursos (habilidade)" regra={d.recursos_habilidade} modos={MODOS_RECURSOS} onChange={r => update(i, { recursos_habilidade: r })} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
