import { describe, it, expect } from 'vitest'
import { modoProgressao, limiarNivel, nivelPorXp, progressoXp } from './progressaoEngine'

// Infinit Corridor — curva por fórmula: "nv2 = 100; +200 por nível"
const IC = { modo: 'formula', formula: '100 + (nivel - 1) * 200' }

// Sistema por tabela (o mestre digita; nada de preset nomeado de D&D)
const TABELA = { modo: 'tabela', tabela: [0, 300, 900, 2700, 6500] }

// Krad: nível 13, XP 127.911 / 140.000
const KRAD = {
  modo: 'tabela',
  tabela: [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000],
}

const NENHUM = { modo: 'nenhum' }

describe('19.3 — modo de progressão', () => {
  it('reconhece os três modos; desconhecido/ausente vira nenhum', () => {
    expect(modoProgressao(IC)).toBe('formula')
    expect(modoProgressao(TABELA)).toBe('tabela')
    expect(modoProgressao(NENHUM)).toBe('nenhum')
    expect(modoProgressao(null)).toBe('nenhum')
    expect(modoProgressao({ modo: 'xyz' })).toBe('nenhum')
  })
})

describe('19.3 — curva por fórmula (Infinit Corridor)', () => {
  it('nv1 → nv2 custa 100 XP', () => {
    expect(limiarNivel(1, IC)).toBe(0)
    expect(limiarNivel(2, IC)).toBe(100)
  })
  it('limiar acumula os custos (100, +300, +500)', () => {
    expect(limiarNivel(3, IC)).toBe(400)  // 100 + 300
    expect(limiarNivel(4, IC)).toBe(900)  // 400 + 500
  })
  it('nivelPorXp acompanha a curva', () => {
    expect(nivelPorXp(0, IC)).toBe(1)
    expect(nivelPorXp(99, IC)).toBe(1)
    expect(nivelPorXp(100, IC)).toBe(2)
    expect(nivelPorXp(399, IC)).toBe(2)
    expect(nivelPorXp(400, IC)).toBe(3)
  })
  it('cruzar o limiar libera o aviso de subir de nível', () => {
    expect(progressoXp(50, 1, IC).podeSubir).toBe(false)
    expect(progressoXp(50, 1, IC).faltam).toBe(50)
    expect(progressoXp(50, 1, IC).pct).toBe(50)
    expect(progressoXp(100, 1, IC).podeSubir).toBe(true)
    expect(progressoXp(250, 1, IC).podeSubir).toBe(true) // XP de sobra não some
  })
  it('fórmula inválida propaga erro (falhar alto e claro)', () => {
    expect(() => limiarNivel(2, { modo: 'formula', formula: 'nivel +' })).toThrow()
  })
})

describe('19.3 — curva por tabela', () => {
  it('limiar lê o XP acumulado da tabela', () => {
    expect(limiarNivel(1, TABELA)).toBe(0)
    expect(limiarNivel(2, TABELA)).toBe(300)
    expect(limiarNivel(5, TABELA)).toBe(6500)
  })
  it('além do fim da tabela → sem próximo nível', () => {
    expect(limiarNivel(6, TABELA)).toBeNull()
    const p = progressoXp(99999, 5, TABELA)
    expect(p.noMaximo).toBe(true)
    expect(p.podeSubir).toBe(false)
    expect(p.pct).toBe(100)
  })
  it('nivelPorXp acompanha a tabela', () => {
    expect(nivelPorXp(299, TABELA)).toBe(1)
    expect(nivelPorXp(300, TABELA)).toBe(2)
    expect(nivelPorXp(2700, TABELA)).toBe(4)
  })
})

describe('19.3 — Krad: 127.911 / 140.000 no nível 13', () => {
  const p = progressoXp(127911, 13, KRAD)
  it('a barra mostra o intervalo do nível 13→14', () => {
    expect(p.base).toBe(120000)
    expect(p.prox).toBe(140000)
    expect(p.faltam).toBe(12089)
  })
  it('ainda não pode subir; a barra está em ~39,6%', () => {
    expect(p.podeSubir).toBe(false)
    expect(p.pct).toBeCloseTo(39.555, 2)
  })
  it('nivelPorXp confirma nível 13', () => {
    expect(nivelPorXp(127911, KRAD)).toBe(13)
  })
})

describe('19.3 — modo nenhum (sistema sem XP, retrocompatível)', () => {
  it('sem limiares, sem nível derivado, sem aviso automático', () => {
    expect(limiarNivel(5, NENHUM)).toBeNull()
    expect(nivelPorXp(9999, NENHUM)).toBeNull()
    const p = progressoXp(9999, 3, NENHUM)
    expect(p.podeSubir).toBe(false)
    expect(p.prox).toBeNull()
  })
})
