import { describe, it, expect } from 'vitest'
import {
  nivelDeReferencia, atendeNivelMinimo, filtrarPorNivelMinimo, bloqueadosPorNivel,
} from './requisitos'

// Krad: Bárbaro 9 / Paladino 4 → total 13
const KRAD = { nivel: 13, niveisClasse: { 'cls-barbaro': 9, 'cls-paladino': 4, barbaro: 9, paladino: 4 } }

// Voo Dracônico: habilidade da classe Dragão, exige nv 5 NA CLASSE
const VOO = { nome: 'Voo Dracônico', classe_id: 'cls-dragao', nivel_minimo: 5 }
// Transformação do IC: habilidade avulsa, exige nível TOTAL 40
const TRANSFORMACAO = { nome: 'Transformação', nivel_minimo: 40 }

describe('19.5 — nível de referência', () => {
  it('habilidade de classe mede pelo nível NAQUELA classe', () => {
    expect(nivelDeReferencia({ classe_id: 'cls-barbaro' }, KRAD)).toBe(9)
    expect(nivelDeReferencia({ classe_id: 'cls-paladino' }, KRAD)).toBe(4)
  })
  it('classe que a ficha não tem → 0', () => {
    expect(nivelDeReferencia({ classe_id: 'cls-dragao' }, KRAD)).toBe(0)
  })
  it('raça e avulsa medem pelo nível TOTAL', () => {
    expect(nivelDeReferencia({ raca_id: 'r1' }, KRAD)).toBe(13)
    expect(nivelDeReferencia({}, KRAD)).toBe(13)
  })
  it('modificador usa a origem carimbada na coleta', () => {
    expect(nivelDeReferencia({ _origemClasseId: 'cls-barbaro' }, KRAD)).toBe(9)
  })
})

describe('19.5 — Voo Dracônico (nv mínimo 5 na classe)', () => {
  const ficha = nivelDragao => ({ nivel: 10, niveisClasse: { 'cls-dragao': nivelDragao } })
  it('Dragão 3 → ainda não tem, mesmo com nível total 10', () => {
    expect(atendeNivelMinimo(VOO, ficha(3))).toBe(false)
  })
  it('ao chegar em Dragão 5 → aparece', () => {
    expect(atendeNivelMinimo(VOO, ficha(5))).toBe(true)
    expect(atendeNivelMinimo(VOO, ficha(7))).toBe(true)
  })
})

describe('19.5 — Transformação do IC (nv mínimo 40, total)', () => {
  it('nível 39 → bloqueada; 40 → liberada', () => {
    expect(atendeNivelMinimo(TRANSFORMACAO, { nivel: 39 })).toBe(false)
    expect(atendeNivelMinimo(TRANSFORMACAO, { nivel: 40 })).toBe(true)
  })
})

describe('19.5 — retrocompatibilidade', () => {
  it('sem nivel_minimo → sempre entra', () => {
    expect(atendeNivelMinimo({ nome: 'Fúria' }, { nivel: 1 })).toBe(true)
    expect(atendeNivelMinimo({ nivel_minimo: null }, { nivel: 1 })).toBe(true)
    expect(atendeNivelMinimo({ nivel_minimo: '' }, { nivel: 1 })).toBe(true)
  })
  it('nivel_minimo lixo não bloqueia', () => {
    expect(atendeNivelMinimo({ nivel_minimo: 'abc' }, { nivel: 1 })).toBe(true)
  })
  it('sem contexto, quem exige nível fica de fora (seguro)', () => {
    expect(atendeNivelMinimo({ nivel_minimo: 5 }, {})).toBe(false)
  })
})

describe('19.5 — filtros de lista', () => {
  const habs = [
    { nome: 'Fúria', classe_id: 'cls-barbaro' },
    { nome: 'Ataque Extra', classe_id: 'cls-barbaro', nivel_minimo: 5 },
    { nome: 'Fúria Implacável', classe_id: 'cls-barbaro', nivel_minimo: 11 },
    VOO,
  ]
  it('filtra o que a ficha já alcançou', () => {
    const nomes = filtrarPorNivelMinimo(habs, KRAD).map(h => h.nome)
    expect(nomes).toEqual(['Fúria', 'Ataque Extra']) // bárbaro 9: 11 e Voo ficam fora
  })
  it('lista os bloqueados para o jogador planejar', () => {
    const nomes = bloqueadosPorNivel(habs, KRAD).map(h => h.nome)
    expect(nomes).toEqual(['Fúria Implacável', 'Voo Dracônico'])
  })
})
