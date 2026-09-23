/**
 * Fase 37 — selo da marca: o d20 (na cor do tema) cruzado pela pena (âmbar dos
 * dados). SVG puro, sem arquivo de imagem: escala sem borrar e troca de cor
 * junto com o tema, porque usa os tokens.
 *
 * `pulso` faz o selo respirar devagar — só nos cabeçalhos, e desligado sozinho
 * para quem pediu menos movimento no sistema (ver theme/rpg.css).
 */
export default function Selo({ tamanho = 28, pulso = false, className = '' }) {
  return (
    <svg
      width={tamanho} height={tamanho} viewBox="0 0 32 32"
      className={`${pulso ? 'selo-pulso' : ''} ${className}`}
      role="img" aria-label="Selo do Dado & Pena"
      style={{ overflow: 'visible' }}
    >
      {/* d20 — contorno e faces, na cor do acento do tema */}
      <g
        fill="none"
        stroke="var(--accent-400, #A78BFA)"
        strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"
      >
        <polygon points="16,2.5 28,9.5 28,22.5 16,29.5 4,22.5 4,9.5" />
        <polygon points="16,8.5 24.5,21 7.5,21" fill="var(--accent-800, #5B21B6)" fillOpacity=".35" />
        <path d="M16 2.5v6M28 9.5l-3.5 11.5M4 9.5 7.5 21M16 29.5 7.5 21M16 29.5 24.5 21" strokeWidth="1.1" opacity=".75" />
      </g>

      {/* Pena — desenhada duas vezes: a primeira com o traço da cor do fundo,
          que abre um vão e faz a pena parecer passar por cima do dado. */}
      <g transform="rotate(-6 16 16)">
        <path
          d="M4.5 28.5 12 21m0 0c2.4-6.2 7.2-10.9 14.6-13.6-1.4 8.2-5.4 13.4-11 16-1.7.8-3-.3-3.6-2.4z"
          fill="none" stroke="var(--bg, #0B0812)" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"
        />
        <path d="M4.5 28.5 12 21" fill="none" stroke="var(--dice-400, #FBBF24)" strokeWidth="1.7" strokeLinecap="round" />
        <path
          d="M12 21c2.4-6.2 7.2-10.9 14.6-13.6-1.4 8.2-5.4 13.4-11 16-1.7.8-3-.3-3.6-2.4z"
          fill="var(--dice-400, #FBBF24)" fillOpacity=".9"
          stroke="var(--dice-200, #FDE68A)" strokeWidth=".8" strokeLinejoin="round"
        />
        {/* nervura da pena */}
        <path d="M13.4 21.6c3-4.6 6.8-8.2 11.7-10.8" fill="none" stroke="var(--dice-700, #B45309)" strokeWidth=".8" strokeLinecap="round" opacity=".8" />
      </g>
    </svg>
  )
}
