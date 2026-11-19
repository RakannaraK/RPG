import { describe, expect, it } from 'vitest'
import {
  MAX_SEGMENTOS, adicionarSegmento, alternarPorta, bloqueios, caminhoSvg, encaixarPonta, enxerga,
  limparParedes, normalizarParedes, poligonoVisivel, removerSegmento, segmentoMaisProximo,
} from './visao'

const seg = (x1, y1, x2, y2, porta = false, aberta = false) => ({ id: `s${x1}${y1}${x2}${y2}`, x1, y1, x2, y2, porta, aberta })
const area = pts => Math.abs(pts.reduce((s, p, i) => { const q = pts[(i + 1) % pts.length]; return s + p[0] * q[1] - q[0] * p[1] }, 0) / 2)
const dentro = (pt, poly) => {
  let r = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]; const [xj, yj] = poly[j]
    if ((yi > pt.y) !== (yj > pt.y) && pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi) + xi) r = !r
  }
  return r
}
const MAPA = { largura: 1000, altura: 1000 }
// Sala 200..400 com porta na parede de baixo (y = 400)
const sala = aberta => [seg(200, 200, 400, 200), seg(400, 200, 400, 400), seg(400, 400, 200, 400, true, aberta), seg(200, 400, 200, 200)]

describe('poligonoVisivel', () => {
  it('sem parede dá o retângulo inteiro', () => {
    expect(area(poligonoVisivel({ x: 300, y: 300 }, [], MAPA))).toBeCloseTo(1000 * 1000, -2)
  })
  it('sala fechada: o polígono não sai da sala', () => {
    const pts = poligonoVisivel({ x: 300, y: 300 }, bloqueios({ segmentos: sala(false) }), MAPA)
    expect(area(pts)).toBeCloseTo(200 * 200, -2)
    for (const [x, y] of pts) {
      expect(x).toBeGreaterThanOrEqual(199); expect(x).toBeLessThanOrEqual(401)
      expect(y).toBeGreaterThanOrEqual(199); expect(y).toBeLessThanOrEqual(401)
    }
  })
  it('porta aberta deixa ver, fechada não', () => {
    const o = { x: 300, y: 300 }
    const fechada = area(poligonoVisivel(o, bloqueios({ segmentos: sala(false) }), MAPA))
    const aberta = area(poligonoVisivel(o, bloqueios({ segmentos: sala(true) }), MAPA))
    expect(aberta).toBeGreaterThan(fechada * 2)
  })
})

describe('vão na parede', () => {
  it('origem perto da ponta: vê pelo vão, não vê atrás da parede', () => {
    const ps = [seg(0, 400, 300, 400), seg(340, 400, 1000, 400)]
    const o = { x: 300, y: 480 }
    const poly = poligonoVisivel(o, ps, MAPA)
    const pelo = { x: 320, y: 100 }
    const atras = { x: 100, y: 100 }
    expect(dentro(pelo, poly)).toBe(true)
    expect(enxerga(o, pelo, ps)).toBe(true)
    expect(dentro(atras, poly)).toBe(false)
    expect(enxerga(o, atras, ps)).toBe(false)
  })
})

describe('enxerga', () => {
  const parede = [seg(500, 0, 500, 1000)]
  it('dos dois lados de uma parede', () => {
    expect(enxerga({ x: 400, y: 500 }, { x: 600, y: 500 }, parede)).toBe(false)
    expect(enxerga({ x: 600, y: 500 }, { x: 400, y: 500 }, parede)).toBe(false)
    expect(enxerga({ x: 400, y: 500 }, { x: 450, y: 700 }, parede)).toBe(true)
  })
})

describe('normalizarParedes', () => {
  it('descarta lixo', () => {
    expect(normalizarParedes(null)).toEqual({ ativa: false, segmentos: [] })
    expect(normalizarParedes('x').segmentos).toEqual([])
    const n = normalizarParedes({
      ativa: 'sim',
      segmentos: [null, 7, { x1: 'a', y1: 0, x2: 1, y2: 1 }, { x1: 5, y1: 5, x2: 5, y2: 5 }, { id: 'ok', x1: 0.4, y1: 0, x2: 50, y2: 0, porta: 1, aberta: true }],
    })
    expect(n.ativa).toBe(false)
    expect(n.segmentos).toHaveLength(1)
    expect(n.segmentos[0]).toMatchObject({ id: 'ok', x1: 0, porta: false, aberta: false })
  })
  it('corta em 300', () => {
    const muitos = Array.from({ length: 500 }, (_, i) => ({ x1: 0, y1: i, x2: 50, y2: i }))
    expect(normalizarParedes({ segmentos: muitos }).segmentos).toHaveLength(MAX_SEGMENTOS)
  })
})

describe('edição', () => {
  it('adiciona, ignora curto, alterna porta, remove, limpa', () => {
    let p = adicionarSegmento(null, { x1: 0, y1: 0, x2: 3, y2: 0 })
    expect(p.segmentos).toHaveLength(0)
    p = adicionarSegmento(p, { x1: 0, y1: 0, x2: 100, y2: 0, porta: true })
    const { id } = p.segmentos[0]
    p = alternarPorta(p, id)
    expect(p.segmentos[0].aberta).toBe(true)
    expect(bloqueios(p)).toHaveLength(0)
    expect(removerSegmento(p, id).segmentos).toHaveLength(0)
    expect(limparParedes(p).segmentos).toHaveLength(0)
  })
})

describe('encaixe e seleção', () => {
  const p = { segmentos: [seg(100, 100, 300, 100)] }
  const grade = { ativa: true, tamanho: 70, offset_x: 0, offset_y: 0 }
  it('gruda na ponta, no canto, ou nada', () => {
    expect(encaixarPonta({ x: 105, y: 96 }, p, grade, 12)).toEqual({ x: 100, y: 100 })
    expect(encaixarPonta({ x: 143, y: 138 }, p, grade, 12)).toEqual({ x: 140, y: 140 })
    expect(encaixarPonta({ x: 105, y: 135 }, p, grade, 6)).toEqual({ x: 105, y: 135 })
  })
  it('grade desligada não encaixa em canto', () => {
    expect(encaixarPonta({ x: 143, y: 138 }, p, { ...grade, ativa: false }, 12)).toEqual({ x: 143, y: 138 })
  })
  it('segmento mais próximo', () => {
    expect(segmentoMaisProximo({ x: 200, y: 105 }, p, 12)).toBe('s100100300100')
    expect(segmentoMaisProximo({ x: 200, y: 150 }, p, 12)).toBeNull()
  })
  it('caminhoSvg', () => {
    expect(caminhoSvg([[0, 0], [1, 2]])).toBe('M 0 0 L 1 2 Z')
  })
})
