import { describe, it, expect } from 'vitest'
import { calcularMaestria, bonusMaestria, xpParaNivel, proximaPropriedade } from './masteryEngine'
import { resolverTipoDano } from './conversao'
import { totalConsolidado, converter } from './moedasEngine'
import { coletarModificadores } from './modifierEngine'
import { avaliarFormula } from './formulaEngine'

/**
 * Teste de aceitação da Fase 21, com as duas fichas de referência.
 * (a) IC — maestria por categoria; (b) Krad — item/conversão/moedas.
 */

// ─── (a) Infinit Corridor — maestria por categoria ──────────────────────────
const CURVA = { modo: 'formula', formula: '100 * proximo_nivel' }
const CONFIG_MAESTRIA = { ativo: true, escopo: 'categoria', curva: CURVA, bonus_por_nivel: { acerto_percentual: 10, efeito_percentual: 10 } }
const PROPS = [
  { nome: 'Crítico', maestria_minima: 2 },
  { nome: 'Dupla', maestria_minima: 4 },
  { nome: 'Disparo', maestria_minima: 6 },
]

describe('Fase 21 (a) — IC: maestria por categoria (Machados)', () => {
  it('XP 10/20/50: usar num inimigo equivalente 5× (+20×5=100) → maestria 1', () => {
    expect(calcularMaestria(100, CURVA).nivel).toBe(1)
    expect(calcularMaestria(100, CURVA).faltam).toBe(200) // próximo nível custa 200
  })

  it('+10% por nível no acerto e no efeito', () => {
    expect(bonusMaestria(2, CONFIG_MAESTRIA).acerto_percentual).toBe(20)
    expect(bonusMaestria(4, CONFIG_MAESTRIA).efeito_percentual).toBe(40)
  })

  it('Crítico(2)/Dupla(4)/Disparo(6): com maestria 4, Crítico e Dupla ativas', () => {
    const b = bonusMaestria(4, CONFIG_MAESTRIA, PROPS)
    expect(b.desbloqueadas.map(p => p.nome)).toEqual(['Crítico', 'Dupla'])
    expect(b.bloqueadas.map(p => p.nome)).toEqual(['Disparo'])
  })

  it('tooltip "faltam X para Dupla": no nível 2 (XP 300), Dupla exige o nível 4', () => {
    // XP para o nível 4 = 100+200+300+400 = 1000; no XP 300 faltam 700
    expect(xpParaNivel(4, CURVA)).toBe(1000)
    const prox = proximaPropriedade(2, PROPS)
    expect(prox.nome).toBe('Dupla')
    expect(xpParaNivel(prox.maestria_minima, CURVA) - 300).toBe(700)
  })
})

// ─── (b) Krad — item mágico, conversão, moedas ──────────────────────────────
describe('Fase 21 (b) — Krad: manoplas, conversão e carteira', () => {
  it('manoplas (item equipado) são fonte do modificador de conversão', () => {
    const manoplas = {
      id: 'it1', nome: 'Manoplas', equipado: true,
      modificadores: [{ tipo: 'converter', operacao: 'converter', alvo: 'tipo_dano', valor: '{"de":"fisico","para":"eletrico"}' }],
    }
    const mods = coletarModificadores({ itens: [manoplas] })
    expect(mods).toHaveLength(1)
    // o dano do machado (físico) sai elétrico; resistência a físico não reduz
    expect(resolverTipoDano('fisico', mods)).toEqual({ tipo: 'eletrico', convertidoDe: 'fisico' })
  })

  it('manoplas desequipadas/danificadas não convertem', () => {
    const conv = [{ tipo: 'converter', operacao: 'converter', alvo: 'tipo_dano', valor: '{"de":"fisico","para":"eletrico"}' }]
    const desequip = coletarModificadores({ itens: [{ id: 'i', nome: 'M', equipado: false, modificadores: conv }] })
    expect(resolverTipoDano('fisico', desequip).tipo).toBe('fisico')
  })

  it('carteira 14.930 PO e conversão 1 PL → 10 PO', () => {
    const MOEDAS = [
      { id: 'pc', valor: 1 }, { id: 'pp', valor: 10 }, { id: 'pe', valor: 50 },
      { id: 'po', valor: 100 }, { id: 'pl', valor: 1000 },
    ]
    expect(totalConsolidado({ po: 14930 }, MOEDAS)).toBe(1493000)
    const r = converter({ pl: 1 }, 'pl', 'po', 1, MOEDAS)
    expect(r.carteira.po).toBe(10)
    expect(r.carteira.pl).toBe(0)
  })

  it('Mãos Consagradas: reserva "5 * nivel(paladino)" com Paladino 4 = 20', () => {
    expect(avaliarFormula('5 * nivel(paladino)', { niveisClasse: { paladino: 4 } })).toBe(20)
  })
})

// ─── (c) Retrocompatibilidade: tudo desligado = idêntico a antes ────────────
describe('Fase 21 (c) — adaptativo/retrocompatível', () => {
  it('sem maestria configurada, curva vazia → nível 0', () => {
    expect(calcularMaestria(999, { modo: 'formula', formula: '' }).nivel).toBe(0)
  })
  it('sem conversões, o tipo de dano é intacto', () => {
    expect(resolverTipoDano('fisico', []).tipo).toBe('fisico')
  })
  it('item sem modificadores não afeta a coleta', () => {
    expect(coletarModificadores({ itens: [{ id: 'i', nome: 'Poção' }] })).toHaveLength(0)
  })
})
