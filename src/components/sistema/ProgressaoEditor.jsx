import FormulaInput from './FormulaInput'
import { limiarNivel } from '../../lib/progressaoEngine'

const MODOS = [
  { id: 'nenhum', rotulo: 'Sem XP', dica: 'O mestre sobe o nível na mão' },
  { id: 'tabela', rotulo: 'Tabela', dica: 'XP acumulado por nível' },
  { id: 'formula', rotulo: 'Fórmula', dica: 'XP do nível N para o N+1' },
]

// "0, 300, 900" ou uma por linha → [0, 300, 900]
function parseTabela(texto) {
  return String(texto || '')
    .split(/[\s,;]+/)
    .filter(Boolean)
    .map(Number)
    .filter(n => Number.isFinite(n))
}

/**
 * Fase 19.3 — curva de progressão do sistema (config_layout.progressao_xp).
 * Prévia ao vivo dos limiares dos primeiros níveis; erro de fórmula é exibido.
 */
export default function ProgressaoEditor({ progressao, onChange }) {
  const prog = progressao || { modo: 'nenhum', tabela: [], formula: '' }
  const modo = prog.modo || 'nenhum'

  function setModo(m) {
    onChange({ ...prog, modo: m })
  }

  // Prévia: XP acumulado para chegar aos níveis 2..6
  let previa = null
  let erroPrevia = ''
  if (modo !== 'nenhum') {
    try {
      previa = [2, 3, 4, 5, 6]
        .map(n => ({ nivel: n, xp: limiarNivel(n, prog) }))
        .filter(p => p.xp != null)
    } catch (e) {
      erroPrevia = e.message || 'Fórmula inválida'
    }
  }

  return (
    <div className="bg-slate-800 border border-purple-800 rounded-xl p-4 space-y-3">
      <p className="text-purple-200 text-sm font-semibold">Progressão</p>
      <p className="text-purple-500 text-xs">
        Como o personagem sobe de nível. Subir de nível é sempre{' '}
        <span className="text-purple-300">manual e confirmado</span> — o XP só avisa quando dá.
      </p>

      <div className="flex gap-2 flex-wrap">
        {MODOS.map(m => (
          <button
            key={m.id}
            type="button"
            onClick={() => setModo(m.id)}
            title={m.dica}
            className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
              modo === m.id
                ? 'bg-purple-700 border-purple-500 text-white'
                : 'bg-purple-950 border-purple-800 text-purple-300 hover:text-white hover:border-purple-600'
            }`}
          >
            {m.rotulo}
          </button>
        ))}
      </div>

      {modo === 'nenhum' && (
        <p className="text-purple-600 text-xs">
          Sistema sem XP. A ficha mostra só o botão de subir de nível, sem barra de progresso.
        </p>
      )}

      {modo === 'tabela' && (
        <div className="space-y-1.5">
          <label className="text-purple-400 text-xs block">
            XP acumulado de cada nível, do 1 em diante (o nível 1 é sempre 0)
          </label>
          <textarea
            rows={3}
            value={(prog.tabela || []).join(', ')}
            onChange={e => onChange({ ...prog, tabela: parseTabela(e.target.value) })}
            placeholder="0, 300, 900, 2700, 6500"
            spellCheck={false}
            className="w-full px-3 py-2 rounded-lg bg-purple-950 border border-purple-700 text-white text-sm font-mono placeholder-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <p className="text-purple-600 text-xs">
            Separe por vírgula ou espaço. {(prog.tabela || []).length} nível(is) definido(s).
            Acima do último, não há próximo nível.
          </p>
        </div>
      )}

      {modo === 'formula' && (
        <div className="space-y-1.5">
          <label className="text-purple-400 text-xs block">
            XP para sair do nível <span className="font-mono text-purple-300">nivel</span> e chegar ao seguinte
          </label>
          <FormulaInput
            value={prog.formula || ''}
            onChange={f => onChange({ ...prog, formula: f })}
            placeholder="ex: 100 + (nivel - 1) * 200"
            presets={[{ label: '100 + (nivel−1) × 200', valor: '100 + (nivel - 1) * 200' }]}
            variaveis={['nivel']}
          />
        </div>
      )}

      {erroPrevia && <p className="text-red-400 text-xs">⚠ {erroPrevia}</p>}

      {previa && previa.length > 0 && !erroPrevia && (
        <div className="text-xs text-purple-500 border-t border-purple-900 pt-2">
          <span className="text-purple-400 font-semibold">Prévia (XP acumulado):</span>{' '}
          {previa.map(p => (
            <span key={p.nivel} className="font-mono mr-2">
              nv{p.nivel}={p.xp.toLocaleString('pt-BR')}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
