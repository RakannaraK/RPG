/**
 * Botão do site — criado depois da varredura de design, que achou **9 estilos
 * visuais de botão numa única tela** e mais de 10 combinações de padding
 * (`px-3 py-1.5` 87×, `px-3 py-2` 73×, `px-2 py-1` 67×…). Cada tela tinha
 * reinventado o botão porque não existia um.
 *
 * As variantes copiam os estilos que já dominavam o código, de propósito:
 * adotar este componente não muda a aparência de nada, só para a sangria.
 * As cores usam as classes `purple-*`, que o tema remapeia (theme/tokens.css),
 * então continuam acompanhando os 5 temas.
 *
 * Piso de 24 px de altura em todo tamanho — mínimo de alvo de toque da
 * WCAG 2.2 AA (2.5.8).
 */

const VARIANTES = {
  primario:   'bg-purple-600 hover:bg-purple-500 text-sobre-acento',
  secundario: 'bg-slate-700 hover:bg-slate-600 text-purple-100',
  contorno:   'border border-purple-700 hover:border-purple-500 text-purple-200 hover:text-white',
  perigo:     'bg-red-800 hover:bg-red-700 text-white',
  fantasma:   'text-purple-400 hover:text-white hover:bg-purple-900/40',
  // âmbar é semântica de DADO nos tokens — use só onde há rolagem, e de forma
  // discreta: dois blocos âmbar grandes lado a lado embarravam a tela.
  dado:       'bg-amber-900/40 hover:bg-amber-800/60 border border-amber-800/60 text-amber-100',
}

const TAMANHOS = {
  sm:    'px-2.5 py-1 text-xs min-h-[24px]',
  md:    'px-3 py-2 text-sm min-h-[36px]',
  lg:    'px-4 py-2.5 text-base min-h-[44px]',
  icone: 'p-0 text-sm min-w-[28px] min-h-[28px]',
}

export default function Botao({
  variante = 'secundario',
  tamanho = 'md',
  className = '',
  children,
  ...resto
}) {
  const base = 'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors ' +
    'disabled:opacity-50 disabled:cursor-not-allowed ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/70'

  return (
    <button
      type={resto.type || 'button'}
      className={`${base} ${VARIANTES[variante] || VARIANTES.secundario} ${TAMANHOS[tamanho] || TAMANHOS.md} ${className}`}
      {...resto}
    >
      {children}
    </button>
  )
}
