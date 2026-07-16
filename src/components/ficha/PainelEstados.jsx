import { clampEstado, faixaAtivaDoEstado, calorDoEstado } from '../../lib/estadosEngine'

/**
 * Fase 24.4 — estados em destaque na ficha (ao lado da vida/trilha). Contador
 * +/- com a cor esquentando conforme o valor sobe; aviso da faixa ativa como
 * chip; bloqueios informativos em vermelho (a mesa arbitra).
 */

// calor 0..1 → frio (roxo) … quente (vermelho)
function corPorCalor(calor) {
  if (calor >= 0.99) return 'border-red-500 bg-red-950/60 text-red-200'
  if (calor >= 0.75) return 'border-orange-500/80 bg-orange-950/50 text-orange-200'
  if (calor >= 0.5) return 'border-amber-500/70 bg-amber-950/40 text-amber-200'
  return 'border-purple-700 bg-purple-950/50 text-purple-200'
}

function Estado({ cfg, valor, isDono, onSet }) {
  const v = clampEstado(valor, cfg)
  const faixa = faixaAtivaDoEstado(cfg, v)
  const calor = calorDoEstado(cfg, v)
  const noMin = v <= Number(cfg.min ?? 0)
  const noMax = v >= Number(cfg.max ?? 10)

  return (
    <div className={`rounded-xl border px-3 py-2 transition-colors duration-300 ${corPorCalor(calor)}`}>
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider">{cfg.nome || 'Estado'}</span>
        {isDono && (
          <button onClick={() => onSet(cfg, v - 1)} disabled={noMin}
            className="w-5 h-5 flex items-center justify-center rounded bg-slate-900/60 hover:bg-slate-800 disabled:opacity-30 text-sm leading-none transition-colors">−</button>
        )}
        <span className="text-xl font-bold leading-none min-w-[1.5rem] text-center">{v}</span>
        {isDono && (
          <button onClick={() => onSet(cfg, v + 1)} disabled={noMax}
            className="w-5 h-5 flex items-center justify-center rounded bg-slate-900/60 hover:bg-slate-800 disabled:opacity-30 text-sm leading-none transition-colors">+</button>
        )}
        <span className="text-[10px] opacity-60 font-mono">/{cfg.max ?? 10}</span>
      </div>
      {faixa?.aviso && (
        <p className="text-[11px] mt-1 font-medium animate-pulse">⚠ {faixa.aviso}</p>
      )}
      {(faixa?.bloqueios || []).map((b, i) => (
        <span key={i} className="inline-block mt-1 mr-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border bg-red-950/80 border-red-500 text-red-200">
          ⛔ {b}
        </span>
      ))}
    </div>
  )
}

export default function PainelEstados({ estados = [], valores = {}, isDono, onSet, apenasDestaque = true }) {
  const lista = apenasDestaque ? estados.filter(e => e.destaque !== false) : estados
  if (!lista.length) return null
  return (
    <div className="flex flex-wrap gap-2">
      {lista.map(cfg => (
        <Estado key={cfg.id} cfg={cfg} valor={valores[cfg.id]} isDono={isDono} onSet={onSet} />
      ))}
    </div>
  )
}
