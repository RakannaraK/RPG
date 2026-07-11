import { describe, it, expect } from 'vitest'
import { calcularValoresFinais, resolverValoresFormula, coletarModificadores } from './modifierEngine'

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
  it('soma negativa sem percentual não é zerada (piso em 0 é só do passo de %)', () => {
    // engine pré-Fase-18 retornava -10; sem percentual, nada muda
    expect(calc(10, [{ operacao: 'somar', valor: -20 }])).toBe(-10)
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

describe('19.1 — coleta multiclasse (várias classes)', () => {
  const forca = { tipo: 'atributo', alvo: 'a', operacao: 'somar', valor: 2 }
  const carisma = { tipo: 'atributo', alvo: 'a', operacao: 'somar', valor: 3 }
  const barbaro = { nome: 'Bárbaro', modificadores: [forca] }
  const paladino = { nome: 'Paladino', modificadores: [carisma] }

  it('coleta modificadores de TODAS as classes da ficha', () => {
    const mods = coletarModificadores({ classes: [barbaro, paladino] })
    expect(mods).toHaveLength(2)
    expect(mods.map(m => m._fonte).sort()).toEqual(['Bárbaro', 'Paladino'])
  })

  it('retrocompat: `classe` (single) continua funcionando igual', () => {
    const mods = coletarModificadores({ classe: barbaro })
    expect(mods).toHaveLength(1)
    expect(mods[0]._fonte).toBe('Bárbaro')
  })

  it('classes vazio/ausente → nenhum modificador de classe', () => {
    expect(coletarModificadores({ classes: [] })).toHaveLength(0)
    expect(coletarModificadores({})).toHaveLength(0)
  })
})

describe('21 — itens como fonte de modificador', () => {
  const conv = { tipo: 'converter', operacao: 'converter', alvo: 'tipo_dano', valor: '{"de":"fisico","para":"eletrico"}' }
  const manoplas = nome => ({ id: 'i1', nome, equipado: true, modificadores: [conv] })

  it('item equipado contribui seus modificadores, com _fonte e _origemItemId', () => {
    const mods = coletarModificadores({ itens: [manoplas('Manoplas')] })
    expect(mods).toHaveLength(1)
    expect(mods[0]._fonte).toBe('Manoplas')
    expect(mods[0]._origemItemId).toBe('i1')
    expect(mods[0].operacao).toBe('converter')
  })

  it('item NÃO equipado não contribui', () => {
    expect(coletarModificadores({ itens: [{ id: 'i1', nome: 'X', equipado: false, modificadores: [conv] }] })).toHaveLength(0)
  })

  it('item danificado (durabilidade 0) não contribui', () => {
    const danif = { id: 'i1', nome: 'X', equipado: true, durabilidade: { atual: 0, maximo: 10 }, modificadores: [conv] }
    expect(coletarModificadores({ itens: [danif] })).toHaveLength(0)
  })

  it('item sem modificadores é ignorado; equipado default (undefined) conta', () => {
    expect(coletarModificadores({ itens: [{ id: 'i1', nome: 'X' }] })).toHaveLength(0)
    const semFlag = { id: 'i2', nome: 'Anel', modificadores: [{ tipo: 'atributo', alvo: 'a', operacao: 'somar', valor: 2 }] }
    expect(coletarModificadores({ itens: [semFlag] })).toHaveLength(1)
  })

  it('convive com raça/classe/habilidade na mesma coleta', () => {
    const classe = { nome: 'Bárbaro', modificadores: [{ tipo: 'atributo', alvo: 'a', operacao: 'somar', valor: 2 }] }
    const mods = coletarModificadores({ classes: [classe], itens: [manoplas('Manoplas')] })
    expect(mods).toHaveLength(2)
    expect(mods.map(m => m._fonte).sort()).toEqual(['Bárbaro', 'Manoplas'])
  })
})
