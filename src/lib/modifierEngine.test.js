import { describe, it, expect } from 'vitest'
import { calcularValoresFinais, resolverValoresFormula } from './modifierEngine'

// Aplica uma lista de operações a um único atributo 'a' com base dada
function calc(base, ops) {
  const mods = ops.map(o => ({ tipo: 'atributo', alvo: 'a', ...o }))
  return calcularValoresFinais({ atributos: { a: base }, vida_max: 0, combate: {} }, mods).atributos.a
}

describe('18.1 — ordem de operações oficial (exemplos canônicos)', () => {
  it('A: base 20, +5 soma, +13% e +10% → 30', () => {
    expect(calc(20, [
      { operacao: 'somar', valor: 5 },
      { operacao: 'percentual', valor: 13, _fonte: 'Lutador' },
      { operacao: 'percentual', valor: 10, _fonte: 'Transformação' },
    ])).toBe(30)
  })
  it('B: base 40, +10 soma, -30% → 35', () => {
    expect(calc(40, [
      { operacao: 'somar', valor: 10 },
      { operacao: 'percentual', valor: -30 },
    ])).toBe(35)
  })
  it('C: multiplicador duro ×2 sobre 60 → 120', () => {
    expect(calc(60, [{ operacao: 'multiplicar', valor: 2 }])).toBe(120)
  })
  it('D: definir vence toda a cadeia', () => {
    expect(calc(20, [
      { operacao: 'somar', valor: 5 },
      { operacao: 'percentual', valor: 13 },
      { operacao: 'multiplicar', valor: 3 },
      { operacao: 'definir', valor: 15 },
    ])).toBe(15)
  })
})

describe('18.1 — percentuais aditivos (não compostos)', () => {
  it('13% + 10% = 23% sobre 25 → piso(30.75)=30 (não 31)', () => {
    // composto seria floor(25*1.13*1.10)=floor(31.075)=31
    expect(calc(20, [
      { operacao: 'somar', valor: 5 },
      { operacao: 'percentual', valor: 13 },
      { operacao: 'percentual', valor: 10 },
    ])).toBe(30)
  })
  it('percentual sozinho (sem somas)', () => {
    expect(calc(100, [{ operacao: 'percentual', valor: 50 }])).toBe(150)
  })
})

describe('18.1 — piso, negativos, zero', () => {
  it('piso após percentuais: 33 × 1.10 = 36.3 → 36', () => {
    expect(calc(33, [{ operacao: 'percentual', valor: 10 }])).toBe(36)
  })
  it('percentual que zera/negativa → piso em 0', () => {
    expect(calc(10, [{ operacao: 'percentual', valor: -200 }])).toBe(0)
    expect(calc(10, [{ operacao: 'percentual', valor: -100 }])).toBe(0)
  })
})

describe('18.1 — ordem: definir > multiplicar > percentual > somas', () => {
  it('sequência de multiplicadores', () => {
    expect(calc(10, [{ operacao: 'multiplicar', valor: 2 }, { operacao: 'multiplicar', valor: 3 }])).toBe(60)
  })
  it('percentual antes do multiplicar', () => {
    // 20 → +50% = 30 → ×2 = 60
    expect(calc(20, [{ operacao: 'percentual', valor: 50 }, { operacao: 'multiplicar', valor: 2 }])).toBe(60)
  })
})

describe('18.1 — regressão F9 (sem percentual, comportamento antigo intacto)', () => {
  it('só somas', () => {
    expect(calc(10, [{ operacao: 'somar', valor: 3 }, { operacao: 'somar', valor: 2 }])).toBe(15)
  })
  it('somas + multiplicar (como antes)', () => {
    expect(calc(10, [{ operacao: 'somar', valor: 5 }, { operacao: 'multiplicar', valor: 2 }])).toBe(30)
  })
  it('definir sobrescreve', () => {
    expect(calc(10, [{ operacao: 'somar', valor: 5 }, { operacao: 'definir', valor: 8 }])).toBe(8)
  })
})

describe('18.1 — detalhamento por passos', () => {
  it('inclui passos no detalhamento', () => {
    const r = calcularValoresFinais(
      { atributos: { a: 20 }, vida_max: 0, combate: {} },
      [
        { tipo: 'atributo', alvo: 'a', operacao: 'somar', valor: 5, _fonte: 'Espada' },
        { tipo: 'atributo', alvo: 'a', operacao: 'percentual', valor: 23, _fonte: 'Lutador' },
      ]
    )
    const p = r.detalhamento.atributos.a.passos
    expect(p.base).toBe(20)
    expect(p.subtotal1).toBe(25)
    expect(p.percTotal).toBe(23)
    expect(p.subtotal2).toBe(30)
    expect(r.atributos.a).toBe(30)
  })
})

describe('18.1 — percentual com fórmula no valor (via 17.5 antes do pipeline)', () => {
  it('percentual = nivel (resolvido) aplica corretamente', () => {
    const mods = resolverValoresFormula(
      [{ tipo: 'atributo', alvo: 'a', operacao: 'percentual', valor: 'nivel', valor_e_formula: true }],
      { nivel: 20 }
    )
    const final = calcularValoresFinais({ atributos: { a: 50 }, vida_max: 0, combate: {} }, mods).atributos.a
    expect(final).toBe(60) // 50 × 1.20
  })
})
