import { useState } from 'react'
import { validarTabela, resultadosSemEntrada, entradaPara } from '../../lib/tabelasEngine'
import { rolarNotacao } from '../../lib/diceNotation'

const INP = 'px-2 py-1.5 rounded-lg bg-void border border-border text-white text-sm placeholder-ink-dim focus:outline-none focus:ring-1 focus:ring-purple-500'

function novaTabela() {
  return {
    id: `t_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    nome: '',
    notacao: '1d6',
    entradas: [{ de: 1, ate: 6, texto: '' }],
  }
}

/**
 * Editor de tabelas do mestre. Cada tabela vira uma rolagem com resultado em
 * texto — serve para rumores, loot, encontros e oráculos.
 */
export default function TabelasEditor({ tabelas = [], onChange }) {
  const [previa, setPrevia] = useState({})

  const set = (i, patch) => onChange(tabelas.map((t, idx) => (idx === i ? { ...t, ...patch } : t)))
  const setEntrada = (i, j, patch) =>
    set(i, { entradas: tabelas[i].entradas.map((e, idx) => (idx === j ? { ...e, ...patch } : e)) })

  function rolar(i) {
    const t = tabelas[i]
    try {
      const r = rolarNotacao(t.notacao)
      const e = entradaPara(t, r.total)
      setPrevia(p => ({ ...p, [t.id]: { valor: r.total, texto: e ? e.texto : '(sem entrada para esse resultado)' } }))
    } catch {
      setPrevia(p => ({ ...p, [t.id]: { valor: null, texto: 'Notação inválida.' } }))
    }
  }

  return (
    <div className="bg-slate-800 border border-purple-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-purple-200 text-sm font-semibold">Tabelas do mestre</p>
        <button
          type="button"
          onClick={() => onChange([...tabelas, novaTabela()])}
          className="text-xs px-3 py-1.5 bg-purple-800 hover:bg-purple-700 text-white rounded-lg transition-colors"
        >
          + Nova tabela
        </button>
      </div>
      <p className="text-accent-300 text-xs">
        Rumores, loot, encontros, oráculos... O mestre rola e o resultado sai em texto.
        Opcional — sem tabelas, nada aparece.
      </p>

      {tabelas.length === 0 && (
        <p className="text-accent-300 text-xs italic">Nenhuma tabela ainda.</p>
      )}

      {tabelas.map((t, i) => {
        const check = validarTabela(t)
        const buracos = resultadosSemEntrada(t)
        const p = previa[t.id]
        return (
          <div key={t.id} className="rounded-lg border border-purple-900/60 bg-slate-900/40 p-3 space-y-2">
            <div className="flex gap-2 flex-wrap items-center">
              <input
                type="text" value={t.nome} onChange={e => set(i, { nome: e.target.value })}
                placeholder="Nome da tabela (ex: Rumores da taverna)" className={`${INP} flex-1 min-w-[12rem]`}
              />
              <input
                type="text" value={t.notacao} onChange={e => set(i, { notacao: e.target.value })}
                placeholder="1d6" className={`${INP} w-20 font-mono text-center`}
              />
              <button
                type="button" onClick={() => rolar(i)}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-amber-800 hover:bg-amber-700 text-white transition-colors"
              >🎲 Testar</button>
              <button
                type="button" onClick={() => onChange(tabelas.filter((_, idx) => idx !== i))}
                className="text-red-800 hover:text-red-500 transition-colors px-1"
                title="Remover tabela"
              >✕</button>
            </div>

            {p && (
              <p className="text-amber-300 text-xs">
                {p.valor != null && <span className="font-mono">[{p.valor}] </span>}{p.texto}
              </p>
            )}

            <div className="space-y-1.5">
              {(t.entradas || []).map((e, j) => (
                <div key={j} className="flex gap-1.5 items-center">
                  <input
                    type="number" value={e.de ?? ''} onChange={ev => setEntrada(i, j, { de: ev.target.value === '' ? '' : Number(ev.target.value) })}
                    placeholder="de" className={`${INP} w-14 text-center`}
                  />
                  <span className="text-accent-300 text-xs">–</span>
                  <input
                    type="number" value={e.ate ?? ''} onChange={ev => setEntrada(i, j, { ate: ev.target.value === '' ? null : Number(ev.target.value) })}
                    placeholder="até" className={`${INP} w-14 text-center`}
                  />
                  <input
                    type="text" value={e.texto ?? ''} onChange={ev => setEntrada(i, j, { texto: ev.target.value })}
                    placeholder="O que acontece / o que sai" className={`${INP} flex-1`}
                  />
                  <button
                    type="button"
                    onClick={() => set(i, { entradas: t.entradas.filter((_, idx) => idx !== j) })}
                    className="text-red-800 hover:text-red-500 transition-colors px-1"
                  >✕</button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => set(i, { entradas: [...(t.entradas || []), { de: '', ate: null, texto: '' }] })}
                className="text-xs px-2 py-1 rounded-lg border border-dashed border-purple-800 text-purple-400 hover:text-white transition-colors"
              >+ Entrada</button>
            </div>

            {!check.valida && (
              <ul className="text-red-400 text-xs space-y-0.5">
                {check.erros.map((er, k) => <li key={k}>⚠ {er}</li>)}
              </ul>
            )}
            {check.valida && buracos.length > 0 && (
              <p className="text-amber-500 text-xs">
                ⚠ Sem entrada para: {buracos.join(', ')}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
