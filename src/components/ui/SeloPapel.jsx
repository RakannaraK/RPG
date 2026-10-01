import Icone from './Icone'

/**
 * Fase 52 — papel na mesa. Antes eram 3 cópias de cores diferentes (o
 * co-mestre era laranja cru). Cada papel tem ícone, texto e forma próprios —
 * não depende só da cor para ser reconhecido.
 */
export const PAPEIS = {
  mestre:      { rotulo: 'Mestre',     icone: 'coroa',  cls: 'bg-accent-600 text-sobre-acento border-transparent' },
  'co-mestre': { rotulo: 'Co-mestre',  icone: 'escudo', cls: 'bg-accent-800/40 text-accent-300 border-accent-500/60' },
  jogador:     { rotulo: 'Jogador',    icone: 'dado',   cls: 'bg-hover text-ink border-border' },
  espectador:  { rotulo: 'Espectador', icone: 'olho',   cls: 'bg-transparent text-ink-dim border-border border-dashed' },
}

export const rotuloPapel = papel => (PAPEIS[papel] || PAPEIS.jogador).rotulo

export default function SeloPapel({ papel, className = '' }) {
  const p = PAPEIS[papel] || PAPEIS.jogador
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${p.cls} ${className}`}>
      <Icone nome={p.icone} tamanho={13} espessura={2} />
      {p.rotulo}
    </span>
  )
}
