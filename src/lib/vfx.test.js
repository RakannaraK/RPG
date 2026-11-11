import { describe, it, expect } from 'vitest'
import { normalizarEfeitoVfx, resolverVfx, DURACAO_MS } from './vfx'
import { FORMAS_VFX, LIMITES } from './efeitosVocabulario'

const fogo = { id: 'fogo', nome: 'Fogo', forma: 'projetil', cores: ['#FF7A1A', '#FFD27A'], som: 'projetil' }
const tokens = [
  { id: 't1', x: 100, y: 300, ficha_id: 'f1', combatente_id: 'c1' },
  { id: 't2', x: 400, y: 500, ficha_id: 'f2', combatente_id: null },
]
const grade = { tamanho: 70, unidade: 1.5 }

describe('normalizarEfeitoVfx', () => {
  it('aceita preset bom e tem duração para cada forma', () => {
    expect(normalizarEfeitoVfx(fogo)).toEqual(fogo)
    Object.keys(FORMAS_VFX).forEach(f => expect(DURACAO_MS[f]).toBeGreaterThan(0))
  })
  it('descarta lixo e forma desconhecida', () => {
    expect(normalizarEfeitoVfx(null)).toBeNull()
    expect(normalizarEfeitoVfx('x')).toBeNull()
    expect(normalizarEfeitoVfx({ forma: 'meteoro' })).toBeNull()
    expect(normalizarEfeitoVfx({ forma: 'constructor' })).toBeNull()
  })
  it('cor, som e id inválidos viram padrão', () => {
    const e = normalizarEfeitoVfx({ id: 'A B', forma: 'onda', cores: ['red', 5], som: 'xx', nome: '  a\nb ' })
    expect(e.id).toBe('efeito')
    expect(e.cores).toEqual(['#FFC27A', '#FFFFFF'])
    expect(e.som).toBeNull()
    expect(e.nome).toBe('a b')
  })
})

describe('resolverVfx', () => {
  it('alvo por combatente, origem por ficha', () => {
    const r = resolverVfx({ efeito: fogo, de: { ficha: 'f2' }, para: [{ comb: 'c1' }] }, { tokens, grade })
    expect(r.de).toEqual({ x: 400, y: 500 })
    expect(r.para).toEqual([{ x: 100, y: 300, de: { x: 400, y: 500 } }])
  })
  it('combatente sem token cai para a ficha', () => {
    const r = resolverVfx({ efeito: fogo, para: [{ comb: 'zzz', ficha: 'f2' }] }, { tokens, grade })
    expect(r.para[0]).toMatchObject({ x: 400, y: 500 })
  })
  it('ponto direto', () => {
    const r = resolverVfx({ efeito: { ...fogo, forma: 'corte' }, para: [{ x: 5, y: 6 }] }, { tokens, grade })
    expect(r.para).toEqual([{ x: 5, y: 6, de: null }])
  })
  it('alvo sem token é descartado; nenhum válido = null', () => {
    const r = resolverVfx({ efeito: fogo, para: [{ ficha: 'nada' }, { ficha: 'f1' }, null, 3] }, { tokens, grade })
    expect(r.para).toHaveLength(1)
    expect(resolverVfx({ efeito: fogo, para: [{ ficha: 'nada' }] }, { tokens, grade })).toBeNull()
    expect(resolverVfx({ efeito: fogo, para: [] }, { tokens, grade })).toBeNull()
    expect(resolverVfx({ efeito: fogo }, { tokens, grade })).toBeNull()
    expect(resolverVfx(null, { tokens, grade })).toBeNull()
  })
  it('origem faltando: 3 quadrados acima do alvo (projétil e raio), não nas outras formas', () => {
    const p = resolverVfx({ efeito: fogo, para: [{ ficha: 'f1' }] }, { tokens, grade })
    expect(p.de).toBeNull()
    expect(p.para[0].de).toEqual({ x: 100, y: 300 - 210 })
    const r = resolverVfx({ efeito: { ...fogo, forma: 'raio' }, para: [{ ficha: 'f1' }] }, { tokens, grade })
    expect(r.para[0].de).toEqual({ x: 100, y: 90 })
    const o = resolverVfx({ efeito: { ...fogo, forma: 'onda' }, para: [{ ficha: 'f1' }] }, { tokens, grade })
    expect(o.para[0].de).toBeNull()
  })
  it('teto de alvos', () => {
    const para = Array.from({ length: 50 }, (_, i) => ({ x: i, y: i }))
    expect(resolverVfx({ efeito: fogo, para }, { tokens, grade }).para).toHaveLength(LIMITES.alvosVfx)
  })
  it('efeitoId usa os instalados; id desconhecido = null', () => {
    const efeitos = [fogo]
    expect(resolverVfx({ efeitoId: 'fogo', para: [{ ficha: 'f1' }] }, { tokens, efeitos, grade }).efeito.id).toBe('fogo')
    expect(resolverVfx({ efeitoId: 'nao', para: [{ ficha: 'f1' }] }, { tokens, efeitos, grade })).toBeNull()
  })
  it('raio em unidades da grade vira px; padrão por forma', () => {
    const e = { ...fogo, forma: 'explosao' }
    expect(resolverVfx({ efeito: e, raio: 3, para: [{ x: 1, y: 1 }] }, { tokens, grade }).raioPx).toBeCloseTo(140)
    expect(resolverVfx({ efeito: e, para: [{ x: 1, y: 1 }] }, { tokens, grade }).raioPx).toBeCloseTo(84)
    expect(resolverVfx({ efeito: { ...fogo, forma: 'onda' }, para: [{ x: 1, y: 1 }] }, { tokens, grade }).raioPx).toBe(140)
    expect(resolverVfx({ efeito: fogo, para: [{ x: 1, y: 1 }] }, { tokens, grade }).raioPx).toBeNull()
  })
})
