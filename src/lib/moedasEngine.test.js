import { describe, it, expect } from 'vitest'
import { denominacaoBase, totalConsolidado, saldoDe, ajustar, converter } from './moedasEngine'

// As 5 moedas do sistema de referência
const MOEDAS = [
  { id: 'pc', nome: 'Cobre', sigla: 'PC', valor: 1 },
  { id: 'pp', nome: 'Prata', sigla: 'PP', valor: 10 },
  { id: 'pe', nome: 'Electron', sigla: 'PE', valor: 50 },
  { id: 'po', nome: 'Ouro', sigla: 'PO', valor: 100 },
  { id: 'pl', nome: 'Platina', sigla: 'PL', valor: 1000 },
]

describe('21.6 — base e total', () => {
  it('a denominação-base é a de menor valor', () => {
    expect(denominacaoBase(MOEDAS).id).toBe('pc')
  })
  it('total consolidado na unidade-base', () => {
    expect(totalConsolidado({ po: 14930 }, MOEDAS)).toBe(1493000) // 14930 × 100 PC
    expect(totalConsolidado({ pl: 1, po: 5, pc: 3 }, MOEDAS)).toBe(1503) // 1000 + 500 + 3
    expect(totalConsolidado({}, MOEDAS)).toBe(0)
  })
})

describe('21.6 — carteira 14.930 PO e gastar 1.500', () => {
  const carteira = { po: 14930 }
  it('saldo por denominação', () => {
    expect(saldoDe(carteira, 'po')).toBe(14930)
    expect(saldoDe(carteira, 'pl')).toBe(0)
  })
  it('gastar 1.500 PO → 13.430', () => {
    const nova = ajustar(carteira, 'po', -1500)
    expect(nova.po).toBe(13430)
  })
  it('não trava: pode ir a negativo (a UI avisa)', () => {
    expect(ajustar({ po: 100 }, 'po', -250).po).toBe(-150)
  })
})

describe('21.6 — conversão respeitando as taxas', () => {
  it('1 PL → 10 PO (exato, sem sobra)', () => {
    const r = converter({ pl: 1 }, 'pl', 'po', 1, MOEDAS)
    expect(r.recebido).toBe(10)
    expect(r.sobra).toBe(0)
    expect(r.carteira.pl).toBe(0)
    expect(r.carteira.po).toBe(10)
  })

  it('preserva o total consolidado', () => {
    const antes = totalConsolidado({ pl: 2, po: 3 }, MOEDAS)
    const { carteira } = converter({ pl: 2, po: 3 }, 'pl', 'po', 2, MOEDAS)
    expect(totalConsolidado(carteira, MOEDAS)).toBe(antes)
  })

  it('sobra que não fecha uma unidade vai para a base (PC)', () => {
    // 1 PE (50) → PO (100): recebe 0 PO, sobra 50 vira 50 PC
    const r = converter({ pe: 1 }, 'pe', 'po', 1, MOEDAS)
    expect(r.recebido).toBe(0)
    expect(r.sobra).toBe(50)
    expect(r.carteira.pe).toBe(0)
    expect(r.carteira.pc).toBe(50)
    expect(totalConsolidado(r.carteira, MOEDAS)).toBe(50)
  })

  it('converter para baixo: 1 PO → 10 PP', () => {
    const r = converter({ po: 1 }, 'po', 'pp', 1, MOEDAS)
    expect(r.recebido).toBe(10)
    expect(r.carteira.pp).toBe(10)
    expect(r.carteira.po).toBe(0)
  })

  it('entradas inválidas não fazem nada', () => {
    expect(converter({ po: 5 }, 'po', 'po', 3, MOEDAS).recebido).toBe(0) // mesma denom
    expect(converter({ po: 5 }, 'po', 'xx', 3, MOEDAS).recebido).toBe(0) // destino inexistente
    expect(converter({ po: 5 }, 'po', 'pp', 0, MOEDAS).recebido).toBe(0) // quantidade 0
  })
})
