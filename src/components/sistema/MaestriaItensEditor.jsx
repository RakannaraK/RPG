import { useState } from 'react'
import FormulaInput from './FormulaInput'
import { useCategorias } from '../../hooks/useCategorias'

const INP = 'px-2 py-1.5 rounded-lg bg-purple-950 border border-purple-700 text-white text-xs placeholder-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-500'

// "100, 300, 600" → [100, 300, 600]
function parseTabela(texto) {
  return String(texto || '')
    .split(/[\s,;]+/)
    .filter(Boolean)
    .map(Number)
    .filter(n => Number.isFinite(n))
}

/** CRUD das categorias de item do sistema. */
function CategoriasEditor({ sistemaId }) {
  const { categorias, criarCategoria, atualizarCategoria, removerCategoria } = useCategorias(sistemaId)
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [erro, setErro] = useState('')

  async function adicionar() {
    setErro('')
    if (!nome.trim()) { setErro('Informe o nome da categoria.'); return }
    try {
      await criarCategoria({ nome, descricao })
      setNome(''); setDescricao('')
    } catch (e) { setErro(e.message || 'Erro ao criar categoria.') }
  }

  return (
    <div className="space-y-2">
      <p className="text-purple-400 text-xs">
        Categorias de arma/item para agrupar a maestria — "Machados", "Arcos", "Ferramentas".
      </p>
      {categorias.length > 0 && (
        <div className="space-y-1.5">
          {categorias.map(c => (
            <div key={c.id} className="flex items-center gap-2 bg-purple-950/40 border border-purple-800 rounded-lg px-2.5 py-1.5">
              <input
                type="text"
                defaultValue={c.nome}
                onBlur={e => { if (e.target.value.trim() && e.target.value !== c.nome) atualizarCategoria(c.id, { nome: e.target.value }).catch(er => setErro(er.message)) }}
                className={`${INP} w-40`}
              />
              <input
                type="text"
                defaultValue={c.descricao || ''}
                onBlur={e => { if ((e.target.value || '') !== (c.descricao || '')) atualizarCategoria(c.id, { descricao: e.target.value }).catch(er => setErro(er.message)) }}
                placeholder="Descrição (opcional)"
                className={`${INP} flex-1 min-w-[8rem]`}
              />
              <button
                onClick={() => removerCategoria(c.id).catch(e => setErro(e.message))}
                className="w-5 h-5 flex items-center justify-center text-purple-500 hover:text-red-400 transition-colors shrink-0"
                title="Remover categoria"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2 flex-wrap">
        <input type="text" value={nome} onChange={e => setNome(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') adicionar() }}
          placeholder="Nova categoria (ex: Machados)" className={`${INP} flex-1 min-w-[10rem]`} />
        <input type="text" value={descricao} onChange={e => setDescricao(e.target.value)}
          placeholder="Descrição" className={`${INP} w-40`} />
        <button onClick={adicionar}
          className="px-3 py-1.5 bg-purple-700 hover:bg-purple-600 text-white text-xs rounded-lg transition-colors">
          + Adicionar
        </button>
      </div>
      {erro && <p className="text-red-400 text-xs">{erro}</p>}
    </div>
  )
}

/** Botões de ganho de XP de um clique (rótulo + valor). */
function GanhosEditor({ ganhos = [], onChange }) {
  function set(i, patch) { onChange(ganhos.map((g, j) => (j === i ? { ...g, ...patch } : g))) }
  return (
    <div className="space-y-1.5">
      {ganhos.map((g, i) => (
        <div key={i} className="flex items-center gap-2">
          <input type="text" value={g.rotulo ?? ''} onChange={e => set(i, { rotulo: e.target.value })}
            placeholder="Rótulo (ex: Inimigo mais forte)" className={`${INP} flex-1 min-w-[10rem]`} />
          <span className="text-purple-500 text-[11px]">+</span>
          <input type="number" value={g.xp ?? ''} onChange={e => set(i, { xp: Number(e.target.value) })}
            placeholder="XP" className={`${INP} w-16 text-center`} />
          <button onClick={() => onChange(ganhos.filter((_, j) => j !== i))}
            className="w-5 h-5 flex items-center justify-center text-purple-500 hover:text-red-400 transition-colors">×</button>
        </div>
      ))}
      <button onClick={() => onChange([...ganhos, { rotulo: '', xp: 10 }])}
        className="text-[11px] px-2 py-0.5 rounded-lg border border-dashed border-purple-700 text-purple-300 hover:text-white hover:border-purple-500 transition-colors">
        + botão de ganho
      </button>
      {ganhos.length === 0 && <p className="text-purple-600 text-[11px]">Nenhum botão rápido — o ganho fica só no campo manual.</p>}
    </div>
  )
}

/**
 * Fase 21.1 — configuração de maestria por uso + categorias de item.
 * A config vive em config_layout.maestria. O cálculo XP→nível é da 21.2
 * (masteryEngine); aqui só editamos os parâmetros.
 */
export default function MaestriaItensEditor({ sistemaId, config, onChange }) {
  const m = config?.maestria || {}
  const curva = m.curva || { modo: 'formula', formula: '', tabela: [] }
  const bonus = m.bonus_por_nivel || { acerto_percentual: 0, efeito_percentual: 0 }

  const set = patch => onChange({ ...config, maestria: { ...m, ...patch } })
  const setCurva = patch => set({ curva: { ...curva, ...patch } })
  const setBonus = patch => set({ bonus_por_nivel: { ...bonus, ...patch } })

  return (
    <div className="space-y-4">
      {/* Maestria */}
      <div className="bg-slate-800 border border-purple-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-purple-200 text-sm font-semibold">Maestria por uso</p>
          <label className="text-purple-300 text-xs flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={!!m.ativo} onChange={e => set({ ativo: e.target.checked })} className="accent-purple-500" />
            ativar
          </label>
        </div>
        <p className="text-purple-500 text-xs">
          Armas/ferramentas acumulam XP próprio ao serem usadas; níveis dão bônus percentuais
          (via a mesma ordem de operações da F18) e desbloqueiam propriedades. Sistemas sem maestria
          não mostram nada na ficha.
        </p>

        {!m.ativo ? (
          <p className="text-purple-600 text-xs">Desativada.</p>
        ) : (
          <>
            {/* Escopo */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-purple-400 text-xs">A maestria é por</span>
              <select value={m.escopo || 'categoria'} onChange={e => set({ escopo: e.target.value })} className={INP}>
                <option value="categoria">Categoria (ex: todos os Machados)</option>
                <option value="item">Item individual</option>
              </select>
            </div>

            {/* Curva */}
            <div className="space-y-1.5 border-t border-purple-900/50 pt-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-purple-400 text-xs">Curva de XP</span>
                <select value={curva.modo} onChange={e => setCurva({ modo: e.target.value })} className={INP}>
                  <option value="formula">Fórmula</option>
                  <option value="tabela">Tabela</option>
                </select>
              </div>
              {curva.modo === 'formula' ? (
                <>
                  <FormulaInput
                    value={curva.formula || ''}
                    onChange={f => setCurva({ formula: f })}
                    placeholder="ex: 100 * proximo_nivel"
                    presets={[{ label: '100 × proximo_nivel', valor: '100 * proximo_nivel' }]}
                    variaveis={['proximo_nivel', 'piso(']}
                  />
                  <p className="text-purple-600 text-[11px]">
                    XP para ir ao nível <span className="font-mono">proximo_nivel</span> — que vale 1, 2, 3…
                    Ex.: "100 × proximo_nivel" custa 100 p/ o nv1, 200 p/ o nv2, 300 p/ o nv3.
                  </p>
                </>
              ) : (
                <>
                  <textarea
                    rows={2}
                    value={(curva.tabela || []).join(', ')}
                    onChange={e => setCurva({ tabela: parseTabela(e.target.value) })}
                    placeholder="100, 200, 300, 400"
                    spellCheck={false}
                    className={`${INP} w-full font-mono`}
                  />
                  <p className="text-purple-600 text-[11px]">
                    Custo de CADA nível, em ordem (nv1, nv2, nv3…). {(curva.tabela || []).length} definido(s).
                  </p>
                </>
              )}
            </div>

            {/* Bônus por nível */}
            <div className="flex items-center gap-3 flex-wrap border-t border-purple-900/50 pt-2">
              <span className="text-purple-400 text-xs">Bônus por nível de maestria</span>
              <label className="text-purple-400 text-[11px] flex items-center gap-1">
                acerto
                <input type="number" value={bonus.acerto_percentual ?? 0}
                  onChange={e => setBonus({ acerto_percentual: Number(e.target.value) })}
                  className={`${INP} w-14 text-center`} />%
              </label>
              <label className="text-purple-400 text-[11px] flex items-center gap-1">
                efeito
                <input type="number" value={bonus.efeito_percentual ?? 0}
                  onChange={e => setBonus({ efeito_percentual: Number(e.target.value) })}
                  className={`${INP} w-14 text-center`} />%
              </label>
              <span className="text-purple-600 text-[11px]">× nível, somados como percentual (F18).</span>
            </div>

            {/* Ganhos padrão */}
            <div className="border-t border-purple-900/50 pt-2">
              <p className="text-purple-400 text-xs mb-1.5">Botões de ganho rápido (o mestre nomeia)</p>
              <GanhosEditor ganhos={m.ganhos_padrao || []} onChange={g => set({ ganhos_padrao: g })} />
            </div>
          </>
        )}
      </div>

      {/* Categorias */}
      <div className="bg-slate-800 border border-purple-800 rounded-xl p-4 space-y-3">
        <p className="text-purple-200 text-sm font-semibold">Categorias de item</p>
        <CategoriasEditor sistemaId={sistemaId} />
      </div>
    </div>
  )
}
