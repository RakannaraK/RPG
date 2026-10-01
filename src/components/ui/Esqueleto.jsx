/**
 * Fase 52 — bloco cinza com brilho que passa devagar, no lugar de "Carregando…"
 * enquanto um dado do servidor chega. O formato imita o conteúdo que vem,
 * para a tela não pular quando ele chega.
 *
 *   <Esqueleto className="h-5 w-2/3" />
 *   <EsqueletoCartoes quantos={3} />
 */
export default function Esqueleto({ className = '' }) {
  return <div className={`esqueleto rounded-lg ${className}`} aria-hidden="true" />
}

/** Cartões genéricos (lista de mesas, fichas, criaturas). */
export function EsqueletoCartoes({ quantos = 3, className = 'grid gap-3', altura = 'h-24' }) {
  return (
    <div className={className} role="status" aria-label="Carregando">
      {Array.from({ length: quantos }, (_, i) => (
        <div key={i} className={`rounded-2xl border border-border bg-raised/60 p-4 ${altura}`}>
          <Esqueleto className="h-4 w-1/2 mb-3" />
          <Esqueleto className="h-3 w-3/4 mb-2" />
          <Esqueleto className="h-3 w-1/3" />
        </div>
      ))}
    </div>
  )
}
