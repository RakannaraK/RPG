/**
 * Fase 37 — selo da marca: o d20 (na cor do tema) cruzado pela pena (âmbar dos
 * dados). SVG puro, sem arquivo de imagem: escala sem borrar e troca de cor
 * junto com o tema, porque usa os tokens.
 *
 * Em tamanho pequeno o desenho se simplifica sozinho — os raios internos do
 * dado e a nervura da pena viram sujeira abaixo de ~30px.
 *
 * `pulso` faz o selo respirar devagar; quem pediu menos movimento no sistema
 * não vê animação nenhuma (ver theme/rpg.css).
 */
export default function Selo({ tamanho = 28, pulso = false, className = '' }) {
  const simples = tamanho < 30

  return (
    <svg
      width={tamanho} height={tamanho} viewBox="0 0 32 32"
      className={`${pulso ? 'selo-pulso' : ''} ${className}`}
      role="img" aria-label="Selo do Dado & Pena"
    >
      {/* d20 — contorno e face, na cor do acento do tema */}
      <g
        fill="none"
        stroke="var(--accent-400, #A78BFA)"
        strokeWidth={simples ? 2 : 1.6} strokeLinejoin="round" strokeLinecap="round"
      >
        <polygon points="16,2.5 28,9.5 28,22.5 16,29.5 4,22.5 4,9.5" />
        <polygon points="16,8.5 24.5,21 7.5,21" fill="var(--accent-800, #5B21B6)" fillOpacity=".45" />
        {!simples && (
          <path d="M16 2.5v6M28 9.5l-3.5 11.5M4 9.5 7.5 21M16 29.5 7.5 21M16 29.5 24.5 21" strokeWidth="1" opacity=".6" />
        )}
      </g>

      {/* Pena — cruza o canto de baixo à esquerda e deixa a face do dado à
          vista. Desenhada duas vezes: a de baixo, com o traço da cor do fundo,
          abre o vão que faz a pena parecer passar por cima do dado. */}
      <g transform="rotate(-4 16 16)">
        <path
          d="M4 28.5 11.4 21.3m0 0c2-5 5.6-8.9 11.2-11-1 6.4-4 10.5-8.3 12.5-1.3.6-2.3-.2-2.9-1.9z"
          fill="none" stroke="var(--bg, #0B0812)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"
        />
        <path d="M4 28.5 11.4 21.3" fill="none" stroke="var(--dice-400, #FBBF24)" strokeWidth="1.8" strokeLinecap="round" />
        <path
          d="M11.4 21.3c2-5 5.6-8.9 11.2-11-1 6.4-4 10.5-8.3 12.5-1.3.6-2.3-.2-2.9-1.9z"
          fill="var(--dice-400, #FBBF24)" fillOpacity=".95"
          stroke="var(--dice-200, #FDE68A)" strokeWidth=".7" strokeLinejoin="round"
        />
        {!simples && (
          <path d="M12.6 21.6c2.3-3.7 5.2-6.6 8.9-8.7" fill="none" stroke="var(--dice-700, #B45309)" strokeWidth=".7" strokeLinecap="round" opacity=".75" />
        )}
      </g>
    </svg>
  )
}
