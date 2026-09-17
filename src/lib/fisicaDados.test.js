import { describe, it, expect } from 'vitest'
import { criarCorpoDado, criarGeometriaDado, criarMundo, estaParado, formaConvexa } from './fisicaDados'
import { planejarLancamento } from './bandejaDados'

const LARGURA = 20
const PROF = 12
const rngFixo = (semente = 7) => { let s = semente; return () => ((s = (s * 16807) % 2147483647) / 2147483647) }

/** Roda a simulação a 60 Hz até todos pararem (ou estourar o limite). */
function simular(world, corpos, maxSegundos = 12) {
  for (let passo = 0; passo < maxSegundos * 60; passo++) {
    world.step(1 / 60)
    if (corpos.every(estaParado)) return passo / 60
  }
  return null
}

describe('formaConvexa', () => {
  it.each([4, 8, 12, 20])('d%i: vértices fundidos, uma face por lado, voltadas para fora', lados => {
    const forma = formaConvexa(criarGeometriaDado(lados))
    const esperadoVertices = { 4: 4, 8: 6, 12: 20, 20: 12 }[lados]
    expect(forma.vertices).toHaveLength(esperadoVertices)
    expect(forma.faces).toHaveLength(lados) // pentágonos do d12 não ficam triangulados
    // Normal de cada face aponta para longe do centro (winding correto p/ colisão)
    for (let i = 0; i < forma.faces.length; i++) {
      const [a] = forma.faces[i]
      expect(forma.faceNormals[i].dot(forma.vertices[a])).toBeGreaterThan(0)
    }
  })
})

describe('física da bandeja', () => {
  it.each([4, 6, 8, 12, 20])('d%i arremessado cai, quica, para no chão e fica dentro das paredes', lados => {
    const mundo = criarMundo(LARGURA, PROF)
    const [plano] = planejarLancamento(1, { largura: LARGURA, profundidade: PROF }, rngFixo(lados))
    const corpo = criarCorpoDado(mundo, lados, plano)
    const tempo = simular(mundo.world, [corpo])
    expect(tempo).not.toBeNull()
    expect(tempo).toBeLessThan(8)
    expect(corpo.position.y).toBeGreaterThan(0)
    expect(corpo.position.y).toBeLessThan(1)
    expect(Math.abs(corpo.position.x)).toBeLessThanOrEqual(LARGURA / 2)
    expect(Math.abs(corpo.position.z)).toBeLessThanOrEqual(PROF / 2)
  })

  it('40 dados misturados param todos dentro da bandeja', () => {
    const mundo = criarMundo(LARGURA, PROF)
    const tipos = [4, 6, 8, 12, 20]
    const planos = planejarLancamento(40, { largura: LARGURA, profundidade: PROF }, rngFixo(99))
    const corpos = planos.map((p, i) => criarCorpoDado(mundo, tipos[i % tipos.length], p))
    const tempo = simular(mundo.world, corpos, 20)
    expect(tempo).not.toBeNull()
    for (const c of corpos) {
      expect(c.position.y).toBeGreaterThan(0)
      expect(Math.abs(c.position.x)).toBeLessThanOrEqual(LARGURA / 2)
      expect(Math.abs(c.position.z)).toBeLessThanOrEqual(PROF / 2)
    }
  })
})
