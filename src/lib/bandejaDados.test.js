import { describe, it, expect } from 'vitest'
import { deveMostrar, enfileirarLancamento, planejarLancamento, separarExcedente, LIMITE_DADOS_FISICOS } from './bandejaDados'

const rngFixo = (() => { let s = 42; return () => ((s = (s * 16807) % 2147483647) / 2147483647) })

describe('separarExcedente', () => {
  it('até o limite, tudo rola e não há selo', () => {
    const dados = Array.from({ length: 3 }, (_, i) => ({ lados: 6, valor: i + 1 }))
    expect(separarExcedente(dados)).toEqual({ rolam: dados, excedente: null })
  })

  it('acima do limite, o resto vira quantidade + soma (sem descartados)', () => {
    const dados = Array.from({ length: 60 }, () => ({ lados: 6, valor: 2 }))
    dados[59] = { lados: 6, valor: 6, descartado: true }
    const r = separarExcedente(dados)
    expect(r.rolam).toHaveLength(LIMITE_DADOS_FISICOS)
    expect(r.excedente).toEqual({ qtd: 20, soma: 19 * 2 })
  })

  it('tolera dados ausentes', () => {
    expect(separarExcedente(undefined)).toEqual({ rolam: [], excedente: null })
  })
})

describe('enfileirarLancamento', () => {
  it('rajada: guarda só os mais recentes até o teto', () => {
    let fila = []
    for (let i = 1; i <= 10; i++) fila = enfileirarLancamento(fila, { id: `r${i}` })
    expect(fila.map(l => l.id)).toEqual(['r5', 'r6', 'r7', 'r8', 'r9', 'r10'])
  })

  it('o mesmo id não entra duas vezes', () => {
    const fila = enfileirarLancamento([{ id: 'a' }], { id: 'a' })
    expect(fila).toHaveLength(1)
  })
})

describe('deveMostrar', () => {
  it('todos (padrão) / meus / nenhum', () => {
    expect(deveMostrar(undefined, false)).toBe(true)
    expect(deveMostrar('todos', false)).toBe(true)
    expect(deveMostrar('meus', false)).toBe(false)
    expect(deveMostrar('meus', true)).toBe(true)
    expect(deveMostrar('nenhum', true)).toBe(false)
  })
})

describe('planejarLancamento', () => {
  const bandeja = { largura: 16, profundidade: 10 }

  it('N dados nascem dentro das paredes, acima do chão, indo para o fundo', () => {
    const plano = planejarLancamento(12, bandeja, rngFixo())
    expect(plano).toHaveLength(12)
    for (const p of plano) {
      expect(Math.abs(p.posicao.x)).toBeLessThanOrEqual(bandeja.largura / 2 - 1)
      expect(Math.abs(p.posicao.z)).toBeLessThanOrEqual(bandeja.profundidade / 2 - 1)
      expect(p.posicao.y).toBeGreaterThan(1)
      expect(p.velocidade.z).toBeLessThan(0)
    }
  })

  it('espalha na largura (não empilha todos no mesmo x)', () => {
    const xs = planejarLancamento(8, bandeja, rngFixo()).map(p => p.posicao.x)
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(bandeja.largura / 2)
  })

  it('com o mesmo rng o plano é o mesmo', () => {
    expect(planejarLancamento(4, bandeja, rngFixo())).toEqual(planejarLancamento(4, bandeja, rngFixo()))
  })
})
