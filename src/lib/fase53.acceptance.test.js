import { describe, it, expect } from 'vitest'
import { alvosNaArea, resolverAcertos, defesaDoAlvo, planejarAplicacao } from './alvosCombate'

// Cena do vídeo do concorrente: Aracnasita ataca em área (raio 3 m, grade 1,5 m / 70 px).
const grade = { tamanho: 70, unidade: 1.5, unidade_nome: 'm' }
const zumbi = { id: 'z', nome: 'Zumbi', tipo: 'inimigo', ca: 12, ficha_id: 'fz' }
const barata = { id: 'b', nome: 'Barata', tipo: 'inimigo', ca: 18, hp_atual: 40, hp_maximo: 40 }
const longe = { id: 'l', nome: 'Longe', tipo: 'inimigo', ca: 5, hp_atual: 9, hp_maximo: 9 }
const combatentes = [zumbi, barata, longe]
const tokens = [
  { x: 500, y: 500, combatente_id: 'z' },        // 140 px = 3 m
  { x: 570, y: 500, combatente_id: 'b' },        // 70 px = 1,5 m
  { x: 900, y: 500, combatente_id: 'l' },        // fora
]
const cardZumbi = {
  id: 'fz', ficha: { id: 'fz', vida_temp_atual: 0 }, hpAtual: 40, hpMax: 40, combate: { ca: 12 },
  pools: [{ id: 'esf', nome: 'Esforço', tipo: 'pontos', atual: 30, maximo: 30 }],
}
const cardsPorFicha = { fz: cardZumbi }

describe('Fase 53 — combate em área', () => {
  const dentro = alvosNaArea({ centro: { x: 430, y: 500 }, raio: 3, tokens, combatentes, grade })
  const alvos = combatentes.filter(c => dentro.includes(c.id))
  const acertos = resolverAcertos({ ataque: 15, alvos, defesaDe: c => defesaDoAlvo(c, { cardsPorFicha, campoCaId: 'ca' }) })

  it('a área pega Zumbi e Barata, não quem está longe', () => {
    expect(dentro).toEqual(['z', 'b'])
  })

  it('ataque 15: Zumbi (def 12) acerta, Barata (def 18) erra', () => {
    expect(acertos.map(a => [a.id, a.acertou])).toEqual([['z', true], ['b', false]])
  })

  it('dano 25; com "metade" a Barata toma 12; Zumbi perde 25 em Vida e Esforço', () => {
    const entradas = alvos.map(c => ({ c, acertou: acertos.find(a => a.id === c.id).acertou }))
    const sem = planejarAplicacao({ alvos: entradas, valor: 25, barras: { z: ['vida', 'esf'] }, cardsPorFicha })
    expect(sem.escritas.find(e => e.combatente_id === 'z' && e.hp != null).hp).toBe(15)
    expect(sem.escritas.find(e => e.pools).pools).toEqual([{ pool_id: 'esf', atual: 5 }])
    expect(sem.escritas.some(e => e.combatente_id === 'b')).toBe(false)

    const com = planejarAplicacao({ alvos: entradas, valor: 25, barras: { z: ['vida', 'esf'] }, metadeAoErrar: true, cardsPorFicha })
    expect(com.escritas.find(e => e.combatente_id === 'b').hp).toBe(28) // 40 − 12
  })

  it('cura não passa do máximo', () => {
    const p = planejarAplicacao({ alvos: [{ c: zumbi, acertou: true }], valor: 99, modo: 'cura', barras: { z: ['vida', 'esf'] }, cardsPorFicha })
    expect(p.escritas[0].hp).toBe(40)
    expect(p.escritas[1].pools[0].atual).toBe(30)
  })
})
