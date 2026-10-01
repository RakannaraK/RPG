import { faixasDaBarra, textoVida } from '../../lib/barraVida'

const CORES = {
  cheia: 'bg-ok',
  media: 'bg-warn',
  baixa: 'bg-harm barra-listrada',
  vazia: 'bg-harm',
}
const ROTULOS = { cheia: 'saudável', media: 'ferido', baixa: 'muito ferido', vazia: 'caído' }

/**
 * Fase 52 — barra de vida animada. A barra desliza quando a vida sobe ou
 * desce, a cor segue o estado e, com pouca vida, a
 * barra fica LISTRADA — dá para perceber mesmo sem distinguir as cores.
 * Vida temporária entra como um pedaço azul depois da vida.
 */
export default function BarraVida({ atual, maximo, temp = 0, rotulo = 'Vida', mostrarTexto = true, altura = 'h-2', className = '' }) {
  if (!Number(maximo)) return null
  const { pct, pctTemp, nivel } = faixasDaBarra({ atual, maximo, temp })
  return (
    <div className={className}>
      {mostrarTexto && (
        <div className="flex items-baseline justify-between gap-2 mb-1">
          <span className="text-ink-dim text-xs font-medium">{rotulo}</span>
          <span className="text-ink text-sm font-semibold tabular-nums">{textoVida({ atual, maximo, temp })}</span>
        </div>
      )}
      <div
        role="progressbar" aria-label={`${rotulo}: ${ROTULOS[nivel]}`}
        aria-valuemin={0} aria-valuemax={Number(maximo)} aria-valuenow={Math.max(0, Number(atual) || 0)}
        aria-valuetext={`${textoVida({ atual, maximo, temp })}, ${ROTULOS[nivel]}`}
        className={`relative ${altura} rounded-full bg-void/80 ring-1 ring-inset ring-border/70 overflow-hidden`}
      >
        {/* largura (não scaleX) para as listras não esticarem; só anima quando a vida muda */}
        <div
          className={`absolute inset-y-0 left-0 rounded-full ${CORES[nivel]} transition-[width] duration-lenta ease-padrao`}
          style={{ width: `${pct}%` }}
        />
        {pctTemp > 0 && (
          <div
            className="absolute inset-y-0 bg-temp/80 transition-[left,width] duration-lenta ease-padrao"
            style={{ left: `${pct}%`, width: `${pctTemp}%` }}
          />
        )}
      </div>
    </div>
  )
}
