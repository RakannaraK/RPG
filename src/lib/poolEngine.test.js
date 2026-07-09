import { describe, it, expect } from 'vitest'
import {
  maximoPool, calcularMaximos, atualDePool, gastarPool,
  recuperarQuantidade, recuperarPool, notacaoGasto, mapaPools,
} from './poolEngine'

// Infinit Corridor — Thariuns: 2 por nível, recupera tudo no descanso longo
const THARIUNS = {
  id: 'p-thariuns',
  nome: 'Thariuns',
  tipo: 'pontos',
  maximo_formula: '2 * nivel',
  recuperacao: { 'desc-longo': { modo: 'total' }, 'desc-curto': { modo: 'nada' } },
}

// Krad — Reserva Divina: pool de DADOS d12
const RESERVA = {
  id: 'p-reserva',
  nome: 'Reserva Divina',
  tipo: 'dados',
  dado: 'd12',
  maximo_formula: '4 + piso(nivel(paladino) / 6)',
  recuperacao: { 'desc-longo': { modo: 'total' } },
}

const KRAD = { nivel: 13, niveisClasse: { paladino: 4, barbaro: 9 } }
const IC = { nivel: 13 }

describe('20.1 — máximo derivado de fórmula (nunca armazenado)', () => {
  it('Thariuns "2 * nivel" no nível 13 → 26', () => {
    expect(maximoPool(THARIUNS, IC)).toBe(26)
  })
  it('Reserva Divina "4 + piso(nivel(paladino)/6)" com Paladino 4 → 4', () => {
    expect(maximoPool(RESERVA, KRAD)).toBe(4)
  })
  it('recalcula com o nível: Thariuns no nível 20 → 40', () => {
    expect(maximoPool(THARIUNS, { nivel: 20 })).toBe(40)
  })
  it('fórmula pode ser um número puro', () => {
    expect(maximoPool({ maximo_formula: '5' }, {})).toBe(5)
  })
  it('frações para baixo, nunca negativo, vazio → 0', () => {
    expect(maximoPool({ maximo_formula: 'nivel / 2' }, { nivel: 7 })).toBe(3)
    expect(maximoPool({ maximo_formula: '0 - 5' }, {})).toBe(0)
    expect(maximoPool({ maximo_formula: '' }, {})).toBe(0)
  })
  it('calcularMaximos isola fórmula quebrada sem derrubar as outras', () => {
    const { maximos, erros } = calcularMaximos([THARIUNS, { id: 'x', maximo_formula: 'nivel +' }], IC)
    expect(maximos['p-thariuns']).toBe(26)
    expect(maximos['x']).toBe(0)
    expect(erros['x']).toBeTruthy()
  })
})

describe('20.1 — valor atual e clamp', () => {
  it('pool sem linha na ficha começa CHEIO', () => {
    expect(atualDePool(null, 26)).toBe(26)
  })
  it('se o máximo cai, o atual acompanha', () => {
    expect(atualDePool({ atual: 26 }, 20)).toBe(20)
  })
  it('nunca fica negativo', () => {
    expect(atualDePool({ atual: -3 }, 26)).toBe(0)
  })
})

describe('20.1 — Thariuns: gastar e recuperar (caso da spec)', () => {
  const max = maximoPool(THARIUNS, IC) // 26

  it('nível 13 → 26/26', () => {
    expect(max).toBe(26)
    expect(atualDePool(null, max)).toBe(26)
  })
  it('gastar 3 → 23', () => {
    const r = gastarPool(26, 3)
    expect(r.ok).toBe(true)
    expect(r.novo).toBe(23)
  })
  it('descanso longo → 26', () => {
    expect(recuperarPool(THARIUNS, 23, max, 'desc-longo')).toBe(26)
  })
  it('descanso curto não recupera Thariuns', () => {
    expect(recuperarPool(THARIUNS, 23, max, 'desc-curto')).toBe(23)
  })
  it('descanso não configurado → mantém', () => {
    expect(recuperarPool(THARIUNS, 23, max, 'desc-inexistente')).toBe(23)
  })
})

describe('20.1 — custo falha antes do efeito, com motivo', () => {
  it('gastar mais do que tem não passa', () => {
    const r = gastarPool(2, 3)
    expect(r.ok).toBe(false)
    expect(r.novo).toBe(2) // nada foi debitado
    expect(r.motivo).toMatch(/insuficiente/i)
  })
  it('quantidade inválida não passa', () => {
    expect(gastarPool(10, 0).ok).toBe(false)
    expect(gastarPool(10, -2).ok).toBe(false)
  })
})

describe('20.1 — Reserva Divina: pool de dados (caso da spec)', () => {
  const max = maximoPool(RESERVA, KRAD) // 4

  it('Paladino 4 → 4 dados', () => {
    expect(max).toBe(4)
  })
  it('gastar 2 dados → restam 2, e a rolagem é 2d12', () => {
    const r = gastarPool(4, 2)
    expect(r.ok).toBe(true)
    expect(r.novo).toBe(2)
    expect(notacaoGasto(RESERVA, 2)).toBe('2d12')
  })
  it('notação aceita dado escrito com ou sem "d"', () => {
    expect(notacaoGasto({ dado: '12' }, 3)).toBe('3d12')
    expect(notacaoGasto({ dado: 'D8' }, 1)).toBe('1d8')
    expect(notacaoGasto({ dado: '' }, 1)).toBe('')
  })
})

describe('20.1 — modos de recuperação', () => {
  const pool = max => ({
    recuperacao: {
      d1: { modo: 'total' },
      d2: { modo: 'parcial', valor: 0.5 },
      d3: { modo: 'fixo', valor: 3 },
      d4: { modo: 'fixo', valor: 'nivel', valor_e_formula: true },
      d5: { modo: 'nada' },
    },
    _max: max,
  })
  const P = pool(26)

  it('total enche', () => expect(recuperarPool(P, 10, 26, 'd1')).toBe(26))
  it('parcial soma piso(máximo × fração)', () => expect(recuperarPool(P, 10, 26, 'd2')).toBe(23))
  it('fixo soma o valor', () => expect(recuperarPool(P, 10, 26, 'd3')).toBe(13))
  it('fixo aceita fórmula', () => expect(recuperarPool(P, 10, 26, 'd4', { nivel: 5 })).toBe(15))
  it('nada mantém', () => expect(recuperarPool(P, 10, 26, 'd5')).toBe(10))
  it('nenhum modo passa do máximo', () => {
    expect(recuperarPool(P, 25, 26, 'd3')).toBe(26)
    expect(recuperarPool(P, 25, 26, 'd2')).toBe(26)
  })
  it('fórmula quebrada no fixo não recupera nada (falha em 0)', () => {
    const ruim = { recuperacao: { d: { modo: 'fixo', valor: 'nivel +', valor_e_formula: true } } }
    expect(recuperarPool(ruim, 10, 26, 'd')).toBe(10)
  })
})

describe('20.1 — recuperarQuantidade (botões +/- da ficha)', () => {
  it('soma sem passar do máximo e sem ficar negativo', () => {
    expect(recuperarQuantidade(24, 26, 5)).toBe(26)
    expect(recuperarQuantidade(3, 26, -5)).toBe(0)
    expect(recuperarQuantidade(10, 26, 1)).toBe(11)
  })
})

describe('20.1 — mapaPools alimenta a variável pool() das fórmulas', () => {
  it('indexa por id E por nome, com o valor ATUAL', () => {
    const maximos = { 'p-thariuns': 26, 'p-reserva': 4 }
    const linhas = [{ pool_id: 'p-thariuns', atual: 23 }]
    const m = mapaPools([THARIUNS, RESERVA], linhas, maximos)
    expect(m['p-thariuns']).toBe(23)
    expect(m['Thariuns']).toBe(23)
    expect(m['Reserva Divina']).toBe(4) // sem linha → cheio
  })
})
