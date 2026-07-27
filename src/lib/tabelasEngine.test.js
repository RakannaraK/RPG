import { describe, it, expect } from 'vitest'
import { entradaPara, faixaDaNotacao, resultadosSemEntrada, validarTabela } from './tabelasEngine'

const RUMORES = {
  id: 't1',
  nome: 'Rumores da taverna',
  notacao: '1d6',
  entradas: [
    { de: 1, ate: 2, texto: 'Um mercador sumiu na estrada norte.' },
    { de: 3, ate: 4, texto: 'Luzes estranhas na torre velha.' },
    { de: 5, ate: 6, texto: 'O prefeito anda pagando dívidas em ouro novo.' },
  ],
}

describe('entradaPara', () => {
  it('acha a entrada da faixa que contém o valor', () => {
    expect(entradaPara(RUMORES, 1).texto).toMatch(/mercador/)
    expect(entradaPara(RUMORES, 4).texto).toMatch(/torre velha/)
    expect(entradaPara(RUMORES, 6).texto).toMatch(/prefeito/)
  })

  it('devolve null fora de qualquer faixa', () => {
    expect(entradaPara(RUMORES, 9)).toBeNull()
  })

  it('faixa aberta (ate vazio) pega tudo dali para cima', () => {
    const t = { notacao: '1d20', entradas: [{ de: 10, ate: null, texto: 'alto' }] }
    expect(entradaPara(t, 10).texto).toBe('alto')
    expect(entradaPara(t, 999).texto).toBe('alto')
    expect(entradaPara(t, 9)).toBeNull()
  })
})

describe('faixaDaNotacao', () => {
  it('calcula min e max de notações simples', () => {
    expect(faixaDaNotacao('1d6')).toEqual({ min: 1, max: 6 })
    expect(faixaDaNotacao('2d6')).toEqual({ min: 2, max: 12 })
    expect(faixaDaNotacao('d20')).toEqual({ min: 1, max: 20 })
    expect(faixaDaNotacao('1d6+2')).toEqual({ min: 3, max: 8 })
  })

  it('devolve null para notação que não reconhece', () => {
    expect(faixaDaNotacao('2d6kh1')).toBeNull()
    expect(faixaDaNotacao('')).toBeNull()
  })
})

describe('resultadosSemEntrada', () => {
  it('aponta os buracos de cobertura', () => {
    const t = { notacao: '1d6', entradas: [{ de: 1, ate: 3, texto: 'a' }] }
    expect(resultadosSemEntrada(t)).toEqual([4, 5, 6])
  })

  it('tabela completa não tem buraco', () => {
    expect(resultadosSemEntrada(RUMORES)).toEqual([])
  })
})

describe('validarTabela', () => {
  it('aceita uma tabela bem formada', () => {
    expect(validarTabela(RUMORES)).toEqual({ valida: true, erros: [] })
  })

  it('exige nome, notação e ao menos uma entrada', () => {
    const r = validarTabela({ nome: '', notacao: '', entradas: [] })
    expect(r.valida).toBe(false)
    expect(r.erros.length).toBe(3)
  })

  it('reclama de faixa invertida e de texto vazio', () => {
    const r = validarTabela({ nome: 'x', notacao: '1d6', entradas: [{ de: 5, ate: 2, texto: '' }] })
    expect(r.valida).toBe(false)
    expect(r.erros.some(e => e.includes('menor que'))).toBe(true)
    expect(r.erros.some(e => e.includes('escreva o resultado'))).toBe(true)
  })

  it('detecta faixas sobrepostas', () => {
    const r = validarTabela({
      nome: 'x', notacao: '1d6',
      entradas: [{ de: 1, ate: 3, texto: 'a' }, { de: 3, ate: 6, texto: 'b' }],
    })
    expect(r.valida).toBe(false)
    expect(r.erros.some(e => e.includes('sobrepõem'))).toBe(true)
  })
})
