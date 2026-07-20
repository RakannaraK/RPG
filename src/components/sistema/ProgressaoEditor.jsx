import FormulaInput from './FormulaInput'
import { limiarNivel } from '../../lib/progressaoEngine'
import { custoCompra } from '../../lib/purchaseEngine'

const MODOS = [
  { id: 'nenhum', rotulo: 'Sem XP', dica: 'O mestre sobe o nível na mão' },
  { id: 'tabela', rotulo: 'Tabela', dica: 'XP acumulado por nível' },
  { id: 'formula', rotulo: 'Fórmula', dica: 'XP do nível N para o N+1' },
]

// 25.1 — MODO de progressão do sistema (excludente): F19 níveis | XP direto | nada
const MODOS_PROGRESSAO = [
  { id: 'nivel', rotulo: 'Por nível', dica: 'Níveis e level-up (F19) — o padrão de sempre' },
  { id: 'xp_direto', rotulo: 'XP direto', dica: 'Sem níveis: o XP compra melhorias diretamente' },
  { id: 'nenhum', rotulo: 'Nenhuma', dica: 'A ficha não exibe progressão' },
]

const ALVOS_COMPRA = [
  { id: 'atributo', nome: 'Atributo' },
  { id: 'pericia', nome: 'Perícia' },
  { id: 'linha_poder', nome: 'Linha de poder' },
  { id: 'trilha_tamanho_bonus', nome: 'Caixinhas extras de trilha' },
]

const INP = 'px-2 py-1.5 rounded-lg bg-purple-950 border border-purple-700 text-white text-xs placeholder-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-500'

function novoId() {
  return `cat_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`
}

// 25.1 — CRUD das categorias de compra do modo xp_direto
function CategoriasCompra({ categorias = [], onChange }) {
  const setCat = (i, patch) => onChange(categorias.map((c, j) => (j === i ? { ...c, ...patch } : c)))

  return (
    <div className="space-y-2">
      <p className="text-purple-400 text-xs">
        O que o XP compra e por quanto. A fórmula usa{' '}
        <span className="font-mono text-purple-300">novo_valor</span> = o valor APÓS a compra
        (ex: subir de 2 para 3 com "novo_valor * 5" custa 15).
      </p>
      {categorias.map((c, i) => {
        // prévia: custo do 2→3 (novo_valor = 3)
        let previa = null
        try { previa = custoCompra(c, 2) } catch { previa = null }
        return (
          <div key={c.id} className="rounded-lg border border-purple-900/50 bg-slate-900/40 p-2 space-y-1.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <input type="text" value={c.nome || ''} onChange={e => setCat(i, { nome: e.target.value })}
                placeholder="Nome (ex: Atributos)" className={`${INP} w-32 font-semibold`} />
              <select value={c.alvo || 'atributo'} onChange={e => setCat(i, { alvo: e.target.value })} className={INP}>
                {ALVOS_COMPRA.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
              </select>
              <label className="text-purple-400 text-[11px] flex items-center gap-1">máx
                <input type="number" min={1} value={c.maximo ?? ''} onChange={e => setCat(i, { maximo: e.target.value === '' ? null : Number(e.target.value) })}
                  placeholder="—" className={`${INP} w-14 text-center`} /></label>
              <button onClick={() => onChange(categorias.filter((_, j) => j !== i))}
                className="ml-auto w-5 h-5 flex items-center justify-center text-purple-500 hover:text-red-400 transition-colors">×</button>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex-1 min-w-[10rem]">
                <FormulaInput value={c.custo_formula || ''} onChange={f => setCat(i, { custo_formula: f })}
                  placeholder="custo: ex novo_valor * 5" variaveis={['novo_valor', ' * ', ' + ']} />
              </div>
              {previa != null && (
                <span className="text-purple-500 text-[11px] shrink-0">prévia 2→3: <span className="text-green-400 font-mono">{previa} XP</span></span>
              )}
            </div>
            {c.alvo === 'linha_poder' && (
              <div className="flex-1">
                <FormulaInput value={c.custo_formula_fora || ''} onChange={f => setCat(i, { custo_formula_fora: f })}
                  placeholder="custo FORA das linhas nativas (opcional): ex novo_valor * 7" variaveis={['novo_valor', ' * ']} />
              </div>
            )}
          </div>
        )
      })}
      <button onClick={() => onChange([...categorias, { id: novoId(), nome: '', alvo: 'atributo', custo_formula: '', maximo: 5 }])}
        className="text-[11px] px-2 py-0.5 rounded-lg border border-dashed border-purple-700 text-purple-300 hover:text-white hover:border-purple-500 transition-colors">
        + categoria de compra
      </button>
    </div>
  )
}

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
export default function ProgressaoEditor({ progressao, onChange, modoProgressao = null, onModoChange = null }) {
  const prog = progressao || { modo: 'nenhum', tabela: [], formula: '' }
  const modo = prog.modo || 'nenhum'
  // 25.1 — modo unificado ('nivel' = F19 com a curva abaixo)
  const mp = modoProgressao || { modo: 'nivel', categorias_compra: [] }
  const modoGeral = mp.modo || 'nivel'

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

      {/* 25.1 — modo unificado (excludente por sistema) */}
      {onModoChange && (
        <>
          <div className="flex gap-2 flex-wrap">
            {MODOS_PROGRESSAO.map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => onModoChange({ ...mp, modo: m.id })}
                title={m.dica}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                  modoGeral === m.id
                    ? 'bg-purple-700 border-purple-500 text-white'
                    : 'bg-purple-950 border-purple-800 text-purple-300 hover:text-white hover:border-purple-600'
                }`}
              >
                {m.rotulo}
              </button>
            ))}
          </div>
          <p className="text-purple-600 text-[11px]">
            {MODOS_PROGRESSAO.find(m => m.id === modoGeral)?.dica}. Os modos são excludentes — um por sistema.
          </p>
        </>
      )}

      {/* XP direto (25.1): categorias de compra */}
      {onModoChange && modoGeral === 'xp_direto' && (
        <CategoriasCompra
          categorias={mp.categorias_compra || []}
          onChange={cats => onModoChange({ ...mp, categorias_compra: cats })}
        />
      )}
      {onModoChange && modoGeral === 'nenhum' && (
        <p className="text-purple-600 text-xs">A ficha não exibe nível, XP nem progressão.</p>
      )}

      {/* Por nível (F19): a curva de sempre */}
      {(!onModoChange || modoGeral === 'nivel') && (
        <>
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
        </>
      )}
    </div>
  )
}
