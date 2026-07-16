import FormulaInput from './FormulaInput'

const INP = 'px-2 py-1.5 rounded-lg bg-purple-950 border border-purple-700 text-white text-xs placeholder-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-500'

function novoId(prefixo) {
  return `${prefixo}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`
}

const TRILHA_NOVA = () => ({
  id: novoId('trilha'),
  nome: '',
  tamanho_formula: '10',
  tipos_marca: [
    { id: novoId('tm'), nome: 'Superficial', simbolo: '/', severidade: 1 },
    { id: novoId('tm'), nome: 'Agravado', simbolo: 'X', severidade: 2 },
  ],
  regra_transbordo: 'converter',
  ao_encher_do_maior: { rotulo: '', descricao: '', aplica_condicao: false },
  substitui_vida: false,
  recuperacao: {},
  feed: true, // anuncia marcações relevantes no feed
})

/**
 * Fase 24.2 — trilhas do sistema (config_layout.trilhas). Caixinhas com tipos
 * de marca por severidade; tamanho por fórmula (F17); transbordo; efeito ao
 * encher; recuperação por descanso (F15). Nomes/símbolos são do mestre.
 */
export default function TrilhasEditor({ trilhas = [], descansos = [], onChange }) {
  const setTrilha = (i, patch) => onChange(trilhas.map((t, j) => (j === i ? { ...t, ...patch } : t)))

  return (
    <div className="bg-slate-800 border border-purple-700 rounded-xl p-4 space-y-3">
      <div>
        <p className="text-purple-200 text-sm font-semibold">Trilhas (caixinhas)</p>
        <p className="text-purple-500 text-xs mt-0.5">
          Recursos como linha de caixinhas com tipos de marca (ex: dano superficial <span className="font-mono">/</span> e
          agravado <span className="font-mono">X</span>; sanidade; relógios). Marca mais severa sobrescreve a menos severa.
        </p>
      </div>

      {trilhas.map((t, i) => {
        const enc = t.ao_encher_do_maior || {}
        const setEnc = patch => setTrilha(i, { ao_encher_do_maior: { ...enc, ...patch } })
        const setTipo = (k, patch) => setTrilha(i, { tipos_marca: (t.tipos_marca || []).map((tm, j) => (j === k ? { ...tm, ...patch } : tm)) })
        const rec = t.recuperacao || {}
        const setRec = (descansoId, tipoId, patch) => setTrilha(i, {
          recuperacao: { ...rec, [descansoId]: { ...(rec[descansoId] || {}), [tipoId]: { ...((rec[descansoId] || {})[tipoId] || {}), ...patch } } },
        })

        return (
          <div key={t.id} className="rounded-xl border border-purple-900/60 bg-slate-900/40 p-3 space-y-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <input type="text" value={t.nome || ''} onChange={e => setTrilha(i, { nome: e.target.value })}
                placeholder="Nome (ex: Vitalidade)" className={`${INP} w-40 font-semibold`} />
              <div className="flex-1 min-w-[10rem]">
                <FormulaInput value={t.tamanho_formula || ''} onChange={f => setTrilha(i, { tamanho_formula: f })}
                  placeholder="tamanho: 10 ou 3 + atributo(vigor)" variaveis={['atributo(', 'nivel', ' + ']} />
              </div>
              <button onClick={() => onChange(trilhas.filter((_, j) => j !== i))}
                className="w-6 h-6 flex items-center justify-center text-purple-500 hover:text-red-400 transition-colors shrink-0">✕</button>
            </div>

            {/* Tipos de marca */}
            <div className="space-y-1">
              <p className="text-purple-400 text-[11px]">Tipos de marca (severidade maior sobrescreve menor)</p>
              {(t.tipos_marca || []).map((tm, k) => (
                <div key={tm.id} className="flex items-center gap-1.5 flex-wrap">
                  <input type="text" value={tm.nome || ''} onChange={e => setTipo(k, { nome: e.target.value })}
                    placeholder="Superficial" className={`${INP} w-28`} />
                  <label className="text-purple-500 text-[11px] flex items-center gap-1">símbolo
                    <input type="text" maxLength={2} value={tm.simbolo || ''} onChange={e => setTipo(k, { simbolo: e.target.value })}
                      placeholder="/" className={`${INP} w-10 text-center font-mono`} /></label>
                  <label className="text-purple-500 text-[11px] flex items-center gap-1">severidade
                    <input type="number" min={1} value={tm.severidade ?? 1} onChange={e => setTipo(k, { severidade: Number(e.target.value) })}
                      className={`${INP} w-14 text-center`} /></label>
                  <button onClick={() => setTrilha(i, { tipos_marca: t.tipos_marca.filter((_, j) => j !== k) })}
                    className="w-5 h-5 flex items-center justify-center text-purple-500 hover:text-red-400 transition-colors">×</button>
                </div>
              ))}
              <button onClick={() => setTrilha(i, { tipos_marca: [...(t.tipos_marca || []), { id: novoId('tm'), nome: '', simbolo: '', severidade: (t.tipos_marca?.length || 0) + 1 }] })}
                className="text-[11px] px-2 py-0.5 rounded-lg border border-dashed border-purple-700 text-purple-300 hover:text-white hover:border-purple-500 transition-colors">+ tipo</button>
            </div>

            {/* Comportamento */}
            <div className="flex items-center gap-3 flex-wrap">
              <label className="text-purple-300 text-[11px] flex items-center gap-1">trilha cheia:
                <select value={t.regra_transbordo || 'converter'} onChange={e => setTrilha(i, { regra_transbordo: e.target.value })} className={INP}>
                  <option value="converter">converter (marca antiga sobe de tipo)</option>
                  <option value="ignorar">ignorar (não marca além)</option>
                </select>
              </label>
              <label className="text-purple-300 text-[11px] flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={!!t.substitui_vida} onChange={e => setTrilha(i, { substitui_vida: e.target.checked })} className="accent-purple-500" />
                esta trilha É a vida (esconde o HP numérico)
              </label>
              <label className="text-purple-300 text-[11px] flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={t.feed !== false} onChange={e => setTrilha(i, { feed: e.target.checked })} className="accent-purple-500" />
                anunciar no feed
              </label>
            </div>

            {/* Ao encher do tipo mais severo */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-purple-400 text-[11px]">cheia do tipo mais severo:</span>
              <input type="text" value={enc.rotulo || ''} onChange={e => setEnc({ rotulo: e.target.value })}
                placeholder="rótulo (ex: Incapacitado)" className={`${INP} w-36`} />
              <input type="text" value={enc.descricao || ''} onChange={e => setEnc({ descricao: e.target.value })}
                placeholder="descrição (opcional)" className={`${INP} flex-1 min-w-[8rem]`} />
              <label className="text-purple-400 text-[11px] flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked={!!enc.aplica_condicao} onChange={e => setEnc({ aplica_condicao: e.target.checked })} className="accent-purple-500" />
                vira condição
              </label>
            </div>

            {/* Recuperação por descanso (F15) */}
            {descansos.length > 0 && (t.tipos_marca || []).length > 0 && (
              <div className="space-y-1 border-t border-purple-900/50 pt-2">
                <p className="text-purple-400 text-[11px]">Recuperação por descanso</p>
                {descansos.map(d => (
                  <div key={d.id} className="flex items-center gap-2 flex-wrap">
                    <span className="text-purple-500 text-[11px] w-24 truncate" title={d.nome}>{d.nome}:</span>
                    {(t.tipos_marca || []).map(tm => {
                      const regra = (rec[d.id] || {})[tm.id] || { modo: 'nada' }
                      return (
                        <label key={tm.id} className="text-purple-400 text-[11px] flex items-center gap-1">
                          {tm.nome || tm.simbolo}
                          <select value={regra.modo || 'nada'} onChange={e => setRec(d.id, tm.id, { modo: e.target.value })} className={INP}>
                            <option value="nada">nada</option>
                            <option value="total">total</option>
                            <option value="fixo">fixo</option>
                          </select>
                          {regra.modo === 'fixo' && (
                            <input type="number" min={0} value={regra.valor ?? 1} onChange={e => setRec(d.id, tm.id, { valor: Number(e.target.value) })}
                              className={`${INP} w-12 text-center`} />
                          )}
                        </label>
                      )
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}

      <button onClick={() => onChange([...trilhas, TRILHA_NOVA()])}
        className="text-xs px-3 py-1.5 rounded-lg border border-dashed border-purple-700 text-purple-300 hover:text-white hover:border-purple-500 transition-colors">
        + Adicionar trilha
      </button>
    </div>
  )
}
