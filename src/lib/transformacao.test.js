import { describe, it, expect } from 'vitest'
import {
  formasDaFicha, fichaValendo, estaTransformado, rotuloDaForma, planejarTransformacao, ehFichaDeJogador,
} from './transformacao'

const base = { id: 'b', nome_personagem: 'Aria', tipo_ficha: 'personagem', forma_de_id: null, forma_ativa_id: null }
const lobo = { id: 'f1', nome_personagem: 'Lobo', tipo_ficha: 'forma', forma_de_id: 'b', created_at: '2026-01-01' }
const urso = { id: 'f2', nome_personagem: 'Urso', tipo_ficha: 'forma', forma_de_id: 'b', created_at: '2026-01-02' }
const alheia = { id: 'f3', nome_personagem: 'Corvo', tipo_ficha: 'forma', forma_de_id: 'outra', created_at: '2026-01-03' }
const todas = [base, lobo, urso, alheia]

describe('formas', () => {
  it('lista só as formas da ficha, em ordem de criação', () => {
    expect(formasDaFicha(todas, 'b').map(f => f.nome_personagem)).toEqual(['Lobo', 'Urso'])
  })
  it('sem forma ativa, quem vale é a base', () => {
    expect(fichaValendo(base, todas).id).toBe('b')
    expect(estaTransformado(base, todas)).toBe(false)
    expect(rotuloDaForma(base, todas)).toBe('Aria')
  })
  it('transformado: vale a forma e o rótulo mostra as duas', () => {
    const transformada = { ...base, forma_ativa_id: 'f1' }
    const lista = [transformada, lobo, urso]
    expect(fichaValendo(transformada, lista).nome_personagem).toBe('Lobo')
    expect(estaTransformado(transformada, lista)).toBe(true)
    expect(rotuloDaForma(transformada, lista)).toBe('Aria (Lobo)')
  })
  it('forma apagada ou de outra ficha não vale (volta para a base)', () => {
    expect(fichaValendo({ ...base, forma_ativa_id: 'sumiu' }, todas).id).toBe('b')
    expect(fichaValendo({ ...base, forma_ativa_id: 'f3' }, todas).id).toBe('b')
  })
  it('planejar: transformar, voltar e recusar forma alheia', () => {
    expect(planejarTransformacao(base, 'f1', todas)).toEqual({ forma_ativa_id: 'f1' })
    expect(planejarTransformacao({ ...base, forma_ativa_id: 'f1' }, 'f1', todas)).toEqual({ forma_ativa_id: null })
    expect(planejarTransformacao(base, null, todas)).toEqual({ forma_ativa_id: null })
    expect(() => planejarTransformacao(base, 'f3', todas)).toThrow(/não é desta ficha/)
  })
  it('forma não conta como personagem da mesa', () => {
    expect(ehFichaDeJogador(base)).toBe(true)
    expect(ehFichaDeJogador(lobo)).toBe(false)
    expect(ehFichaDeJogador({ tipo_ficha: 'criatura' })).toBe(false)
  })
})
