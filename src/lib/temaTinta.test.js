import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('../theme/tokens.css', import.meta.url), 'utf8')
const bloco = css.match(/:root\[data-tema="tinta"\]\s*\{([^}]*)\}/)[1]
const v = nome => bloco.match(new RegExp(`${nome}: *([^;]+);`))[1].trim()
const canais = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16))
const lum = ([r, g, b]) => {
  const f = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}
const razao = (a, b) => {
  const [x, y] = [lum(canais(v(a))), lum(canais(v(b)))].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

describe('tema Tinta e Brasa', () => {
  it('contraste WCAG', () => {
    expect(razao('--ink', '--bg')).toBeGreaterThanOrEqual(7)
    expect(razao('--accent-400', '--bg')).toBeGreaterThanOrEqual(4.5)
    expect(razao('--sobre-acento', '--accent-600')).toBeGreaterThanOrEqual(4.5)
    expect(razao('--dice-400', '--bg')).toBeGreaterThanOrEqual(4.5)
  })
  it('todo hex tem o canal -c igual', () => {
    for (const nome of ['bg', 'void', 'raised', 'hover', 'border', 'ink', 'accent-300', 'accent-400', 'accent-500', 'accent-600', 'accent-700', 'accent-800', 'dice-200', 'dice-400', 'dice-500', 'dice-700']) {
      expect(v(`--${nome}-c`).split(' ').map(Number), nome).toEqual(canais(v(`--${nome}`)))
    }
  })
})
