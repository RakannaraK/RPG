import { describe, it, expect } from 'vitest'
import { faixaDefesa, aplicarReducao, resolverDefesa, validarFaixasDefesa } from './defesaEngine'

// Faixas do sistema de referência (90/60/35)
const FAIXAS = [
  { de: 5, ate: null, reducao_percentual: 90, rotulo: 'Defesa superior' },
  { de: -4, ate: 4, reducao_percentual: 60, rotulo: 'Empate técnico' },
  { de: null, ate: -5, reducao_percentual: 35, rotulo: 'Defesa inferior' },
]

describe('22.5 — faixa pela diferença (defesa − ataque)', () => {
  it('+7 → defesa superior (90%)', () => {
    expect(faixaDefesa(7, FAIXAS).reducao_percentual).toBe(90)
  })
  it('0 → empate técnico (60%)', () => {
    expect(faixaDefesa(0, FAIXAS).reducao_percentual).toBe(60)
  })
  it('-9 → defesa inferior (35%)', () => {
    expect(faixaDefesa(-9, FAIXAS).reducao_percentual).toBe(35)
  })
  it('extremos exatos das faixas', () => {
    expect(faixaDefesa(5, FAIXAS).reducao_percentual).toBe(90)
    expect(faixaDefesa(4, FAIXAS).reducao_percentual).toBe(60)
    expect(faixaDefesa(-4, FAIXAS).reducao_percentual).toBe(60)
    expect(faixaDefesa(-5, FAIXAS).reducao_percentual).toBe(35)
  })
})

describe('22.5 — redução do dano (com piso)', () => {
  it('90% de redução sobre 20 → 2', () => {
    expect(aplicarReducao(20, 90)).toBe(2)
  })
  it('60% sobre 20 → 8', () => {
    expect(aplicarReducao(20, 60)).toBe(8)
  })
  it('piso: nunca negativo; 100% → 0', () => {
    expect(aplicarReducao(20, 100)).toBe(0)
    expect(aplicarReducao(20, 130)).toBe(0)
  })
  it('frações para baixo', () => {
    expect(aplicarReducao(11, 35)).toBe(7) // floor(11 × 0.65 = 7.15)
  })
})

describe('22.5 — resolverDefesa (o feed "Zara desviou (78 vs 71, +7): −90% → 2")', () => {
  it('desvio superior reduz 90%', () => {
    const r = resolverDefesa({ ataque: 71, defesa: 78, dano: 20, faixas: FAIXAS })
    expect(r.diferenca).toBe(7)
    expect(r.reducao).toBe(90)
    expect(r.danoReduzido).toBe(2)
    expect(r.rotuloFaixa).toBe('Defesa superior')
  })
  it('sem faixa cobrindo → dano cheio', () => {
    const r = resolverDefesa({ ataque: 0, defesa: 0, dano: 20, faixas: [{ de: 100, ate: null, reducao_percentual: 90 }] })
    expect(r.faixa).toBeNull()
    expect(r.danoReduzido).toBe(20)
  })
})

describe('22.5 — validação das faixas (contíguas, sem sobreposição)', () => {
  it('as faixas de referência são válidas (extremos abertos dos dois lados)', () => {
    expect(validarFaixasDefesa(FAIXAS).valida).toBe(true)
  })
  it('rejeita sobreposição', () => {
    const fs = [{ de: 5, ate: null, reducao_percentual: 90 }, { de: 3, ate: 4, reducao_percentual: 60 }, { de: null, ate: 2, reducao_percentual: 35 }]
    // 3..4 e depois 5..∞ não se sobrepõem, mas null..2 e 3..4 são contíguas; ok. Vamos criar sobreposição real:
    const sobrep = [{ de: -4, ate: 5, reducao_percentual: 60 }, { de: 4, ate: null, reducao_percentual: 90 }, { de: null, ate: -5, reducao_percentual: 35 }]
    expect(validarFaixasDefesa(sobrep).valida).toBe(false)
  })
  it('rejeita buraco', () => {
    const fs = [{ de: 6, ate: null, reducao_percentual: 90 }, { de: -4, ate: 4, reducao_percentual: 60 }, { de: null, ate: -5, reducao_percentual: 35 }]
    expect(validarFaixasDefesa(fs).valida).toBe(false) // 4→6 pula o 5
  })
  it('rejeita redução vazia e lista vazia', () => {
    expect(validarFaixasDefesa([{ de: null, ate: null, reducao_percentual: '' }]).valida).toBe(false)
    expect(validarFaixasDefesa([]).valida).toBe(false)
  })
  it('só a primeira aberta embaixo, só a última aberta em cima', () => {
    const meioAberto = [{ de: null, ate: 4, reducao_percentual: 60 }, { de: null, ate: null, reducao_percentual: 90 }]
    expect(validarFaixasDefesa(meioAberto).valida).toBe(false)
  })
})
