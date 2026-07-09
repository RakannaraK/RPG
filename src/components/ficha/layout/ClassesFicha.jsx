import { useState, useEffect } from 'react'

/**
 * Nível editável de uma classe — buffer local que só grava no blur/Enter,
 * para não escrever no banco a cada tecla nem brigar com a digitação.
 */
function NivelInput({ nivel, onCommit }) {
  const [v, setV] = useState(String(nivel))
  useEffect(() => { setV(String(nivel)) }, [nivel])
  function commit() {
    const n = Math.max(1, Math.floor(Number(v) || 1))
    setV(String(n))
    if (n !== nivel) onCommit(n)
  }
  return (
    <input
      type="number"
      min={1}
      value={v}
      onChange={e => setV(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
      className="w-12 bg-transparent text-amber-300 text-center text-sm font-semibold focus:outline-none border-b border-purple-800 focus:border-amber-500"
      title="Nível nesta classe"
    />
  )
}

/**
 * Fase 19.1 — resumo textual da multiclasse: "Bárbaro 9 / Paladino 4".
 * Usa o nome da classe do sistema quando disponível.
 */
export function resumoClasses(classesFicha = []) {
  return classesFicha
    .filter(cf => cf.classe)
    .map(cf => `${cf.classe.nome} ${cf.nivel}`)
    .join(' / ')
}

export function nivelTotalDe(classesFicha = []) {
  return classesFicha.reduce((s, cf) => s + (Number(cf.nivel) || 0), 0)
}

/**
 * Editor de classes da ficha (multiclasse) — só para o dono.
 * Lista as classes com nível editável, permite remover (com confirmação, pois
 * remove as habilidades concedidas) e adicionar novas classes do sistema.
 */
export default function ClassesFicha({
  classesFicha = [],
  classesSistema = [],
  onAdd,
  onRemove,
  onSetNivel,
}) {
  const [confirmando, setConfirmando] = useState(null) // rowId em confirmação de remoção
  const [adicionando, setAdicionando] = useState(false)

  const idsUsados = new Set(classesFicha.map(cf => cf.classe_id))
  const disponiveis = classesSistema.filter(c => !idsUsados.has(c.id))

  const chipCls = 'flex items-center gap-1.5 bg-purple-950 border border-purple-700 rounded-lg pl-2.5 pr-1 py-1'

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {classesFicha.map(cf => (
        <div key={cf.id} className={chipCls}>
          <span className="text-white text-sm font-medium">
            {cf.classe?.nome || <span className="text-red-400 italic">classe removida</span>}
          </span>
          <NivelInput nivel={cf.nivel} onCommit={n => onSetNivel(cf.id, n)} />
          {confirmando === cf.id ? (
            <span className="flex items-center gap-1 pl-1">
              <button
                onClick={() => { onRemove(cf.id, cf.classe_id, cf.classe?.nome); setConfirmando(null) }}
                className="text-[11px] px-1.5 py-0.5 bg-red-700 hover:bg-red-600 text-white rounded"
                title="Remover classe e as habilidades concedidas por ela"
              >
                remover
              </button>
              <button
                onClick={() => setConfirmando(null)}
                className="text-[11px] px-1 py-0.5 text-purple-400 hover:text-white"
              >
                ✕
              </button>
            </span>
          ) : (
            <button
              onClick={() => setConfirmando(cf.id)}
              className="w-5 h-5 flex items-center justify-center text-purple-500 hover:text-red-400 transition-colors"
              title="Remover classe"
            >
              ×
            </button>
          )}
        </div>
      ))}

      {disponiveis.length > 0 && (
        adicionando ? (
          <select
            autoFocus
            defaultValue=""
            onChange={e => { if (e.target.value) { onAdd(e.target.value); setAdicionando(false) } }}
            onBlur={() => setAdicionando(false)}
            className="px-2 py-1 rounded-lg bg-purple-950 border border-purple-700 text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
          >
            <option value="" disabled>Escolha uma classe…</option>
            {disponiveis.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        ) : (
          <button
            onClick={() => setAdicionando(true)}
            className="text-sm px-2.5 py-1 rounded-lg border border-dashed border-purple-700 text-purple-300 hover:text-white hover:border-purple-500 transition-colors"
          >
            + Classe
          </button>
        )
      )}
    </div>
  )
}
