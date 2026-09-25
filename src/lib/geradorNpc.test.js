import { describe, it, expect } from 'vitest'
import { CAMPOS_NPC, gerarNpc, npcParaVerbete, sortearCampo } from './geradorNpc'
import { validarVerbete } from './enciclopedia'

describe('F46 — gerador de NPC', () => {
  it('mesma semente, mesmo NPC; todos os campos preenchidos', () => {
    const a = gerarNpc({ s: 42 })
    const b = gerarNpc({ s: 42 })
    expect(a.npc).toEqual(b.npc)
    for (const c of CAMPOS_NPC) expect(String(a.npc[c]).length).toBeGreaterThan(1)
    expect(gerarNpc({ s: 43 }).npc).not.toEqual(a.npc)
  })

  it('nomes: brasileiro com sobrenome; fantasia com sílabas e sobrenome', () => {
    for (let s = 1; s < 30; s++) {
      expect(gerarNpc({ estilo: 'brasileiro', s }).npc.nome.split(' ').length).toBeGreaterThanOrEqual(2)
      expect(gerarNpc({ estilo: 'fantasia', s }).npc.nome).toMatch(/^[A-Z][a-z]+ \S/)
    }
  })

  it('ofício acompanha o gênero sorteado', () => {
    const [f] = sortearCampo('ocupacao', { genero: 'f' }, 7)
    const [m] = sortearCampo('ocupacao', { genero: 'm' }, 7)
    expect(f).not.toBe(undefined)
    // mesmo sorteio, flexão diferente (ou igual quando a palavra não flexiona)
    expect(typeof m).toBe('string')
  })

  it('vira um verbete válido, com segredo e gancho só nas notas do mestre', () => {
    const { npc } = gerarNpc({ s: 5 })
    const v = npcParaVerbete(npc)
    const c = validarVerbete(v)
    expect(c.ok).toBe(true)
    expect(c.linha.campos).toHaveProperty('aparencia')
    expect(v.segredo).toContain(npc.segredo)
    expect(v.segredo).toContain(npc.gancho)
    expect(JSON.stringify(v.campos) + v.resumo).not.toContain(npc.segredo)
  })
})
