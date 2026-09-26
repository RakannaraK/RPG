import { describe, it, expect } from 'vitest'
import { pinosDoMapa, posicaoNoMapa, semPino, validarAtlas } from './atlas'

describe('F48 — atlas', () => {
  it('clique vira posição relativa, presa dentro do mapa', () => {
    const rect = { left: 100, top: 50, width: 400, height: 200 }
    expect(posicaoNoMapa(300, 150, rect)).toEqual({ x: 0.5, y: 0.5 })
    expect(posicaoNoMapa(0, 999, rect)).toEqual({ x: 0, y: 1 })
    expect(posicaoNoMapa(1, 1, { width: 0, height: 0 })).toBeNull()
  })

  it('pinos do mapa com o verbete que o leitor enxerga', () => {
    const verbetes = [{ id: 'a', tipo: 'local', titulo: 'Vila' }, { id: 'b', tipo: 'npc', titulo: null }]
    const pinos = [
      { id: 1, atlas_id: 'm', verbete_id: 'a' },
      { id: 2, atlas_id: 'm', verbete_id: 'b' },
      { id: 3, atlas_id: 'outro', verbete_id: 'a' },
      { id: 4, atlas_id: 'm', verbete_id: 'sumiu' },
    ]
    const r = pinosDoMapa(pinos, 'm', verbetes)
    expect(r.map(p => p.id)).toEqual([1, 2])
    expect(r[0]).toMatchObject({ rotulo: 'Vila', icone: 'mapa' })
    expect(r[1].rotulo).toBe('NPC desconhecido') // nome ainda secreto
  })

  it('só oferece para fixar o que ainda não está neste mapa', () => {
    const verbetes = [{ id: 'a' }, { id: 'b' }]
    expect(semPino(verbetes, [{ atlas_id: 'm', verbete_id: 'a' }, { atlas_id: 'x', verbete_id: 'b' }], 'm').map(v => v.id)).toEqual(['b'])
  })

  it('valida o mapa novo', () => {
    expect(validarAtlas({ nome: ' ', imagem_url: 'u' }).ok).toBe(false)
    expect(validarAtlas({ nome: 'Reino' }).ok).toBe(false)
    expect(validarAtlas({ nome: ' Reino ', imagem_url: 'u' })).toEqual({ ok: true, nome: 'Reino' })
  })
})
