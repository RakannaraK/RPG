import { useEffect } from 'react'
import CapturaMapa from './CapturaMapa'

/**
 * Fase 53.4 — área circular de uma habilidade. Toque/clique (ou arrastar) no
 * mapa põe o centro; o círculo (acento a 15%) e um anel nos tokens dentro dele
 * mostram quem entra. A conta de quem está dentro é do motor (alvosNaArea).
 */
export function CamadaArea({ ctx, largura, altura, centro, raioPx, tokensDentro = [], onCentro }) {
  const px = n => n / ctx.vista.zoom
  const diametro = t => (Number(ctx.grade.tamanho) > 0 ? Number(ctx.grade.tamanho) : 70) * Number(t.tamanho || 1)
  return (
    <g>
      {centro && (
        <g pointerEvents="none">
          <circle cx={centro.x} cy={centro.y} r={raioPx} fill="var(--accent-500)" fillOpacity="0.15" stroke="var(--accent-400)" strokeWidth={px(2)} />
          <circle cx={centro.x} cy={centro.y} r={px(4)} fill="var(--accent-400)" />
          {tokensDentro.map(t => (
            <circle key={t.id} cx={t.x} cy={t.y} r={diametro(t) / 2 + px(5)} fill="none" stroke="var(--accent-300)" strokeWidth={px(3)} />
          ))}
        </g>
      )}
      <CapturaMapa ctx={ctx} largura={largura} altura={altura} onInicio={onCentro} onMover={onCentro} />
    </g>
  )
}

/** Barra flutuante: quantos alvos entram e confirmar/cancelar. */
export function BarraArea({ n, temCentro, onConfirmar, onCancelar }) {
  useEffect(() => {
    const esc = e => { if (e.key === 'Escape') onCancelar() }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onCancelar])
  return (
    <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded-2xl border border-border bg-raised px-3 py-2 shadow-nivel-3 max-w-[calc(100%-1.5rem)]">
      <span className="text-ink text-sm">
        {temCentro ? `${n} ${n === 1 ? 'alvo' : 'alvos'} na área` : 'Toque no mapa para marcar o centro'}
      </span>
      <button
        type="button" onClick={onConfirmar} disabled={!temCentro}
        className="px-3 py-1 min-h-[28px] rounded-lg text-sm bg-accent-600 hover:bg-accent-500 text-sobre-acento disabled:opacity-50 transition-colors"
      >Confirmar</button>
      <button type="button" onClick={onCancelar} className="px-3 py-1 min-h-[28px] rounded-lg text-sm bg-hover text-ink hover:bg-border transition-colors">Cancelar</button>
    </div>
  )
}
