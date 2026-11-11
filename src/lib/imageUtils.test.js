import { describe, it, expect } from 'vitest'
import { ehAnimada, extensaoDe } from './imageUtils'

const bytes = (...partes) => new Uint8Array(partes.flatMap(p => (typeof p === 'string' ? [...p].map(c => c.charCodeAt(0)) : p)))

describe('ehAnimada', () => {
  it('GIF é sempre animado', () => expect(ehAnimada(bytes('GIF89a'), 'image/gif')).toBe(true))
  it('WebP com ANIM', () => {
    expect(ehAnimada(bytes('RIFF', [0, 0, 0, 0], 'WEBPVP8X', [0, 0, 0, 0, 0x12, 0, 0, 0], 'ANIM'), 'image/webp')).toBe(true)
    expect(ehAnimada(bytes('RIFF', [0, 0, 0, 0], 'WEBPVP8 ', [0, 0, 0, 0]), 'image/webp')).toBe(false)
  })
  it('PNG com acTL antes do IDAT', () => {
    expect(ehAnimada(bytes('\x89PNG', 'IHDR', 'acTL', 'IDAT'), 'image/png')).toBe(true)
    expect(ehAnimada(bytes('\x89PNG', 'IHDR', 'IDAT', 'acTL'), 'image/png')).toBe(false)
    expect(ehAnimada(bytes('\x89PNG', 'IHDR', 'IDAT'), 'image/png')).toBe(false)
  })
  it('JPEG nunca', () => expect(ehAnimada(bytes('acTL'), 'image/jpeg')).toBe(false))
})

describe('extensaoDe', () => {
  it('por tipo', () => {
    expect(extensaoDe({ type: 'image/gif' })).toBe('gif')
    expect(extensaoDe({ type: 'image/webp' })).toBe('webp')
    expect(extensaoDe({ type: 'image/png' })).toBe('png')
    expect(extensaoDe({ type: 'image/jpeg' })).toBe('jpg')
    expect(extensaoDe({ type: '' })).toBe('jpg')
  })
})
