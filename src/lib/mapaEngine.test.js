import { describe, it, expect } from 'vitest'
import {
  ZOOM_MAX, ZOOM_MIN, normalizarGrade, telaParaMapa, mapaParaTela, zoomNoPonto, pinca,
  enquadrar, encaixar, espalhar, distanciaCelulas, medir, normalizarRet, adicionarOpNevoa, normalizarNevoa, pontoRevelado,
} from './mapaEngine'

describe('visão', () => {
  const vista = { x: 100, y: 50, zoom: 2 }

  it('tela ↔ mapa são inversas', () => {
    const m = { x: 37, y: 81 }
    expect(telaParaMapa(mapaParaTela(m, vista), vista)).toEqual(m)
  })

  it('zoom na roda mantém fixo o ponto sob o cursor', () => {
    const cursor = { x: 400, y: 300 }
    const antes = telaParaMapa(cursor, vista)
    const nova = zoomNoPonto(vista, 1.5, cursor)
    expect(nova.zoom).toBe(3)
    const depois = telaParaMapa(cursor, nova)
    expect(depois.x).toBeCloseTo(antes.x)
    expect(depois.y).toBeCloseTo(antes.y)
  })

  it('zoom respeita os limites', () => {
    expect(zoomNoPonto(vista, 1000, { x: 0, y: 0 }).zoom).toBe(ZOOM_MAX)
    expect(zoomNoPonto(vista, 0.00001, { x: 0, y: 0 }).zoom).toBe(ZOOM_MIN)
  })

  it('pinça: dobrar a distância dobra o zoom e o ponto acompanha o centro', () => {
    const c0 = { x: 200, y: 200 }
    const c = { x: 260, y: 220 }
    const nova = pinca(vista, c0, 100, c, 200)
    expect(nova.zoom).toBe(4)
    const m0 = telaParaMapa(c0, vista)
    const m1 = telaParaMapa(c, nova)
    expect(m1.x).toBeCloseTo(m0.x)
    expect(m1.y).toBeCloseTo(m0.y)
  })

  it('enquadrar cabe e centraliza', () => {
    const v = enquadrar(2000, 1000, 1000, 1000, 1)
    expect(v.zoom).toBe(0.5)
    expect(v.x).toBe(0)
    expect(v.y).toBe(250)
  })

  it('enquadrar sem dimensões devolve visão neutra', () => {
    expect(enquadrar(0, 0, 800, 600)).toEqual({ x: 0, y: 0, zoom: 1 })
  })
})

describe('grade', () => {
  const g = { tamanho: 70, offset_x: 0, offset_y: 0 }

  it('defaults preenchem grade vazia/nula', () => {
    expect(normalizarGrade(null).tamanho).toBe(70)
    expect(normalizarGrade({ tamanho: 50 }).diagonal).toBe('chebyshev')
  })

  it('token de 1 célula encaixa no centro da célula', () => {
    expect(encaixar({ x: 100, y: 30 }, g, 1)).toEqual({ x: 105, y: 35 })
  })

  it('token de 2 células encaixa no cruzamento', () => {
    expect(encaixar({ x: 100, y: 100 }, g, 2)).toEqual({ x: 70, y: 70 })
    expect(encaixar({ x: 120, y: 120 }, g, 2)).toEqual({ x: 140, y: 140 })
  })

  it('encaixe respeita o deslocamento da grade', () => {
    expect(encaixar({ x: 100, y: 100 }, { tamanho: 70, offset_x: 10, offset_y: 20 }, 1)).toEqual({ x: 115, y: 125 })
  })

  it('espalhar: N tokens em células distintas, encaixados e dentro do mapa', () => {
    const pos = espalhar({ x: 350, y: 350 }, 5, g, 700, 700)
    expect(pos).toHaveLength(5)
    expect(new Set(pos.map(p => `${p.x},${p.y}`)).size).toBe(5)
    for (const p of pos) expect(encaixar(p, g, 1)).toEqual(p)
    const noCanto = espalhar({ x: 0, y: 0 }, 4, g, 700, 700)
    expect(noCanto).toHaveLength(4)
    expect(new Set(noCanto.map(p => `${p.x},${p.y}`)).size).toBe(4)
    for (const p of noCanto) {
      expect(p.x).toBeGreaterThanOrEqual(0)
      expect(p.y).toBeGreaterThanOrEqual(0)
    }
  })

  it('espalhar pula casas já ocupadas por outros tokens', () => {
    const ocupados = espalhar({ x: 350, y: 350 }, 3, g, 700, 700)
    const novos = espalhar({ x: 350, y: 350 }, 2, g, 700, 700, 1, ocupados)
    for (const p of novos) {
      expect(ocupados.some(o => o.x === p.x && o.y === p.y)).toBe(false)
    }
    expect(novos[0]).not.toEqual(novos[1])
  })

  it('grade com tamanho inválido não encaixa', () => {
    expect(encaixar({ x: 13, y: 17 }, { tamanho: 0 }, 1)).toEqual({ x: 13, y: 17 })
  })

  it('distância: chebyshev, alternada (5-10-5) e euclidiana', () => {
    const a = { x: 35, y: 35 } // célula (0,0)
    const b = { x: 35 + 70 * 4, y: 35 + 70 * 3 } // célula (4,3)
    expect(distanciaCelulas(a, b, { ...g, diagonal: 'chebyshev' })).toBe(4)
    expect(distanciaCelulas(a, b, { ...g, diagonal: 'alternada' })).toBe(5)
    expect(distanciaCelulas(a, b, { ...g, diagonal: 'euclidiana' })).toBe(5)
  })

  it('medir gera o rótulo na unidade do mapa', () => {
    const r = medir({ x: 35, y: 35 }, { x: 35 + 210, y: 35 }, { ...g, unidade: 1.5, unidade_nome: 'm' })
    expect(r.celulas).toBe(3)
    expect(r.rotulo).toBe('3 quadrados · 4,5 m')
    expect(medir({ x: 35, y: 35 }, { x: 105, y: 35 }, { ...g, unidade: 5, unidade_nome: 'ft' }).rotulo).toBe('1 quadrado · 5 ft')
  })
})

describe('névoa', () => {
  it('retângulo arrastado ao contrário é normalizado', () => {
    expect(normalizarRet({ x: 50, y: 80 }, { x: 10, y: 20 })).toEqual({ x: 10, y: 20, w: 40, h: 60 })
  })

  it('ops acumulam em ordem', () => {
    let n = normalizarNevoa({ ativa: true })
    n = adicionarOpNevoa(n, { modo: 'revelar', forma: 'ret', x: 0, y: 0, w: 10, h: 10 })
    n = adicionarOpNevoa(n, { modo: 'cobrir', forma: 'ret', x: 2, y: 2, w: 3, h: 3 })
    expect(n.ops.map(o => o.modo)).toEqual(['revelar', 'cobrir'])
    expect(n.ativa).toBe(true)
  })

  it('revelar tudo / cobrir tudo compactam a lista', () => {
    const cheia = { ativa: true, ops: [{ modo: 'revelar', forma: 'ret', x: 0, y: 0, w: 1, h: 1 }] }
    expect(adicionarOpNevoa(cheia, { modo: 'revelar', forma: 'tudo' }).ops).toEqual([{ modo: 'revelar', forma: 'tudo' }])
    expect(adicionarOpNevoa(cheia, { modo: 'cobrir', forma: 'tudo' }).ops).toEqual([])
  })

  it('operações sem área ou sem pontos são ignoradas', () => {
    const n = normalizarNevoa(null)
    expect(adicionarOpNevoa(n, { modo: 'revelar', forma: 'ret', x: 0, y: 0, w: 0, h: 5 }).ops).toEqual([])
    expect(adicionarOpNevoa(n, { modo: 'revelar', forma: 'traco', pontos: [], raio: 20 }).ops).toEqual([])
  })

  it('pontoRevelado: desligada mostra tudo; ligada e vazia esconde tudo', () => {
    expect(pontoRevelado({ ativa: false, ops: [] }, { x: 5, y: 5 })).toBe(true)
    expect(pontoRevelado({ ativa: true, ops: [] }, { x: 5, y: 5 })).toBe(false)
  })

  it('pontoRevelado: a última operação que contém o ponto vence', () => {
    const n = {
      ativa: true,
      ops: [
        { modo: 'revelar', forma: 'ret', x: 0, y: 0, w: 100, h: 100 },
        { modo: 'cobrir', forma: 'ret', x: 40, y: 40, w: 20, h: 20 },
      ],
    }
    expect(pontoRevelado(n, { x: 10, y: 10 })).toBe(true)
    expect(pontoRevelado(n, { x: 50, y: 50 })).toBe(false)
    expect(pontoRevelado(n, { x: 150, y: 50 })).toBe(false)
  })

  it('pontoRevelado: pincel revela a faixa em volta do traço (e um toque único)', () => {
    const traco = { modo: 'revelar', forma: 'traco', raio: 10, pontos: [[0, 0], [100, 0]] }
    const n = { ativa: true, ops: [traco] }
    expect(pontoRevelado(n, { x: 50, y: 9 })).toBe(true)
    expect(pontoRevelado(n, { x: 50, y: 11 })).toBe(false)
    expect(pontoRevelado(n, { x: 105, y: 5 })).toBe(true)
    const toque = { ativa: true, ops: [{ modo: 'revelar', forma: 'traco', raio: 10, pontos: [[200, 200]] }] }
    expect(pontoRevelado(toque, { x: 206, y: 206 })).toBe(true)
    expect(pontoRevelado(toque, { x: 215, y: 200 })).toBe(false)
  })

  it('pontoRevelado: revelar tudo', () => {
    expect(pontoRevelado({ ativa: true, ops: [{ modo: 'revelar', forma: 'tudo' }] }, { x: 9999, y: 1 })).toBe(true)
  })

  it('não muta a névoa original', () => {
    const original = { ativa: true, ops: [] }
    adicionarOpNevoa(original, { modo: 'revelar', forma: 'ret', x: 0, y: 0, w: 5, h: 5 })
    expect(original.ops).toEqual([])
  })
})
