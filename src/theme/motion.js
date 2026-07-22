// Fonte única de verdade para durações/easing/limites de animação (FV seção 2).
export const PAGE_TRANSITION_MS = 200
export const PAGE_TRANSITION_EASING = 'cubic-bezier(.2,.8,.2,1)'
export const PAGE_TRANSITION_RISE_PX = 8

export const STAGGER_STEP_MS = 30
export const STAGGER_MAX_ITEMS = 8

export const TOGGLE_TRANSITION_MS = 150
export const PRESS_SCALE = 0.98

export function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
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
