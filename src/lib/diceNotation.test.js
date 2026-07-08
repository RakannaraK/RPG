import { describe, it, expect } from 'vitest'
import { resolverNotacaoFormula, validarNotacao, parseNotacao } from './diceNotation'

const KRAD = {
  formulaModificador: 'piso((x-10)/2)',
  nivel: 13,
  atributos: { forca: 19, destreza: 14, constituicao: 18 },
}
const IC = {
  formulaModificador: null,
  nivel: 40,
  atributos: { agilidade: 30, vitalidade: 20, aprendizado: 15 },
}

const res = (n, c) => resolverNotacaoFormula(n, c).notacao

describe('17.2 — retrocompatibilidade (notações sem fórmula passam intactas)', () => {
  it('notações padrão inalteradas', () => {
    expect(res('2d6+3')).toBe('2d6+3')
    expect(res('1d20')).toBe('1d20')
    expect(res('2d6-1')).toBe('2d6-1')
    expect(res('4d6kh3')).toBe('4d6kh3')
    expect(res('1d8+2d4+5')).toBe('1d8+2d4+5')
  })
  it('o resultado continua válido pro parser da Fase 7', () => {
    expect(validarNotacao(res('2d6+3'))).toBe(true)
    expect(validarNotacao(res('4d6kh3'))).toBe(true)
  })
})

describe('17.2 — quantidade de dados por variável', () => {
  it('(vitalidade)d3 com atalho nome=atributo', () => {
    expect(res('(vitalidade)d3', { atributos: { vitalidade: 5 } })).toBe('5d3')
  })
  it('4d4+(vitalidade)d3 (vida por nível do IC)', () => {
    expect(res('4d4+(vitalidade)d3', IC)).toBe('4d4+20d3')
  })
  it('(nivel)d6 usa a variável embutida nivel', () => {
    expect(res('(nivel)d6', KRAD)).toBe('13d6')
  })
  it('quantidade piso e mínimo 0 (grupo omitido)', () => {
    expect(res('(vitalidade)d3', { atributos: { vitalidade: 0 } })).toBe('')
    expect(res('4d4+(vitalidade)d3', { atributos: { vitalidade: 0 } })).toBe('4d4')
    // 2.9 → piso → 2
    expect(res('(agilidade)d6', { atributos: { agilidade: 2.9 } })).toBe('2d6')
  })
})

describe('17.2 — modificador por fórmula', () => {
  it('1d8+mod(forca) no Krad', () => {
    expect(res('1d8+mod(forca)', KRAD)).toBe('1d8+4')
  })
  it('1d8-mod(forca) (sinal do termo)', () => {
    expect(res('1d8-mod(forca)', KRAD)).toBe('1d8-4')
  })
  it('modificador fracionário é pisado', () => {
    // agilidade 30 /10 = 3
    expect(res('1d8+atributo(agilidade)/10', IC)).toBe('1d8+3')
    // agilidade 25 /10 = 2.5 → piso 2
    expect(res('1d8+atributo(agilidade)/10', { atributos: { agilidade: 25 } })).toBe('1d8+2')
  })
})

describe('17.2 — detalhamento e erros', () => {
  it('substituições registradas para o feed', () => {
    const r = resolverNotacaoFormula('4d4+(vitalidade)d3+mod(forca)', KRAD_com_vit())
    expect(r.substituicoes).toEqual([
      { expr: 'vitalidade', valor: 5, tipo: 'quantidade' },
      { expr: 'mod(forca)', valor: 4, tipo: 'modificador' },
    ])
  })
  it('variável/atributo inexistente lança erro claro', () => {
    expect(() => resolverNotacaoFormula('(coragem)d3', { atributos: {} })).toThrow(/coragem/)
  })
  it('resultado resolvido continua parseável', () => {
    const n = res('4d4+(vitalidade)d3', IC)
    expect(() => parseNotacao(n)).not.toThrow()
  })
})

function KRAD_com_vit() {
  return { ...KRAD, atributos: { ...KRAD.atributos, vitalidade: 5 } }
}
