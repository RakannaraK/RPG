import { useState } from 'react'
import { usePools } from '../../hooks/usePools'
import { validarFormula } from '../../lib/formulaEngine'
import { maximoPool } from '../../lib/poolEngine'
import FormulaInput from './FormulaInput'

const INP = 'px-2 py-1.5 rounded-lg bg-purple-950 border border-purple-700 text-white text-xs placeholder-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-500'

const MODOS = [
  { id: 'nada', label: 'Nada' },
  { id: 'total', label: 'Enche' },
  { id: 'parcial', label: 'Fração do máximo' },
  { id: 'fixo', label: 'Valor fixo' },
]

// Contexto de exemplo p/ a prévia do máximo (nível 5, atributos 10)
const CTX_EXEMPLO = { nivel: 5, niveisClasse: {}, atributos: {}, pericias: {}, recursos: {}, pools: {} }

/** Recuperação de um pool em cada tipo de descanso (F15). */
function RecuperacaoEditor({ descansos, recuperacao, onChange }) {
  if (!descansos.length) {
    return <p className="text-purple-600 text-[11px]">Configure os descansos para definir a recuperação.</p>
  }
  const rec = recuperacao || {}
  function set(descId, patch) {
    onChange({ ...rec, [descId]: { ...(rec[descId] || { modo: 'nada' }), ...patch } })
  }
  return (
    <div className="space-y-1.5">
      {descansos.map(d => {
        const r = rec[d.id] || { modo: 'nada' }
        return (
          <div key={d.id} className="flex items-center gap-2 flex-wrap">
            <span className="text-purple-400 text-[11px] w-24 shrink-0 truncate">{d.nome || 'Descanso'}</span>
            <select value={r.modo} onChange={e => set(d.id, { modo: e.target.value })} className={INP}>
              {MODOS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
            {r.modo === 'parcial' && (
              <input type="number" step="0.1" min="0" max="1" value={r.valor ?? ''}
                onChange={e => set(d.id, { valor: e.target.value })}
                placeholder="0.5" className={`${INP} w-16 text-center`} title="Fração do máximo (0.5 = metade)" />
            )}
            {r.modo === 'fixo' && (
              <input type="text" value={r.valor ?? ''}
                onChange={e => set(d.id, { valor: e.target.value })}
                placeholder="3 ou nivel" className={`${INP} w-24 font-mono`} />
            )}
            {r.modo === 'fixo' && (
              <label className="text-purple-400 text-[11px] flex items-center gap-1 cursor-pointer" title="Tratar o valor como fórmula">
                <input type="checkbox" checked={!!r.valor_e_formula}
                  onChange={e => set(d.id, { valor_e_formula: e.target.checked })}
                  className="accent-purple-500" />
                ƒ
              </label>
            )}
          </div>
        )
      })}
    </div>
  )
}

/**
 * Fase 20.1 — CRUD dos pools do sistema.
 * Genérico: o mestre nomeia o pool e escreve a fórmula do máximo.
 * O máximo NUNCA é armazenado — é derivado da fórmula no contexto da ficha.
 */
export default function PoolsEditor({ sistemaId, descansos = [] }) {
  const { pools, criarPool, atualizarPool, removerPool } = usePools(sistemaId)
  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState('pontos')
  const [dado, setDado] = useState('d12')
  const [formula, setFormula] = useState('')
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [expandido, setExpandido] = useState(null)

  // Prévia do máximo com o contexto de exemplo (só se a fórmula for válida)
  let previa = null
  if (formula.trim() && validarFormula(formula).valida) {
    try { previa = maximoPool({ maximo_formula: formula }, CTX_EXEMPLO) } catch { previa = null }
  }

  async function handleCriar() {
    setErro('')
    if (!nome.trim()) { setErro('Informe o nome do recurso.'); return }
    if (!formula.trim()) { setErro('Informe a fórmula do máximo.'); return }
    const v = validarFormula(formula)
    if (!v.valida) { setErro(`Fórmula inválida: ${v.erro}`); return }
    if (tipo === 'dados' && !dado.trim()) { setErro('Informe o dado (ex: d12).'); return }
    setSalvando(true)
    try {
      await criarPool({ nome, tipo, dado, maximo_formula: formula, visivel_ficha: true })
      setNome(''); setFormula(''); setTipo('pontos'); setDado('d12')
    } catch (e) {
      setErro(e.message || 'Erro ao criar recurso.')
    } finally {
      setSalvando(false)
    }
  }

  if (!sistemaId) return null

  return (
    <div className="bg-slate-800 border border-purple-800 rounded-xl p-4 space-y-3">
      <p className="text-purple-200 text-sm font-semibold">Recursos (pools)</p>
      <p className="text-purple-500 text-xs">
        Recursos gastáveis com máximo por fórmula — "Thariuns", "Pontos de Foco", "Reserva Divina".
        O máximo é <span className="text-purple-300">sempre recalculado</span> (nunca guardado), então
        acompanha nível e atributos. Nas fórmulas dá pra usar{' '}
        <span className="font-mono text-purple-300">nivel</span>,{' '}
        <span className="font-mono text-purple-300">nivel(classe)</span>,{' '}
        <span className="font-mono text-purple-300">atributo()</span> e{' '}
        <span className="font-mono text-purple-300">proficiencia</span>.
      </p>

      {pools.length > 0 && (
        <div className="space-y-1.5">
          {pools.map(p => (
            <div key={p.id} className="bg-purple-950/40 border border-purple-800 rounded-lg px-2.5 py-1.5">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setExpandido(expandido === p.id ? null : p.id)}
                  className="text-purple-500 hover:text-white text-xs shrink-0 w-4"
                  title="Recuperação por descanso"
                >
                  {expandido === p.id ? '▾' : '▸'}
                </button>
                <span className="text-white text-xs font-medium min-w-0 flex-1 truncate">
                  {p.nome}
                  <span className="text-purple-500 font-mono ml-1.5">
                    {p.tipo === 'dados' ? `${p.dado} · ` : ''}máx = {p.maximo_formula}
                  </span>
                </span>
                <label className="text-purple-400 text-[11px] flex items-center gap-1 cursor-pointer shrink-0" title="Mostrar na ficha">
                  <input type="checkbox" checked={p.visivel_ficha !== false}
                    onChange={e => atualizarPool(p.id, { visivel_ficha: e.target.checked }).catch(er => setErro(er.message))}
                    className="accent-purple-500" />
                  ficha
                </label>
                <button
                  onClick={() => removerPool(p.id).catch(er => setErro(er.message))}
                  className="w-5 h-5 flex items-center justify-center text-purple-500 hover:text-red-400 transition-colors shrink-0"
                  title="Remover recurso"
                >
                  ×
                </button>
              </div>
              {expandido === p.id && (
                <div className="mt-2 pt-2 border-t border-purple-900/60 pl-6">
                  <p className="text-purple-400 text-[11px] mb-1.5">Recuperação por descanso</p>
                  <RecuperacaoEditor
                    descansos={descansos}
                    recuperacao={p.recuperacao}
                    onChange={rec => atualizarPool(p.id, { recuperacao: rec }).catch(er => setErro(er.message))}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-purple-900/50 pt-2 space-y-2">
        <div className="flex flex-wrap gap-2 items-center">
          <input type="text" value={nome} onChange={e => setNome(e.target.value)}
            placeholder="Nome (ex: Thariuns)" className={`${INP} flex-1 min-w-[10rem]`} />
          <select value={tipo} onChange={e => setTipo(e.target.value)} className={INP}>
            <option value="pontos">Pontos</option>
            <option value="dados">Dados</option>
          </select>
          {tipo === 'dados' && (
            <input type="text" value={dado} onChange={e => setDado(e.target.value)}
              placeholder="d12" className={`${INP} w-16 text-center font-mono`} />
          )}
          <button onClick={handleCriar} disabled={salvando}
            className="px-3 py-1.5 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white text-xs rounded-lg transition-colors">
            {salvando ? '...' : '+ Adicionar'}
          </button>
        </div>

        <div>
          <label className="text-purple-400 text-xs block mb-1">
            Máximo {tipo === 'dados' ? '(quantos dados)' : '(quantos pontos)'}
          </label>
          <FormulaInput
            value={formula}
            onChange={setFormula}
            placeholder="ex: 2 * nivel"
            presets={[
              { label: '2 × nivel', valor: '2 * nivel' },
              { label: '4 + piso(nivel/6)', valor: '4 + piso(nivel / 6)' },
            ]}
            variaveis={['nivel', 'nivel(', 'atributo(', 'proficiencia', 'piso(']}
          />
          {previa != null && (
            <p className="text-purple-600 text-[11px] mt-1">
              Prévia (nível 5, atributos 10): <span className="font-mono text-purple-400">{previa}</span>
            </p>
          )}
        </div>
      </div>

      {erro && <p className="text-red-400 text-xs">{erro}</p>}
    </div>
  )
}
