import { describe, it, expect } from 'vitest'
import { normalizarLuzToken, normalizarAura, raioParaPx, fontesDeLuz, LUZES_TOKEN } from './luzMapa'

const grade = { tamanho: 70, unidade: 1.5 }

describe('luzMapa', () => {
  it('normaliza luz do token', () => {
    expect(normalizarLuzToken(null)).toBeNull()
    expect(normalizarLuzToken('x')).toBeNull()
    expect(normalizarLuzToken({ raio: 999, cor: 'azul', tremula: 'sim' })).toEqual({ raio: 60, cor: '#FFE9B8', tremula: false })
    expect(normalizarLuzToken({ raio: 0, cor: '#ff0000', tremula: true })).toEqual({ raio: 0.5, cor: '#ff0000', tremula: true })
  })
  it('normaliza aura', () => {
    expect(normalizarAura([])).toBeNull()
    expect(normalizarAura({ raio: 'a', cor: 1 })).toEqual({ raio: 1, cor: '#7FA6FF' })
    expect(normalizarAura({ raio: 100, cor: '#00ff00' }).raio).toBe(60)
  })
  it('converte raio em px', () => {
    expect(raioParaPx(3, grade)).toBe(140)
    expect(raioParaPx(1, undefined)).toBeCloseTo(70 / 1.5)
  })
  it('presets são válidos', () => {
    LUZES_TOKEN.forEach(l => expect(normalizarLuzToken(l)).toMatchObject({ raio: l.raio, cor: l.cor }))
  })
  it('junta as três origens e ignora efeito de cena inteira', () => {
    const atmosfera = {
      luz: { fontes: [{ id: 'a', x: 10, y: 20, raio: 3, cor: '#112233', tremula: true }] },
      efeitos: [
        { id: 'e1', tipo: 'fogo', x: 5, y: 6, raio: 2 },
        { id: 'e2', tipo: 'fogo' },
        { id: 'e3', tipo: 'chuva', x: 1, y: 1, raio: 2 },
      ],
    }
    const tokens = [{ id: 't1', x: 100, y: 200, luz: { raio: 3, cor: '#FFB25E', tremula: true } }, { id: 't2', x: 0, y: 0, luz: null }]
    const f = fontesDeLuz({ atmosfera, tokens, grade })
    expect(f.map(x => x.id)).toEqual(['fonte-a', 'token-t1', 'efeito-e1'])
    expect(f[0]).toMatchObject({ x: 10, y: 20, raioPx: 140, cor: '#112233', tremula: true })
    expect(f[2]).toMatchObject({ raioPx: 140, cor: '#FF7A1A', tremula: true })
  })
  it('aguenta atmosfera incompleta', () => {
    expect(fontesDeLuz({ atmosfera: undefined, tokens: undefined, grade })).toEqual([])
    expect(fontesDeLuz({ atmosfera: { luz: {} }, tokens: [], grade })).toEqual([])
  })
})
