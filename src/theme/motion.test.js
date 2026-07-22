import { describe, it, expect } from 'vitest'
import {
  staggerDelay,
  shouldStagger,
  prefersReducedMotion,
  STAGGER_STEP_MS,
  STAGGER_MAX_ITEMS,
} from './motion'

describe('staggerDelay', () => {
  it('escalona 30ms por item dentro do limite', () => {
    expect(staggerDelay(0)).toBe(0)
    expect(staggerDelay(1)).toBe(STAGGER_STEP_MS)
    expect(staggerDelay(3)).toBe(3 * STAGGER_STEP_MS)
  })

  it('itens além do limite não recebem delay', () => {
    expect(staggerDelay(STAGGER_MAX_ITEMS)).toBe(0)
    expect(staggerDelay(50)).toBe(0)
  })
})

describe('shouldStagger', () => {
  it('true dentro do limite, false fora', () => {
    expect(shouldStagger(0)).toBe(true)
    expect(shouldStagger(STAGGER_MAX_ITEMS - 1)).toBe(true)
    expect(shouldStagger(STAGGER_MAX_ITEMS)).toBe(false)
    expect(shouldStagger(-1)).toBe(false)
  })
})

describe('prefersReducedMotion', () => {
  it('retorna false quando window/matchMedia não existem (ambiente de teste)', () => {
    expect(prefersReducedMotion()).toBe(false)
  })
})
