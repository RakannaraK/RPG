import { useState } from 'react'
import { calcularMaestria } from '../../lib/masteryEngine'

/**
 * Fase 21.3 — painel de maestrias da ficha (adaptativo: some se maestria
 * desativada). Mostra nível, barra de XP e os botões de ganho rápido do sistema.
 * O ganho é semiautomático (um clique) — nunca automático.
 */
function MaestriaCard({ nome, sub, xp, curva, ganhos, isDono, onGanhar }) {
  const [manual, setManual] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const { nivel, xpNoNivel, xpParaProximo, faltam } = calcularMaestria(xp, curva)
  const pct = xpParaProximo > 0 ? Math.max(0, Math.min(100, (xpNoNivel / xpParaProximo) * 100)) : 100

  async function ganhar(delta) {
    if (!delta) return
    setOcupado(true)
    try { await onGanhar(delta) } finally { setOcupado(false) }
  }

  return (
    <div className="bg-purple-950/40 border border-purple-800 rounded-xl p-3 space-y-2">
      <div className="flex items-baseline justify-between gap-2 flex-wrap">
        <span className="min-w-0">
          <span className="text-white text-sm font-medium">{nome}</span>
          {sub && <span className="text-purple-500 text-[11px] ml-1.5">{sub}</span>}
        </span>
        <span className="text-amber-300 text-sm font-mono shrink-0">Maestria {nivel}</span>
      </div>

      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
        <div className="h-full rounded-full bg-amber-500 transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-purple-600 text-[11px]">
        {xpParaProximo > 0
          ? <>XP {xp} · faltam <span className="text-purple-400">{faltam}</span> para a maestria {nivel + 1}</>
          : <>XP {xp} · nível máximo da curva</>}
      </p>

      {isDono && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {ganhos.map((g, i) => (
            <button
              key={i}
              onClick={() => ganhar(Number(g.xp) || 0)}
              disabled={ocupado}
              className="text-[11px] px-2 py-1 rounded-lg bg-purple-900/60 hover:bg-purple-800 text-purple-200 hover:text-white transition-colors disabled:opacity-40"
              title={`+${g.xp} XP`}
            >
              {g.rotulo || `+${g.xp}`} <span className="text-amber-400/80">+{g.xp}</span>
            </button>
          ))}
          <span className="flex items-center gap-1">
            <input
              type="number"
              value={manual}
              onChange={e => setManual(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && manual) { ganhar(Number(manual)); setManual('') } }}
              placeholder="XP"
              disabled={ocupado}
              className="w-14 px-1.5 py-1 rounded-lg bg-purple-950 border border-purple-700 text-white text-[11px] text-center placeholder-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
            <button
              onClick={() => { ganhar(Number(manual)); setManual('') }}
              disabled={ocupado || !manual}
              className="text-[11px] px-2 py-1 rounded-lg bg-purple-700 hover:bg-purple-600 text-white transition-colors disabled:opacity-40"
            >
              +XP
            </button>
          </span>
        </div>
      )}
    </div>
  )
}

export default function PainelMaestrias({
  config = {},
  categorias = [],
  itens = [],
  linhasMaestria = [],
  isDono,
  onGanhar,
}) {
  const [treinar, setTreinar] = useState('')
  if (!config.ativo) return null

  const escopo = config.escopo === 'item' ? 'item' : 'categoria'
  const curva = config.curva
  const ganhos = config.ganhos_padrao || []

  // Alvos possíveis conforme o escopo
  const candidatos = escopo === 'categoria'
    ? categorias.map(c => ({ id: c.id, nome: c.nome, alvo: { categoria_id: c.id } }))
    : itens.map(it => ({ id: it.id, nome: it.nome, alvo: { item_id: it.id } }))

  // Alvos que a ficha já treina (têm linha de maestria)
  const treinaSet = new Set(
    linhasMaestria.map(l => (l.categoria_id ? `c:${l.categoria_id}` : `i:${l.item_id}`))
  )
  const chave = a => (a.categoria_id ? `c:${a.categoria_id}` : `i:${a.item_id}`)

  const emTreino = candidatos.filter(c => treinaSet.has(chave(c.alvo)))
  const disponiveis = candidatos.filter(c => !treinaSet.has(chave(c.alvo)))

  // Nada configurado ainda e nada a treinar → não mostra
  if (candidatos.length === 0 && linhasMaestria.length === 0) return null

  function xpDe(alvo) {
    const l = linhasMaestria.find(x =>
      (alvo.categoria_id && x.categoria_id === alvo.categoria_id) ||
      (alvo.item_id && x.item_id === alvo.item_id)
    )
    return l?.xp ?? 0
  }

  return (
    <div className="bg-slate-800 border border-purple-800 rounded-2xl p-4 space-y-2.5">
      <p className="text-purple-200 text-sm font-semibold">Maestrias</p>

      {emTreino.length === 0 && (
        <p className="text-purple-600 text-xs">
          Nenhuma maestria em treino. {isDono && `Escolha ${escopo === 'categoria' ? 'uma categoria' : 'um item'} para começar.`}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {emTreino.map(c => (
          <MaestriaCard
            key={c.id}
            nome={c.nome}
            sub={escopo === 'categoria' ? 'categoria' : 'item'}
            xp={xpDe(c.alvo)}
            curva={curva}
            ganhos={ganhos}
            isDono={isDono}
            onGanhar={delta => onGanhar(c.alvo, delta, c.nome)}
          />
        ))}
      </div>

      {isDono && disponiveis.length > 0 && (
        <div className="flex items-center gap-2 pt-1">
          <select
            value={treinar}
            onChange={e => setTreinar(e.target.value)}
            className="px-2 py-1 rounded-lg bg-purple-950 border border-purple-700 text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
          >
            <option value="">Treinar {escopo === 'categoria' ? 'categoria' : 'item'}…</option>
            {disponiveis.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <button
            onClick={() => {
              const alvoObj = disponiveis.find(c => c.id === treinar)
              if (alvoObj) { onGanhar(alvoObj.alvo, 0, alvoObj.nome); setTreinar('') }
            }}
            disabled={!treinar}
            className="text-xs px-2.5 py-1 rounded-lg border border-dashed border-purple-700 text-purple-300 hover:text-white hover:border-purple-500 transition-colors disabled:opacity-40"
          >
            + começar
          </button>
        </div>
      )}
    </div>
  )
}
