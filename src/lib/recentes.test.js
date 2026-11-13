import { describe, it, expect } from 'vitest'
import { tipoDaRota, registrarVisita, rotuloDe } from './recentes'

describe('rotuloDe', () => {
  it('monta o texto por tipo', () => {
    const mesa = { nome: 'M' }
    expect(rotuloDe({ tipo: 'ficha' }, mesa, { nome_personagem: 'Ana' })).toBe('Ficha de Ana')
    expect(rotuloDe({ tipo: 'ficha' }, mesa, null)).toBe('Ficha de Ficha')
    expect(rotuloDe({ tipo: 'sessao' }, mesa)).toBe('Sessão em M')
    expect(rotuloDe({ tipo: 'mapa' }, mesa)).toBe('Mapa de M')
    expect(rotuloDe({ tipo: 'mesa' }, mesa)).toBe('M')
  })
})

describe('recentes', () => {
  it('reconhece os 4 tipos e ignora o resto', () => {
    expect(tipoDaRota('/mesa/a')).toMatchObject({ tipo: 'mesa', mesaId: 'a' })
    expect(tipoDaRota('/mesa/a/ficha/f1')).toMatchObject({ tipo: 'ficha', mesaId: 'a', fichaId: 'f1' })
    expect(tipoDaRota('/mesa/a/sessao/s1')).toMatchObject({ tipo: 'sessao', sessaoId: 's1' })
    expect(tipoDaRota('/mesa/a/mapa/')).toMatchObject({ tipo: 'mapa', rota: '/mesa/a/mapa' })
    expect(tipoDaRota('/dashboard')).toBeNull()
    expect(tipoDaRota('/mesa/a/outra')).toBeNull()
  })
  it('não repete a rota e traz a mais nova primeiro', () => {
    let l = registrarVisita([], { ...tipoDaRota('/mesa/a'), em: 1 })
    l = registrarVisita(l, { ...tipoDaRota('/mesa/b'), em: 2 })
    l = registrarVisita(l, { ...tipoDaRota('/mesa/a'), em: 3 })
    expect(l.map(v => v.mesaId)).toEqual(['a', 'b'])
    expect(l[0].em).toBe(3)
  })
  it('guarda no máximo 10', () => {
    let l = []
    for (let i = 0; i < 15; i++) l = registrarVisita(l, tipoDaRota(`/mesa/m${i}`))
    expect(l).toHaveLength(10)
    expect(l[0].mesaId).toBe('m14')
  })
})
