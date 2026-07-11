import { describe, it, expect } from 'vitest'
import { limiarCritico, dadoPuro, ehCritico, multiplicadorCritico, aplicarCritico } from './criticoEngine'
import { avaliarFormula } from './formulaEngine'

// Crítico do IC: d100, limiar dinâmico que desce com a maestria (mínimo 25)
const IC = {
  ativo: true,
  aplica_em: 'acerto',
  limiar_formula: 'max(25, 85 - 15 * piso(maestria / 2))',
  multiplicador_padrao: 2,
  modo_multiplicador: 'total',
}

describe('22.3 — variável maestria no motor de fórmulas', () => {
  it('resolve o limiar do IC por nível de maestria', () => {
    expect(avaliarFormula(IC.limiar_formula, { maestria: 0 })).toBe(85)
    expect(avaliarFormula(IC.limiar_formula, { maestria: 2 })).toBe(70)
    expect(avaliarFormula(IC.limiar_formula, { maestria: 8 })).toBe(25)
    expect(avaliarFormula(IC.limiar_formula, { maestria: 10 })).toBe(25) // piso em 25
  })
  it('maestria ausente → 0', () => {
    expect(avaliarFormula('maestria', {})).toBe(0)
  })
})

describe('22.3 — limiar de crítico (com maestria do item)', () => {
  it('desce com a maestria, com piso 25', () => {
    expect(limiarCritico(IC, { maestria: 0 })).toBe(85)
    expect(limiarCritico(IC, { maestria: 2 })).toBe(70)
    expect(limiarCritico(IC, { maestria: 8 })).toBe(25)
    expect(limiarCritico(IC, { maestria: 10 })).toBe(25)
  })
  it('d20 clássico com limiar fixo 20', () => {
    const d20 = { ativo: true, limiar_formula: '20', multiplicador_padrao: 2 }
    expect(limiarCritico(d20, {})).toBe(20)
  })
  it('desativado ou sem fórmula → null', () => {
    expect(limiarCritico({ ativo: false, limiar_formula: '20' }, {})).toBeNull()
    expect(limiarCritico({ ativo: true, limiar_formula: '' }, {})).toBeNull()
  })
  it('fórmula quebrada → null (não derruba)', () => {
    expect(limiarCritico({ ativo: true, limiar_formula: 'maestria +' }, {})).toBeNull()
  })
})

describe('22.3 — detecção no DADO PURO', () => {
  it('soma as faces roladas', () => {
    expect(dadoPuro([{ valor: 91 }])).toBe(91)
    expect(dadoPuro([{ valor: 18 }])).toBe(18)
    expect(dadoPuro([18])).toBe(18)
  })
  it('crítico quando o dado puro alcança o limiar', () => {
    expect(ehCritico(91, 70)).toBe(true)   // rolou 91, limiar 70 (maestria 2)
    expect(ehCritico(69, 70)).toBe(false)
    expect(ehCritico(20, 20)).toBe(true)   // d20 natural 20
    expect(ehCritico(19, 20)).toBe(false)
  })
  it('sem limiar (null) → nunca crítico', () => {
    expect(ehCritico(100, null)).toBe(false)
  })
})

describe('22.4 — multiplicador (categoria sobrescreve o padrão)', () => {
  it('padrão do sistema; categoria pode sobrescrever (machados ×3)', () => {
    expect(multiplicadorCritico(IC, null)).toBe(2)
    expect(multiplicadorCritico(IC, { multiplicador: 3 })).toBe(3)
  })
  it('sem nada → 2', () => {
    expect(multiplicadorCritico({}, null)).toBe(2)
  })
})

describe('22.4 — aplicar crítico: modo total x dados (antes dos percentuais)', () => {
  it('modo "total" dobra o resultado (house rule do Krad)', () => {
    // 2d6=8 + 3 fixo = 11 → ×2 = 22
    expect(aplicarCritico({ dadosTotal: 8, fixos: 3, multiplicador: 2, modo: 'total' })).toBe(22)
  })
  it('modo "dados" dobra só os dados; fixos uma vez (estilo clássico)', () => {
    // 2d6=8 ×2 = 16, + 3 fixo = 19
    expect(aplicarCritico({ dadosTotal: 8, fixos: 3, multiplicador: 2, modo: 'dados' })).toBe(19)
  })
  it('multiplicador ×3', () => {
    expect(aplicarCritico({ dadosTotal: 8, fixos: 0, multiplicador: 3, modo: 'total' })).toBe(24)
  })
  it('ordem com percentual: crítico ANTES do +20% (contrato F22.4)', () => {
    // dados+fixos=11 → ×2 (crítico) = 22 → +20% = piso(22×1.2) = 26
    const critico = aplicarCritico({ dadosTotal: 8, fixos: 3, multiplicador: 2, modo: 'total' })
    expect(Math.floor(critico * (1 + 20 / 100))).toBe(26)
  })
})
