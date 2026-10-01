import { describe, it, expect } from 'vitest'
import { montarNotacao, naturalD20 } from './natural'

describe('F52 — crítico e falha natural', () => {
  it('20 natural é crítico; 1 natural é falha', () => {
    expect(naturalD20([{ lados: 20, valor: 20 }])).toBe('critico')
    expect(naturalD20([{ lados: 20, valor: 1 }])).toBe('falha')
    expect(naturalD20([{ lados: 20, valor: 12 }])).toBeNull()
  })
  it('vantagem/desvantagem: o dado descartado não conta', () => {
    expect(naturalD20([{ lados: 20, valor: 20, descartado: true }, { lados: 20, valor: 7 }])).toBeNull()
    expect(naturalD20([{ lados: 20, valor: 1, descartado: true }, { lados: 20, valor: 15 }])).toBeNull()
    expect(naturalD20([{ lados: 20, valor: 1 }, { lados: 20, valor: 20, descartado: true }])).toBe('falha')
  })
  it('sem d20 não tem natural', () => {
    expect(naturalD20([{ lados: 6, valor: 6 }])).toBeNull()
    expect(naturalD20([])).toBeNull()
  })
  it('monta a notação', () => {
    expect(montarNotacao(2, 6, 3)).toBe('2d6+3')
    expect(montarNotacao(1, 20, -1)).toBe('1d20-1')
    expect(montarNotacao(0, 8, 0)).toBe('1d8')
  })
})
