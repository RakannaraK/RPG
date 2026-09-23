import Ilustra from '../arte/Ilustra'
import { acharCapa } from '../../lib/capas'

/**
 * Fase 37.4 — faixa ilustrada da mesa: o motivo da capa repetido sobre um
 * gradiente na cor do tema. Sem capa escolhida, não desenha nada (e a tela
 * fica exatamente como era antes).
 */
export default function CapaMesa({ capa, altura = 92, className = '', children }) {
  const c = acharCapa(capa)
  if (!c) return children ? <div className={className}>{children}</div> : null

  const copias = Math.max(4, Math.ceil(1200 / (altura * 0.9)))

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ minHeight: altura }} aria-hidden={!children}>
      {/* brasa na cor do tema */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(115deg, color-mix(in srgb, var(--accent-800) 55%, transparent), ' +
            'color-mix(in srgb, var(--accent-600) 22%, transparent) 45%, transparent 85%)',
        }}
      />
      {/* motivo repetido */}
      <div
        className="absolute inset-0 flex items-center gap-7 px-4 pointer-events-none select-none"
        style={{ opacity: .17, transform: `rotate(${c.inclinacao * 0.25}deg) scale(1.15)` }}
      >
        {Array.from({ length: copias }, (_, i) => (
          <Ilustra
            key={i}
            nome={c.arte}
            tamanho={altura * 0.62}
            style={{
              flex: '0 0 auto',
              transform: `rotate(${c.inclinacao + (i % 2 ? 6 : -6)}deg) translateY(${i % 3 === 0 ? -6 : 4}px)`,
              color: i % 3 === 0 ? 'var(--dice-400)' : 'var(--accent-300)',
            }}
          />
        ))}
      </div>
      {/* escurece as pontas para o texto por cima continuar legível */}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(90deg, var(--bg) 2%, transparent 35%, transparent 65%, var(--bg) 98%)' }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-1/2"
        style={{ background: 'linear-gradient(180deg, transparent, color-mix(in srgb, var(--bg) 85%, transparent))' }}
      />
      {children && <div className="relative">{children}</div>}
    </div>
  )
}
