import { describe, it, expect } from 'vitest'
import { nivelAmeaca, ordemAmeaca, valorND } from './ameaca'

describe('F52 — ameaça de criatura', () => {
  it('lê ND com fração e sem', () => {
    expect(valorND('ND 1/4')).toBe(0.25)
    expect(valorND('nd 12')).toBe(12)
    expect(valorND('CR 1/2')).toBe(0.5)
    expect(valorND('Mortal')).toBeNull()
  })

  it('nível de 1 a 5 por palavra ou ND; 0 quando não sabe', () => {
    expect(nivelAmeaca('Fácil')).toBe(1)
    expect(nivelAmeaca('lendária')).toBe(5)
    expect(nivelAmeaca('ND 1/8')).toBe(1)
    expect(nivelAmeaca('ND 3')).toBe(2)
    expect(nivelAmeaca('ND 9')).toBe(3)
    expect(nivelAmeaca('ND 20')).toBe(5)
    expect(nivelAmeaca('chefe da masmorra')).toBe(0)
  })

  it('ordena do mais fraco ao mais forte, texto desconhecido no fim', () => {
    const lista = ['Mortal', 'ND 1/4', 'chefe', 'ND 2', 'Fácil']
    expect([...lista].sort((a, b) => ordemAmeaca(a) - ordemAmeaca(b))).toEqual(['Fácil', 'ND 1/4', 'ND 2', 'Mortal', 'chefe'])
  })
})
