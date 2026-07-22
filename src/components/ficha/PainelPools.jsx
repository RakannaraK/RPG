import { useState } from 'react'
import { gastarPool, recuperarQuantidade, notacaoGasto } from '../../lib/poolEngine'
import { rolarNotacao } from '../../lib/diceNotation'

/**
 * Fase 20.1 — painel de pools da ficha (adaptativo: some se o sistema não tem pools).
 *
 * `maximo` é sempre derivado da fórmula — nunca vem do banco.
 * Pool de DADOS: gastar N rola Nd<dado>, manda ao feed e oferece aplicar à vida.
 */
function PoolCard({ pool, atual, maximo, erro, isDono, onDefinirAtual, onRolagem, onCurar }) {
  const [qtd, setQtd] = useState('')
  const [msg, setMsg] = useState('')
  const [rolagem, setRolagem] = useState(null) // { notacao, total }
  const [ocupado, setOcupado] = useState(false)

  const ehDados = pool.tipo === 'dados'
  const pct = maximo > 0 ? Math.max(0, Math.min(100, (atual / maximo) * 100)) : 0
  const cor = pct > 50 ? 'bg-temp' : pct > 25 ? 'bg-dice-500' : 'bg-harm'

  async function aplicar(novo) {
    setOcupado(true)
    setMsg('')
    try {
      await onDefinirAtual(pool.id, novo)
    } catch (e) {
      setMsg(e.message || 'Erro ao atualizar.')
    } finally {
      setOcupado(false)
    }
  }

  async function handleGastar() {
    setMsg('')
    setRolagem(null)
    const r = gastarPool(atual, qtd)
    if (!r.ok) { setMsg(r.motivo); return }

    if (ehDados) {
      // Gastar dados = rolar. Debita ANTES do efeito (custo falha antes).
      const notacao = notacaoGasto(pool, qtd)
      const res = rolarNotacao(notacao)
      await aplicar(r.novo)
      setRolagem({ notacao, total: res.total })
      onRolagem?.({ pool, notacao, total: res.total, dados: res.dados })
    } else {
      await aplicar(r.novo)
    }
    setQtd('')
  }

  const btn = 'w-7 h-7 flex items-center justify-center rounded-lg border border-border text-accent-300 hover:text-ink hover:border-accent-500 transition-colors disabled:opacity-40'

  return (
    <div className="bg-void/40 border border-border rounded-xl p-3 space-y-2">
      <div className="flex items-baseline justify-between gap-2 flex-wrap">
        <span className="text-ink text-sm font-medium">
          {pool.nome}
          {ehDados && <span className="text-ink-dim text-xs font-mono ml-1.5">{pool.dado}</span>}
        </span>
        <span className="text-accent-300 text-sm font-mono">
          {atual}
          <span className="text-ink-dim"> / {maximo}</span>
          {ehDados && <span className="text-ink-dim text-xs"> dados</span>}
        </span>
      </div>

      {erro ? (
        <p className="text-harm text-xs">⚠ Fórmula do máximo inválida: {erro}</p>
      ) : (
        <div className="h-2 bg-hover rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-500 ${cor}`} style={{ width: `${pct}%` }} />
        </div>
      )}

      {isDono && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <button onClick={() => aplicar(recuperarQuantidade(atual, maximo, -1))}
            disabled={ocupado || atual <= 0} className={btn} title="Gastar 1">−</button>
          <button onClick={() => aplicar(recuperarQuantidade(atual, maximo, 1))}
            disabled={ocupado || atual >= maximo} className={btn} title="Recuperar 1">+</button>

          <input
            type="number"
            min={1}
            value={qtd}
            onChange={e => setQtd(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && qtd) handleGastar() }}
            placeholder={ehDados ? 'dados' : 'qtd'}
            disabled={ocupado}
            className="w-16 px-2 py-1 rounded-lg bg-void border border-border text-ink text-xs text-center placeholder-accent-600 focus:outline-none focus:ring-1 focus:ring-accent-500"
          />
          <button
            onClick={handleGastar}
            disabled={ocupado || !qtd}
            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-accent-700 hover:bg-accent-600 text-ink transition-colors disabled:opacity-40"
          >
            {ehDados ? 'Gastar e rolar' : 'Gastar'}
          </button>

          <button
            onClick={() => aplicar(maximo)}
            disabled={ocupado || atual >= maximo}
            className="px-2 py-1 text-[11px] text-ink-dim hover:text-ink transition-colors disabled:opacity-40"
            title="Encher o pool"
          >
            encher
          </button>
        </div>
      )}

      {/* Resultado da rolagem de um pool de dados */}
      {rolagem && (
        <div className="flex items-center gap-2 flex-wrap bg-raised border border-temp/60 rounded-lg px-2.5 py-1.5">
          <span className="text-temp text-sm font-semibold">
            {rolagem.notacao} = {rolagem.total}
          </span>
          {onCurar && (
            <button
              onClick={() => { onCurar(rolagem.total); setRolagem(null) }}
              className="px-2 py-0.5 text-[11px] font-medium rounded-lg bg-ok/80 hover:bg-ok text-ink transition-colors"
            >
              Aplicar à vida
            </button>
          )}
          <button onClick={() => setRolagem(null)} className="text-ink-dim hover:text-ink text-xs ml-auto">✕</button>
        </div>
      )}

      {msg && <p className="text-harm text-xs">{msg}</p>}
    </div>
  )
}

export default function PainelPools({
  pools = [],
  linhasPools = [],
  maximos = {},
  erros = {},
  isDono,
  onDefinirAtual,
  onRolagem,
  onCurar,
  atualDe,
}) {
  const visiveis = pools.filter(p => p.visivel_ficha !== false)
  if (visiveis.length === 0) return null

  return (
    <div className="bg-raised border border-border rounded-2xl p-4 space-y-2.5">
      <p className="text-ink text-sm font-semibold">Recursos</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {visiveis.map(pool => (
          <PoolCard
            key={pool.id}
            pool={pool}
            atual={atualDe(pool.id)}
            maximo={maximos[pool.id] ?? 0}
            erro={erros[pool.id]}
            isDono={isDono}
            onDefinirAtual={onDefinirAtual}
            onRolagem={onRolagem}
            onCurar={onCurar}
          />
        ))}
      </div>
    </div>
  )
}
