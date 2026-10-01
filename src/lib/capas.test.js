import { describe, it, expect } from 'vitest'
import { CAPAS, acharCapa, capaDaMesa } from './capas'

describe('capas de mesa', () => {
  it('acha a capa escolhida e ignora id inexistente', () => {
    expect(acharCapa('arcano')?.arte).toBe('tomo')
    expect(acharCapa('nao-existe')).toBeNull()
    expect(acharCapa(null)).toBeNull()
  })

  it('F52 — sem capa escolhida, a mesa ganha uma fixa derivada do id', () => {
    expect(capaDaMesa({ id: 'x', capa: 'guarda' })).toBe('guarda')
    const a = capaDaMesa({ id: '208beb62-ac3f-4884-945f-4551be0c58a6' })
    expect(CAPAS.some(c => c.id === a)).toBe(true)
    expect(capaDaMesa({ id: '208beb62-ac3f-4884-945f-4551be0c58a6' })).toBe(a) // estável
    const varias = new Set(Array.from({ length: 40 }, (_, i) => capaDaMesa({ id: `mesa-${i}` })))
    expect(varias.size).toBeGreaterThan(3) // espalha entre as capas
  })
})
