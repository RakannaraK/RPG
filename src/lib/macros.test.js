import { describe, it, expect } from 'vitest'
import {
  LIMITE_NOME, adicionarMacro, editarMacro, moverMacro, normalizarMacros,
  removerMacro, resolverMacro, validarMacro,
} from './macros'

// ficha no estilo D&D: Força 18 -> mod +4, nível 5
const ctx = {
  atributos: { forca: 18, Força: 18, inteligencia: 14 },
  formulaModificador: 'piso((x-10)/2)',
  nivel: 5,
}

describe('F39 — macros de rolagem', () => {
  it('resolve fórmula da ficha dentro da notação', () => {
    expect(resolverMacro({ notacao: '1d20+mod(forca)' }, ctx)).toBe('1d20+4')
    expect(resolverMacro({ notacao: '2d6+nivel' }, ctx)).toBe('2d6+5')
  })

  it('aceita dados puros sem contexto nenhum', () => {
    expect(validarMacro({ nome: 'Bola de Fogo', notacao: '8d6' })).toEqual({ ok: true, notacao: '8d6' })
  })

  it('recusa nome vazio, nome longo e notação que não rola', () => {
    expect(validarMacro({ nome: '', notacao: '1d20' }).ok).toBe(false)
    expect(validarMacro({ nome: 'x'.repeat(LIMITE_NOME + 1), notacao: '1d20' }).ok).toBe(false)
    expect(validarMacro({ nome: 'Nada', notacao: '' }).ok).toBe(false)
    const ruim = validarMacro({ nome: 'Ruim', notacao: '1d20+atributo_que_nao_existe(' }, ctx)
    expect(ruim.ok).toBe(false)
    expect(ruim.erro).toBeTruthy()
  })

  it('normaliza lixo vindo do banco sem quebrar', () => {
    expect(normalizarMacros(null)).toEqual([])
    expect(normalizarMacros([{ nome: 'A', notacao: '1d6' }, { foo: 1 }, 'x'])).toEqual([
      { id: 'macro-0', nome: 'A', notacao: '1d6' },
    ])
  })

  it('adiciona, edita, move e remove', () => {
    let n = 0
    const id = () => `id${++n}`
    let l = adicionarMacro([], { nome: 'Ataque', notacao: '1d20+mod(forca)' }, id)
    l = adicionarMacro(l, { nome: 'Dano', notacao: '1d8+mod(forca)' }, id)
    expect(l.map(m => m.nome)).toEqual(['Ataque', 'Dano'])

    l = moverMacro(l, 'id2', -1)
    expect(l.map(m => m.nome)).toEqual(['Dano', 'Ataque'])
    expect(moverMacro(l, 'id2', -1)).toEqual(l) // já está no topo

    l = editarMacro(l, 'id1', { nome: 'Ataque com vantagem', notacao: '2d20kh1+mod(forca)' })
    expect(l.find(m => m.id === 'id1')).toMatchObject({ nome: 'Ataque com vantagem' })

    l = removerMacro(l, 'id2')
    expect(l.map(m => m.id)).toEqual(['id1'])
  })
})
