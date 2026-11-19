import { describe, expect, it } from 'vitest'
import { LIMITES_CINEMATICA, moverQuadro, normalizarQuadro, normalizarQuadros, novoQuadro, trechoDigitado, validarCinematica } from './cinematica'

describe('normalizarQuadro', () => {
  it('descarta lixo', () => {
    for (const x of [null, undefined, 5, 'a', [], true]) expect(normalizarQuadro(x)).toBeNull()
  })
  it('só aceita imagem https', () => {
    expect(normalizarQuadro({ imagem_url: 'http://x.com/a.png' }).imagem_url).toBe('')
    expect(normalizarQuadro({ imagem_url: 'javascript:alert(1)' }).imagem_url).toBe('')
    expect(normalizarQuadro({ imagem_url: 'https://x.com/a.png' }).imagem_url).toBe('https://x.com/a.png')
  })
  it('corta nos limites', () => {
    const q = normalizarQuadro({ titulo: 'a'.repeat(200), texto: 'b'.repeat(2000), imagem_url: 'https://x/' + 'c'.repeat(900) })
    expect(q.titulo).toHaveLength(LIMITES_CINEMATICA.titulo)
    expect(q.texto).toHaveLength(LIMITES_CINEMATICA.texto)
    expect(q.imagem_url).toHaveLength(LIMITES_CINEMATICA.url)
  })
  it('som desconhecido vira null', () => {
    expect(normalizarQuadro({ som: 'explosao-nuclear' }).som).toBeNull()
    expect(normalizarQuadro({ som: 'toString' }).som).toBeNull()
    expect(normalizarQuadro({ som: 'chuva' }).som).toBe('chuva')
  })
  it('segundos fora da faixa', () => {
    const s = v => normalizarQuadro({ segundos: v }).segundos
    expect(s(0)).toBe(0)
    expect(s(2)).toBe(0)
    expect(s(-5)).toBe(0)
    expect(s('x')).toBe(0)
    expect(s(3)).toBe(3)
    expect(s(500)).toBe(120)
  })
  it('campos de tipo errado viram vazio', () => {
    const q = normalizarQuadro({ titulo: 7, texto: {}, id: 9 })
    expect(q.titulo).toBe('')
    expect(q.texto).toBe('')
    expect(typeof q.id).toBe('string')
  })
})

describe('normalizarQuadros', () => {
  it('não-lista vira vazio; limita a 12 e tira inválidos', () => {
    expect(normalizarQuadros('x')).toEqual([])
    expect(normalizarQuadros(Array.from({ length: 20 }, () => ({ titulo: 'a' })))).toHaveLength(12)
    expect(normalizarQuadros([null, { titulo: 'a' }, 3])).toHaveLength(1)
  })
})

describe('validarCinematica', () => {
  const q = { ...novoQuadro(), titulo: 'Olá' }
  it('exige título, quadro e conteúdo', () => {
    expect(validarCinematica({ titulo: ' ', quadros: [q] }).ok).toBe(false)
    expect(validarCinematica({ titulo: 'A', quadros: [] }).ok).toBe(false)
    expect(validarCinematica({ titulo: 'A', quadros: [novoQuadro()] }).ok).toBe(false)
    expect(validarCinematica({ titulo: 'A', quadros: Array(13).fill(q) }).ok).toBe(false)
    expect(validarCinematica({ titulo: 'A', quadros: [q] })).toEqual({ ok: true, erro: '' })
  })
})

describe('moverQuadro', () => {
  const l = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
  it('troca vizinhos e respeita as pontas', () => {
    expect(moverQuadro(l, 'b', -1).map(q => q.id)).toEqual(['b', 'a', 'c'])
    expect(moverQuadro(l, 'b', 1).map(q => q.id)).toEqual(['a', 'c', 'b'])
    expect(moverQuadro(l, 'a', -1)).toBe(l)
    expect(moverQuadro(l, 'c', 1)).toBe(l)
    expect(moverQuadro(l, 'zz', 1)).toBe(l)
  })
})

describe('trechoDigitado', () => {
  it('revela por tempo', () => {
    expect(trechoDigitado('abcdef', 0)).toBe('')
    expect(trechoDigitado('abcdef', 100)).toBe('abcd')
    expect(trechoDigitado('abcdef', 100, 20)).toBe('ab')
    expect(trechoDigitado('abc', 99999)).toBe('abc')
    expect(trechoDigitado('abc', -50)).toBe('')
    expect(trechoDigitado(null, 1000)).toBe('')
  })
})
