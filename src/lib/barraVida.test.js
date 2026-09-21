import { describe, it, expect } from 'vitest'
import { faixasDaBarra, nivelDeVida, textoVida } from './barraVida'

describe('barra de vida (F34)', () => {
  it('proporção e nível pela vida restante', () => {
    expect(faixasDaBarra({ atual: 20, maximo: 20 })).toMatchObject({ pct: 100, pctTemp: 0, nivel: 'cheia' })
    expect(faixasDaBarra({ atual: 10, maximo: 20 }).nivel).toBe('media')
    expect(faixasDaBarra({ atual: 4, maximo: 20 }).nivel).toBe('baixa')
    expect(faixasDaBarra({ atual: 0, maximo: 20 }).nivel).toBe('vazia')
  })
  it('escudo entra como pedaço a mais, sem passar de 100%', () => {
    const { pct, pctTemp } = faixasDaBarra({ atual: 12, maximo: 20, temp: 4 })
    expect(pct).toBe(60)
    expect(pctTemp).toBe(20)
    const cheio = faixasDaBarra({ atual: 20, maximo: 20, temp: 10 })
    expect(cheio.pct + cheio.pctTemp).toBe(100)
  })
  it('sem máximo não quebra (inimigo sem vida definida)', () => {
    expect(faixasDaBarra({ atual: 5, maximo: null })).toEqual({ pct: 0, pctTemp: 0, nivel: 'cheia' })
    expect(faixasDaBarra()).toMatchObject({ pct: 0 })
    expect(nivelDeVida(0, 0)).toBe('cheia')
  })
  it('vida negativa conta como zero', () => {
    expect(faixasDaBarra({ atual: -7, maximo: 20 })).toMatchObject({ pct: 0, nivel: 'vazia' })
    expect(textoVida({ atual: -7, maximo: 20 })).toBe('0/20')
  })
  it('texto da vida', () => {
    expect(textoVida({ atual: 12, maximo: 20, temp: 4 })).toBe('12/20 (+4)')
    expect(textoVida({ atual: 9, maximo: 0 })).toBe('9')
  })
})
