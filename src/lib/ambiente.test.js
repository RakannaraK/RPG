import { describe, it, expect } from 'vitest'
import { brilho, hexParaRgb, misturar, mover, nascer, quantasParticulas } from './ambiente'

// gerador previsível para o teste não depender da sorte
const semente = (s = 7) => () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646 }

describe('F52 — partículas do fundo', () => {
  it('pouca coisa: no máximo algumas dezenas, mais na sessão, menos em máquina fraca', () => {
    const normal = quantasParticulas(1440, 900)
    expect(normal).toBeGreaterThanOrEqual(10)
    expect(normal).toBeLessThanOrEqual(34)
    expect(quantasParticulas(1440, 900, { sessao: true })).toBeGreaterThan(normal)
    expect(quantasParticulas(1440, 900, { fraco: true })).toBeLessThan(normal)
    expect(quantasParticulas(375, 800)).toBeGreaterThanOrEqual(10)
    expect(quantasParticulas(5000, 3000, { sessao: true })).toBeLessThanOrEqual(56)
  })

  it('brasas sobem e somem; neve desce', () => {
    const r = semente()
    const brasa = nascer('brasas', 1000, 800, r)
    expect(brasa.vy).toBeLessThan(0)
    expect(brasa.y).toBeGreaterThanOrEqual(800)
    const neve = nascer('neve', 1000, 800, r)
    expect(neve.vy).toBeGreaterThan(0)
    let viva = true, passos = 0
    while (viva && passos < 2000) { viva = mover(brasa, 'brasas', 0.05, 1000, 800); passos++ }
    expect(viva).toBe(false) // toda brasa um dia apaga
  })

  it('brilho fica entre 0 e 1 e começa apagado', () => {
    const p = nascer('eter', 800, 600, semente(3))
    expect(brilho(p, 'eter', 600)).toBe(0)
    for (let i = 0; i < 50; i++) {
      mover(p, 'eter', 0.1, 800, 600)
      const b = brilho(p, 'eter', 600)
      expect(b).toBeGreaterThanOrEqual(0)
      expect(b).toBeLessThanOrEqual(1)
    }
  })

  it('mistura cores para a troca de tema', () => {
    expect(misturar('#000000', '#ffffff', 0.5)).toBe('#808080')
    expect(misturar('#FB923C', '#A78BFA', 0)).toBe('#fb923c')
    expect(hexParaRgb(' #A78BFA')).toEqual([167, 139, 250])
    expect(misturar('lixo', '#A78BFA', 0.3)).toBe('#A78BFA')
  })
})
