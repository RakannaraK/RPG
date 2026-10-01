/**
 * Fase 52 — ícones de CONTROLE (fechar, copiar, buscar, menu…).
 *
 * Regra de iconografia do site:
 *  - controle de interface → `<Icone>` (traço fino de 24×24, uma cor só, a do texto);
 *  - arte e atmosfera (capa, estado vazio, tema de RPG) → `<Ilustra>` (traço com detalhe em âmbar);
 *  - emoji só dentro de conteúdo escrito pelas pessoas ou em frase.
 *
 * O ícone é decorativo (aria-hidden): quem dá o nome ao botão é o `aria-label`.
 */
const P = {
  x: 'M6 6l12 12M18 6 6 18',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  mais: 'M12 5v14M5 12h14',
  menos: 'M5 12h14',
  'seta-esq': 'M19 12H5M11 6l-6 6 6 6',
  'seta-dir': 'M5 12h14M13 6l6 6-6 6',
  'chevron-baixo': 'M6 9l6 6 6-6',
  'chevron-cima': 'M6 15l6-6 6 6',
  'chevron-dir': 'M9 6l6 6-6 6',
  'chevron-esq': 'M15 6l-6 6 6 6',
  busca: 'M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM15.5 15.5 20 20',
  copiar: 'M9 9h10v11H9zM15 9V5H5v11h4',
  menu: 'M4 7h16M4 12h16M4 17h16',
  opcoes: 'M5 12h.01M12 12h.01M19 12h.01',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01',
  alerta: 'M12 4 2.8 19.5h18.4zM12 10v4.5M12 17.2h.01',
  erro: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9 9l6 6M15 9l-6 6',
  ok: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8.5 12.2l2.4 2.4 4.6-4.8',
  sino: 'M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0',
  ajustes: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 5v4M9 15v4',
  sair: 'M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 8l-4 4 4 4M6 12h10',
  usuario: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20a7.5 7.5 0 0 1 15 0',
  globo: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18',
  ajuda: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9.5a2.6 2.6 0 0 1 5 .8c0 1.8-2.5 2.2-2.5 3.9M12 17h.01',
  mapa: 'M9 5 3.5 7v12L9 17l6 2 5.5-2V5L15 7zM9 5v12M15 7v12',
  porta: 'M6 20V5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v15M4 20h16M14.5 12.5h.01',
  lixeira: 'M5 7h14M10 7V4.5h4V7M7 7l1 13h8l1-13M10.5 11v5.5M13.5 11v5.5',
  pasta: 'M3.5 7.5a2 2 0 0 1 2-2h4l2 2.5h7a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z',
  cadeado: 'M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3',
  olho: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  coroa: 'M4 8l4 4 4-6 4 6 4-4-1.5 10h-13zM5.5 20h13',
  escudo: 'M12 3.5 5 6v6c0 4.2 2.9 7.5 7 8.5 4.1-1 7-4.3 7-8.5V6z',
  play: 'M8 5.5v13l10.5-6.5z',
  pausa: 'M8 5.5v13M16 5.5v13',
  volume: 'M4 9.5h3.5L12 6v12l-4.5-3.5H4zM15.5 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11',
  mudo: 'M4 9.5h3.5L12 6v12l-4.5-3.5H4zM16 10l4 4M20 10l-4 4',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  editar: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  baixar: 'M12 4v11M7 10.5l5 5 5-5M5 20h14',
  enviar: 'M12 16V5M7 9.5l5-5 5 5M5 20h14',
  filtro: 'M4 5h16l-6 7.5V19l-4-2v-4.5z',
  estrela: 'M12 4l2.5 5.2 5.6.8-4 4 1 5.6-5.1-2.7-5 2.7 1-5.6-4-4 5.5-.8z',
  coracao: 'M12 19.5S4 15 4 9.5A4 4 0 0 1 12 7a4 4 0 0 1 8 2.5c0 5.5-8 10-8 10z',
  calendario: 'M5 6h14v14H5zM5 10h14M9 4v4M15 4v4',
  relogio: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7.5V12l3 2',
  dado: 'M12 3l7.5 4.5v9L12 21l-7.5-4.5v-9zM12 3v6M19.5 7.5 12 9 4.5 7.5M12 9l-4 7.5h8z',
  chama: 'M12 21c-3.6 0-6-2.4-6-5.6 0-3.3 2.6-5 3.4-8.4 2 1.2 3 3 3.1 4.8 1-.8 1.6-2 1.7-3.3 2.2 1.8 3.8 4.3 3.8 6.9 0 3.2-2.4 5.6-6 5.6z',
  raio: 'M13 3 5 13.5h6L10 21l8-10.5h-6z',
  pessoas: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20a6.5 6.5 0 0 1 13 0M16 11a3 3 0 1 0 0-6M18 14.5a5.5 5.5 0 0 1 3.5 5.5',
  vivo: 'M12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14',
}

export const NOMES_ICONE = Object.keys(P)

export default function Icone({ nome, tamanho = 18, className = '', espessura = 1.8, style }) {
  const d = P[nome]
  if (!d) return null
  return (
    <svg
      width={tamanho} height={tamanho} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth={espessura}
      strokeLinecap="round" strokeLinejoin="round"
      className={`shrink-0 ${className}`} style={style}
      aria-hidden="true" focusable="false"
    >
      <path d={d} />
    </svg>
  )
}
