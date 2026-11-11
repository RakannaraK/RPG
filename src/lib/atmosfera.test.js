import { describe, it, expect } from 'vitest'
import { LIMITES } from './efeitosVocabulario'
import {
  ATMOSFERA_VAZIA, normalizarAtmosfera, adicionarEfeito, atualizarEfeito, removerEfeito,
  adicionarFonte, atualizarFonte, removerFonte, definirLuz, aplicarCena, limparCena,
  colocarNoMapa, volumesDaAtmosfera, quantasParticulas, tetoParticulas, nascer, mover,
} from './atmosfera'

const regiao = { x: 0, y: 0, w: 800, h: 600 }
const local = { cx: 100, cy: 100, r: 50 }

describe('normalizarAtmosfera', () => {
  it('lixo vira a atmosfera vazia completa', () => {
    for (const lixo of [null, undefined, 'x', 7, [], { efeitos: 'a', luz: 3, sons: 9 }]) {
      const a = normalizarAtmosfera(lixo)
      expect(a).toEqual(ATMOSFERA_VAZIA)
      expect(a.som).toBe(true)
      expect(a.luz.cor).toBe('#05070C')
    }
  })
  it('descarta tipo desconhecido, limita números, cor inválida vira padrão', () => {
    const a = normalizarAtmosfera({
      efeitos: [{ tipo: 'laser' }, { tipo: 'fogo', intensidade: 99, cor: 'vermelho' }, { tipo: 'neve', intensidade: 'x' }, null],
      luz: { escuridao: 5, cor: 'azul', fontes: [{ x: 1, y: 2, raio: 999, cor: '#zzzzzz' }, { x: 'a', y: 1 }] },
      sons: ['fogo', 'fogo', 'inexistente', 'chuva', 'vento', 'agua', 'noite'],
      som: false,
    })
    expect(a.efeitos.map(e => e.tipo)).toEqual(['fogo', 'neve'])
    expect(a.efeitos[0]).toMatchObject({ intensidade: 1, cor: null })
    expect(a.efeitos[1].intensidade).toBe(0.5)
    expect(a.luz.escuridao).toBe(0.95)
    expect(a.luz.cor).toBe('#05070C')
    expect(a.luz.fontes).toHaveLength(1)
    expect(a.luz.fontes[0]).toMatchObject({ raio: 60, cor: '#FFC27A', tremula: false })
    expect(a.sons).toEqual(['fogo', 'chuva', 'vento'])
    expect(a.som).toBe(false)
  })
  it('limita a quantidade e garante ids únicos', () => {
    const efeitos = Array.from({ length: 30 }, () => ({ id: 'a', tipo: 'neve' }))
    const fontes = Array.from({ length: 60 }, () => ({ id: 'a', x: 0, y: 0 }))
    const a = normalizarAtmosfera({ efeitos, luz: { fontes } })
    expect(a.efeitos).toHaveLength(LIMITES.efeitos)
    expect(a.luz.fontes).toHaveLength(LIMITES.fontes)
    const ids = [...a.efeitos, ...a.luz.fontes].map(x => x.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
  it('efeito local exige x, y e raio; soCena nunca é local', () => {
    const a = normalizarAtmosfera({ efeitos: [
      { tipo: 'fogo', x: 10, y: 20, raio: 3 }, { tipo: 'fogo', x: 10, y: 20 }, { tipo: 'relampago', x: 1, y: 1, raio: 2 },
    ] })
    expect(a.efeitos[0]).toMatchObject({ x: 10, y: 20, raio: 3 })
    expect(a.efeitos[1].x).toBeUndefined()
    expect(a.efeitos[2].x).toBeUndefined()
  })
})

describe('operações', () => {
  it('efeitos: adicionar, atualizar, remover', () => {
    let a = adicionarEfeito(ATMOSFERA_VAZIA, { tipo: 'chuva' })
    expect(a.efeitos).toHaveLength(1)
    const id = a.efeitos[0].id
    a = atualizarEfeito(a, id, { intensidade: 0.9, cor: '#112233' })
    expect(a.efeitos[0]).toMatchObject({ id, intensidade: 0.9, cor: '#112233' })
    expect(adicionarEfeito(a, { tipo: 'nada' }).efeitos).toHaveLength(1)
    expect(removerEfeito(a, id).efeitos).toHaveLength(0)
  })
  it('fontes: adicionar, atualizar, remover', () => {
    let a = adicionarFonte(ATMOSFERA_VAZIA, { x: 5, y: 6, raio: 3, cor: '#ffffff', tremula: true })
    const id = a.luz.fontes[0].id
    a = atualizarFonte(a, id, { raio: 8 })
    expect(a.luz.fontes[0]).toMatchObject({ x: 5, raio: 8, tremula: true })
    expect(removerFonte(a, id).luz.fontes).toHaveLength(0)
  })
  it('definirLuz', () => {
    const a = definirLuz(ATMOSFERA_VAZIA, { escuridao: 0.5, cor: '#102030' })
    expect(a.luz).toMatchObject({ escuridao: 0.5, cor: '#102030' })
    expect(definirLuz(a, { escuridao: 2 }).luz.escuridao).toBe(0.95)
  })
})

describe('cenas', () => {
  const base = colocarNoMapa(
    adicionarFonte(adicionarEfeito(ATMOSFERA_VAZIA, { tipo: 'neve' }), { x: 1, y: 1 }),
    { oQue: 'efeito', tipo: 'fogo' }, { x: 50, y: 60 }, 1.5,
  )
  const cena = { atmosfera: { efeitos: [{ tipo: 'chuva', intensidade: 0.5 }], luz: { escuridao: 0.4, cor: '#0A1020' }, sons: ['vento'] } }

  it('aplicarCena troca os de cena inteira, mantém locais e fontes', () => {
    const a = aplicarCena(base, cena)
    expect(a.efeitos.map(e => e.tipo).sort()).toEqual(['chuva', 'fogo'])
    expect(a.efeitos.find(e => e.tipo === 'fogo').x).toBe(50)
    expect(a.luz.fontes).toHaveLength(1)
    expect(a.luz).toMatchObject({ escuridao: 0.4, cor: '#0A1020' })
    expect(a.sons).toEqual(['vento'])
  })
  it('cena nunca traz posição', () => {
    const a = aplicarCena(ATMOSFERA_VAZIA, { atmosfera: { efeitos: [{ tipo: 'fogo', x: 1, y: 1, raio: 2 }] } })
    expect(a.efeitos.every(e => e.x === undefined)).toBe(true)
  })
  it('limparCena tira o que aplicarCena põe', () => {
    const a = limparCena(aplicarCena(base, cena))
    expect(a.efeitos.map(e => e.tipo)).toEqual(['fogo'])
    expect(a.luz.escuridao).toBe(0)
    expect(a.sons).toEqual([])
    expect(a.luz.fontes).toHaveLength(1)
  })
})

describe('colocarNoMapa', () => {
  it('efeito local com raio de 2 quadrados', () => {
    const a = colocarNoMapa(ATMOSFERA_VAZIA, { oQue: 'efeito', tipo: 'fogo' }, { x: 10, y: 20 }, 1.5)
    expect(a.efeitos[0]).toMatchObject({ tipo: 'fogo', x: 10, y: 20, raio: 3 })
  })
  it('tipo soCena não vira local', () => {
    expect(colocarNoMapa(ATMOSFERA_VAZIA, { oQue: 'efeito', tipo: 'relampago' }, { x: 1, y: 1 }).efeitos).toHaveLength(0)
  })
  it('luz: raio de 4 quadrados, #FFC27A, trêmula', () => {
    const a = colocarNoMapa(ATMOSFERA_VAZIA, { oQue: 'luz' }, { x: 7, y: 8 }, 1.5)
    expect(a.luz.fontes[0]).toMatchObject({ x: 7, y: 8, raio: 6, cor: '#FFC27A', tremula: true })
  })
  it('mover muda x/y do efeito ou da fonte', () => {
    let a = colocarNoMapa(ATMOSFERA_VAZIA, { oQue: 'efeito', tipo: 'fogo' }, { x: 1, y: 1 })
    a = colocarNoMapa(a, { oQue: 'luz' }, { x: 2, y: 2 })
    const idE = a.efeitos[0].id, idF = a.luz.fontes[0].id
    a = colocarNoMapa(a, { oQue: 'mover', id: idE }, { x: 30, y: 40 })
    a = colocarNoMapa(a, { oQue: 'mover', id: idF }, { x: 50, y: 60 })
    expect(a.efeitos[0]).toMatchObject({ x: 30, y: 40 })
    expect(a.luz.fontes[0]).toMatchObject({ x: 50, y: 60 })
  })
})

describe('volumesDaAtmosfera', () => {
  it('maior intensidade por som; extras com 0,6; mudo = {}', () => {
    let a = normalizarAtmosfera({ efeitos: [
      { tipo: 'neve', intensidade: 0.3 }, { tipo: 'areia', intensidade: 0.8 }, { tipo: 'chuva', intensidade: 0.4 }, { tipo: 'brasas' },
    ], sons: ['chuva', 'infernal'] })
    expect(volumesDaAtmosfera(a)).toEqual({ vento: 0.8, chuva: 0.6, infernal: 0.6 })
    a = { ...a, som: false }
    expect(volumesDaAtmosfera(a)).toEqual({})
  })
})

describe('partículas', () => {
  const tipos = ['fogo', 'brasas', 'cinzas', 'neblina', 'chuva', 'neve', 'areia', 'vagalumes', 'bolhas', 'runas']

  it('teto de 700, ou 350 com densidade 0,5; 0 sem densidade', () => {
    expect(tetoParticulas(1)).toBeLessThanOrEqual(700)
    expect(tetoParticulas(0.5)).toBe(350)
    expect(tetoParticulas(0)).toBe(0)
  })
  it('quantidade: 0 sem densidade, cresce com intensidade, relâmpago não tem', () => {
    expect(quantasParticulas('chuva', 1, 1e6, 0)).toBe(0)
    expect(quantasParticulas('relampago', 1, 1e6, 1)).toBe(0)
    expect(quantasParticulas('chuva', 1, 1e6, 1)).toBeGreaterThan(quantasParticulas('chuva', 0.2, 1e6, 1))
    expect(quantasParticulas('fogo', 1, 1e9, 1)).toBeLessThanOrEqual(200)
    expect(quantasParticulas('neblina', 1, 1e6, 1)).toBeLessThanOrEqual(18)
  })
  it('nascem dentro da caixa, com sorteio injetável', () => {
    for (const t of tipos) {
      for (const r of [regiao, local]) {
        const p = nascer(t, r, () => 0.5, true)
        expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true)
      }
    }
    expect(nascer('fogo', regiao, () => 0.5).y).toBeGreaterThan(regiao.h * 0.85)
  })
  it('partícula que morre renasce (mover devolve false)', () => {
    for (const t of tipos) {
      const p = nascer(t, regiao, () => 0.9)
      let vivo = true, passos = 0
      while (vivo && passos++ < 20000) vivo = mover(p, t, 0.1, regiao)
      expect(vivo).toBe(false)
      const nova = nascer(t, regiao, () => 0.5)
      expect(nova.t).toBe(0)
    }
  })
})
