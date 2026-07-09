import { describe, it, expect } from 'vitest'
import { avaliarFormula, parseFormula, validarFormula, usaAtributoOuMod, FormulaError } from './formulaEngine'

// Contextos das DUAS fichas de referência (regressão permanente)
const KRAD = {
  formulaModificador: 'piso((x-10)/2)', // D&D-like
  nivel: 13,
  atributos: { forca: 19, destreza: 14, constituicao: 18, carisma: 16, sabedoria: 12 },
  pericias: { atletismo: 7 },
  recursos: { furia: 4 },
  vida_atual: 90,
  vida_max: 120,
}

const IC = {
  formulaModificador: null, // Infinit Corridor: valor puro
  nivel: 40,
  atributos: { agilidade: 30, vitalidade: 20, forca: 25, aprendizado: 15 },
  pericias: {},
  recursos: {},
  vida_atual: 200,
  vida_max: 200,
}

const av = (f, ctx = {}) => avaliarFormula(f, ctx)

describe('aritmética e precedência', () => {
  it('precedência multiplicação sobre soma', () => {
    expect(av('2+3*4')).toBe(14)
    expect(av('(2+3)*4')).toBe(20)
  })
  it('subtração e divisão', () => {
    expect(av('10-3')).toBe(7)
    expect(av('10/4')).toBe(2.5)
    expect(av('2 - -3')).toBe(5)
  })
  it('decimais', () => {
    expect(av('2.5 + 1.5')).toBe(4)
    expect(av('0.5 * 4')).toBe(2)
  })
  it('unário negativo e positivo', () => {
    expect(av('-5')).toBe(-5)
    expect(av('-(2+3)')).toBe(-5)
    expect(av('+7')).toBe(7)
  })
  it('espaços em branco irrelevantes', () => {
    expect(av('  2  +  3 * 4 ')).toBe(14)
  })
})

describe('funções matemáticas', () => {
  it('piso/teto/arredondar com semântica de floor matemático', () => {
    expect(av('piso(1.9)')).toBe(1)
    expect(av('piso(-1.5)')).toBe(-2) // floor matemático
    expect(av('teto(1.1)')).toBe(2)
    expect(av('teto(-1.5)')).toBe(-1)
    expect(av('arredondar(2.5)')).toBe(3)
    expect(av('arredondar(2.4)')).toBe(2)
  })
  it('abs, min, max', () => {
    expect(av('abs(-7)')).toBe(7)
    expect(av('min(3, 8)')).toBe(3)
    expect(av('max(3, 8)')).toBe(8)
    expect(av('max(1, piso(9 / 4))')).toBe(2)
  })
  it('aridade errada lança erro', () => {
    expect(() => av('min(1)')).toThrow(FormulaError)
    expect(() => av('piso(1,2)')).toThrow()
  })
})

describe('variáveis', () => {
  it('atributo() por nome (case/acento-insensível)', () => {
    expect(av('atributo(forca)', KRAD)).toBe(19)
    expect(av('atributo(FORÇA)', KRAD)).toBe(19)
    expect(av('atributo(agilidade)', IC)).toBe(30)
  })
  it('mod() com fórmula de modificador do sistema', () => {
    expect(av('mod(forca)', KRAD)).toBe(4) // piso((19-10)/2)=4
    expect(av('mod(destreza)', KRAD)).toBe(2)
    expect(av('mod(constituicao)', KRAD)).toBe(4)
    expect(av('mod(carisma)', KRAD)).toBe(3)
  })
  it('mod() sem fórmula = valor puro do atributo', () => {
    expect(av('mod(forca)', IC)).toBe(25)
    expect(av('mod(agilidade)', IC)).toBe(30)
  })
  it('nivel, pericia, recurso, vida', () => {
    expect(av('5 * nivel', KRAD)).toBe(65)
    expect(av('pericia(atletismo)', KRAD)).toBe(7)
    expect(av('recurso(furia)', KRAD)).toBe(4)
    expect(av('vida_max - vida_atual', KRAD)).toBe(30)
  })
})

describe('casos reais (as 6 fórmulas da gramática)', () => {
  it('CA sem armadura do Krad = 10 + mod(destreza) + mod(constituicao)', () => {
    expect(av('10 + mod(destreza) + mod(constituicao)', KRAD)).toBe(16) // 10+2+4
  })
  it('locomoção do IC = 9 + atributo(agilidade) / 10', () => {
    expect(av('9 + atributo(agilidade) / 10', IC)).toBe(12)
  })
  it('5 * nivel', () => {
    expect(av('5 * nivel', IC)).toBe(200)
  })
  it('piso((atributo(forca) - 10) / 2) no Krad', () => {
    expect(av('piso((atributo(forca) - 10) / 2)', KRAD)).toBe(4)
  })
  it('max(1, piso(nivel / 4))', () => {
    expect(av('max(1, piso(nivel / 4))', KRAD)).toBe(3) // piso(13/4)=3
  })
  it("8 + proficiencia + mod(carisma) parseia mas falha na avaliação (F19)", () => {
    expect(validarFormula('8 + proficiencia + mod(carisma)').valida).toBe(true)
    expect(() => av('8 + proficiencia + mod(carisma)', KRAD)).toThrow(/Fase 19/)
  })
})

describe('variáveis reservadas (parseiam, avaliação avisa a fase)', () => {
  it('nivel(classe) → Fase 19', () => {
    expect(validarFormula('nivel(paladino)').valida).toBe(true)
    expect(() => av('nivel(paladino)', KRAD)).toThrow(/Fase 19/)
  })
  it('pool() → Fase 20', () => {
    expect(() => av('pool(thariuns)', IC)).toThrow(/Fase 20/)
  })
  it('maestria() → Fase 21', () => {
    expect(() => av('maestria(espada)', IC)).toThrow(/Fase 21/)
  })
})

describe('erros tratáveis', () => {
  it('divisão por zero', () => {
    expect(() => av('1/0')).toThrow(/Divisão por zero/)
    expect(() => av('5 / (2 - 2)')).toThrow(/Divisão por zero/)
  })
  it('variável/atributo inexistente com nome no erro', () => {
    expect(() => av('atributo(sabedoria)', IC)).toThrow(/sabedoria/)
    expect(() => av('atributo(sabedoria)', IC)).toThrow(/não existe/)
    expect(() => av('coragem', KRAD)).toThrow(/coragem/)
  })
  it('sintaxe inválida', () => {
    expect(() => parseFormula('2 +')).toThrow(FormulaError)
    expect(() => parseFormula('2 3')).toThrow(FormulaError)
    expect(() => parseFormula('foo(2)')).toThrow(/desconhecida/)
  })
  it('parênteses desbalanceados', () => {
    expect(() => parseFormula('(2 + 3')).toThrow(FormulaError)
    expect(() => parseFormula('2 + 3)')).toThrow(FormulaError)
  })
  it('string gigante é recusada', () => {
    expect(() => parseFormula('1+'.repeat(600) + '1')).toThrow(/longa demais/)
  })
  it('fórmula vazia', () => {
    expect(() => parseFormula('   ')).toThrow(/vazia/)
  })
})

describe('validarFormula (só sintaxe)', () => {
  it('válidas', () => {
    expect(validarFormula('10 + mod(destreza)').valida).toBe(true)
    expect(validarFormula('piso((x-10)/2)').valida).toBe(true)
  })
  it('inválidas retornam erro sem lançar', () => {
    const r = validarFormula('2 +')
    expect(r.valida).toBe(false)
    expect(typeof r.erro).toBe('string')
  })
})

describe('17.5 — usaAtributoOuMod (anti-auto-referência em modificadores)', () => {
  it('detecta atributo()/mod()', () => {
    expect(usaAtributoOuMod('10 + mod(forca)')).toBe(true)
    expect(usaAtributoOuMod('atributo(destreza)')).toBe(true)
    expect(usaAtributoOuMod('MOD(Força)')).toBe(true)
  })
  it('permite nivel/recurso/pericia/vida', () => {
    expect(usaAtributoOuMod('piso(nivel/2)')).toBe(false)
    expect(usaAtributoOuMod('5 * nivel')).toBe(false)
    expect(usaAtributoOuMod('recurso(furia) + vida_max')).toBe(false)
    expect(usaAtributoOuMod('pericia(atletismo)')).toBe(false)
  })
})

describe('retrocompatibilidade: números puros', () => {
  it('valor fixo sem variáveis', () => {
    expect(av('10')).toBe(10)
    expect(av('42')).toBe(42)
    expect(av('2.5')).toBe(2.5)
  })
})
