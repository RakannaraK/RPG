// Fonte única de verdade para durações/easing/limites de animação no JS.
// Espelham os tokens --dur-* e --ease-* de theme/tokens.css (F52).
export const DUR_RAPIDA = 140
export const DUR_NORMAL = 220
export const DUR_LENTA = 420

export const STAGGER_STEP_MS = 30
export const STAGGER_MAX_ITEMS = 8

export function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** F52 — movimento reduzido pelo sistema OU pela preferência do usuário. */
export function movimentoReduzido() {
  if (typeof document === 'undefined') return false
  return document.documentElement.getAttribute('data-movimento') === 'reduzido'
}

// Delay (ms) do item de índice `index` num stagger de lista.
// Itens além do limite não animam (delay 0 — devem entrar instantâneos).
export function staggerDelay(index) {
  if (index < 0 || index >= STAGGER_MAX_ITEMS) return 0
  return index * STAGGER_STEP_MS
}

export function shouldStagger(index) {
  return index >= 0 && index < STAGGER_MAX_ITEMS
}
