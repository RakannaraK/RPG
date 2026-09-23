/**
 * Fase 37 — biblioteca de arte de RPG, em traço.
 *
 * Tudo SVG inline num viewBox 48×48, desenhado com `currentColor` no contorno e
 * um detalhe em âmbar (o mesmo âmbar dos dados). Sem arquivo de imagem: cada
 * desenho custa algumas centenas de bytes e acompanha o tema, porque a cor vem
 * de quem usa (`style={{ color: 'var(--accent-400)' }}` é o padrão).
 *
 * Uso: <Ilustra nome="pergaminho" tamanho={72} />
 */

const A = 'var(--dice-400, #FBBF24)' // detalhe em âmbar

const DESENHOS = {
  /* d20 — o dado da casa */
  d20: (
    <>
      <polygon points="24,4 41,14 41,34 24,44 7,34 7,14" />
      <polygon points="24,12 36,32 12,32" fill="currentColor" fillOpacity=".15" />
      <path d="M24 4v8M41 14l-5 18M7 14l5 18M24 44l-12-12M24 44l12-12" opacity=".55" />
    </>
  ),

  /* pergaminho — ficha, nota, documento */
  pergaminho: (
    <>
      <path d="M14 11h20v26H14z" />
      <path d="M14 11a4 4 0 1 0-4 4h4M34 37a4 4 0 1 0 4-4h-4" />
      <path d="M19 19h10M19 24h10M19 29h6" opacity=".7" stroke={A} />
    </>
  ),

  /* mapa — cenas, batalha, exploração */
  mapa: (
    <>
      <path d="m6 13 12-5 12 5 12-5v27l-12 5-12-5-12 5z" />
      <path d="M18 8v27M30 13v27" opacity=".5" />
      <path d="M12 28c5-6 10 4 15-2" strokeDasharray="2 3" stroke={A} />
      <path d="m30 22 4 4m0-4-4 4" stroke={A} />
    </>
  ),

  /* baú — vitrine vazia, inventário */
  bau: (
    <>
      <path d="M8 20a16 8 0 0 1 32 0v18H8z" />
      <path d="M8 24h32" opacity=".6" />
      <path d="M21 24h6v7h-6z" fill="currentColor" fillOpacity=".2" stroke={A} />
    </>
  ),

  /* garra — bestiário */
  garra: (
    <>
      <path d="M11 41c1-12 5-23 13-32" strokeWidth="2.6" />
      <path d="M21 43c0-13 3-24 10-34" strokeWidth="2.2" />
      <path d="M31 43c-1-11 1-21 6-30" strokeWidth="1.8" stroke={A} />
    </>
  ),

  /* espadas — equipamento, combate */
  espadas: (
    <>
      <path d="M36 9 18 27M12 9l18 18" />
      <path d="m18 27-5 5M30 27l5 5" />
      <path d="m14 23 8 8M34 23l-8 8" stroke={A} />
      <circle cx="11.5" cy="33.5" r="2" />
      <circle cx="36.5" cy="33.5" r="2" />
    </>
  ),

  /* moldura — imagens */
  moldura: (
    <>
      <rect x="7" y="10" width="34" height="28" rx="3" />
      <path d="m12 32 8-9 6 6 5-5 7 8" stroke={A} />
      <circle cx="31" cy="18" r="3" opacity=".8" />
    </>
  ),

  /* tomo — sistema de regras */
  tomo: (
    <>
      <path d="M6 11c6-2 12-2 18 2v26c-6-4-12-4-18-2zM42 11c-6-2-12-2-18 2v26c6-4 12-4 18-2z" />
      <path d="M24 13v26" opacity=".6" />
      <path d="M31 22h6M11 22h6" stroke={A} opacity=".8" />
    </>
  ),

  /* ── Ícones de interface (F38) — entraram no lugar de emoji em botão sem
     rótulo: emoji colorido virava borrão em 16 px e não tem nome acessível. ── */
  sino: (
    <>
      <path d="M13 20a11 11 0 0 1 22 0v9l3 5H10l3-5z" />
      <path d="M20 38a4 4 0 0 0 8 0" />
      <path d="M24 9v-3" stroke={A} />
    </>
  ),
  engrenagem: (
    <>
      {/* dentes grossos e curtos: com traço fino o desenho virava um sol */}
      <path d="M24 8v6M24 34v6M8 24h6M34 24h6M12.5 12.5l4.2 4.2M31.3 31.3l4.2 4.2M35.5 12.5l-4.2 4.2M16.7 31.3l-4.2 4.2" strokeWidth="3.6" />
      <circle cx="24" cy="24" r="9.5" strokeWidth="2.4" />
      <circle cx="24" cy="24" r="3.6" fill={A} stroke={A} />
    </>
  ),
  porta: (
    <>
      <path d="M26 8H12v32h14" />
      <path d="M33 24H20" stroke={A} />
      <path d="m28 18 6 6-6 6" stroke={A} />
    </>
  ),
  lixeira: (
    <>
      <path d="M9 14h30M19 14V9h10v5M13 14l2 26h18l2-26" />
      <path d="M21 21v12M27 21v12" stroke={A} />
    </>
  ),
  globo: (
    <>
      <circle cx="24" cy="24" r="17" />
      <path d="M7 24h34M24 7c5 5 5 29 0 34M24 7c-5 5-5 29 0 34" opacity=".75" />
      <path d="M11 14c8 4 18 4 26 0M11 34c8-4 18-4 26 0" stroke={A} opacity=".8" />
    </>
  ),
  cadeado: (
    <>
      <rect x="10" y="21" width="28" height="19" rx="3" />
      <path d="M16 21v-5a8 8 0 0 1 16 0v5" />
      <circle cx="24" cy="30" r="2.4" fill={A} stroke={A} />
    </>
  ),
  calendario: (
    <>
      <rect x="8" y="12" width="32" height="28" rx="3" />
      <path d="M8 20h32M17 12V8M31 12V8" />
      <path d="M16 27h5M27 27h5M16 34h5" stroke={A} opacity=".9" />
    </>
  ),
  nota: (
    <>
      <path d="M12 8h16l8 8v24H12z" />
      <path d="M28 8v8h8" opacity=".7" />
      <path d="M18 24h12M18 30h12M18 36h7" stroke={A} opacity=".9" />
    </>
  ),
  jogo: (
    <>
      <path d="M15 17h18a9 9 0 0 1 8 13l-2 5a4 4 0 0 1-6 1l-3-3H18l-3 3a4 4 0 0 1-6-1l-2-5a9 9 0 0 1 8-13z" />
      <path d="M17 26h6M20 23v6" stroke={A} />
      <circle cx="31" cy="26" r="2" fill={A} stroke={A} />
    </>
  ),
  alvo: (
    <>
      <circle cx="24" cy="24" r="16" />
      <circle cx="24" cy="24" r="9" opacity=".7" />
      <circle cx="24" cy="24" r="2.5" fill={A} stroke={A} />
    </>
  ),
  som: (
    <>
      <path d="M10 19h7l9-7v24l-9-7h-7z" />
      <path d="M31 18a9 9 0 0 1 0 12M36 14a15 15 0 0 1 0 20" stroke={A} />
    </>
  ),
  pessoas: (
    <>
      <circle cx="18" cy="17" r="6" />
      <path d="M8 40c0-6 4.5-10 10-10s10 4 10 10" />
      <circle cx="33" cy="19" r="5" opacity=".8" stroke={A} />
      <path d="M28 40c0-5.5 3-9 8-9 4 0 6 2.5 6 6" stroke={A} opacity=".8" />
    </>
  ),
  relogio: (
    <>
      <circle cx="24" cy="24" r="16" />
      <path d="M24 14v10l7 5" stroke={A} />
    </>
  ),

  /* escudo, poção, elmo, lanterna — motivos das capas de mesa (37.4) */
  escudo: (
    <>
      <path d="M24 5 9 11v12c0 9 6 17 15 20 9-3 15-11 15-20V11z" />
      <path d="m17 23 6 6 10-11" stroke={A} />
    </>
  ),
  pocao: (
    <>
      <path d="M20 6h8v8l7 14a9 9 0 0 1-8 14h-6a9 9 0 0 1-8-14l7-14z" />
      <path d="M14 28h20" stroke={A} />
      <circle cx="22" cy="34" r="2" stroke={A} opacity=".9" />
    </>
  ),
  elmo: (
    <>
      <path d="M12 24a12 12 0 0 1 24 0v11a5 5 0 0 1-5 5H17a5 5 0 0 1-5-5z" />
      <path d="M12 27h24" opacity=".7" />
      <path d="M16 30h6v5h-6zM26 30h6v5h-6z" stroke={A} />
      <path d="M24 12V7M20 9c2-3 6-3 8 0" opacity=".85" />
    </>
  ),
  lanterna: (
    <>
      <path d="M16 16h16v20H16zM19 16l3-6h4l3 6M18 36h12l2 5H16z" />
      <path d="M24 22c3 3 3 6 0 9-3-3-3-6 0-9z" fill={A} stroke={A} />
    </>
  ),
}

export const NOMES_ARTE = Object.keys(DESENHOS)

export default function Ilustra({ nome, tamanho = 64, className = '', style }) {
  const desenho = DESENHOS[nome]
  if (!desenho) return null
  return (
    <svg
      width={tamanho} height={tamanho} viewBox="0 0 48 48"
      className={className}
      style={{ color: 'var(--accent-400)', ...style }}
      fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" focusable="false"
    >
      {desenho}
    </svg>
  )
}
