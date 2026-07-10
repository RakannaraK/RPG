import { describe, it, expect } from 'vitest'
import { maximoPool, gastarPool, notacaoGasto, recuperarPool, calcularMaximos } from './poolEngine'
import { slotsTotais, slotsDisponiveis, gastarSlot, circulosGastaveis, slotsAtivos, recuperarSlots } from './slotsEngine'
import { podeUsarPoder, montarNotacaoUso, cdDoPoder } from './poderes'
import { podeAtivarHabilidade, planejarTurno } from './custoHabilidade'
import { avaliarFormula } from './formulaEngine'

/**
 * Teste de aceitação da Fase 20, com as duas fichas de referência.
 * Cobre os itens (a), (b) e (c) do critério da spec.
 */

// ─── (a) Krad — grimório D&D-like ───────────────────────────────────────────
const CLS_PALADINO = 'cls-pal'
const KRAD = {
  nivel: 13,
  niveisClasse: { [CLS_PALADINO]: 4, barbaro: 9, paladino: 4 },
  formula_proficiencia: '2 + teto(nivel / 4) - 1',
  formulaModificador: 'piso((x-10)/2)',
  atributos: { carisma: 12 }, // mod +1 → CD 14 com proficiência 5
}

describe('Fase 20 (a) — Krad: grimório e reserva de dados', () => {
  it('Espaços de Magia: grade do Paladino → 1º círculo 3/3', () => {
    const sistema = { slots: { ativo: true, grades: { [CLS_PALADINO]: { 2: [2], 3: [3] } } } }
    const totais = slotsTotais(sistema, [{ classe_id: CLS_PALADINO, nivel: 4 }])
    expect(totais).toEqual({ 1: 3 })
    expect(slotsDisponiveis(totais, {})).toEqual({ 1: 3 })
  })

  it('CD de magia 14 pela fórmula do sistema', () => {
    // 8 + proficiencia(5) + mod(carisma 12 → 1) = 14
    expect(cdDoPoder({ nome: 'Curar' }, '8 + proficiencia + mod(carisma)', KRAD)).toBe(14)
  })

  it('Curar Feridas conjurável no 1º e no 2º (escala +1d8)', () => {
    const curar = {
      circulo: 1,
      custo: [{ tipo: 'slot', circulo_minimo: 1 }],
      efeito_notacao: '1d8 + mod(carisma)',
      escala_circulo: { faixas: [{ de: 2, ate: null, valor_extra_por_circulo: '1d8' }] },
    }
    const totais = { 1: 3, 2: 2 }
    const check = podeUsarPoder(curar, { totaisSlots: totais, usadosSlots: {} })
    expect(check.ok).toBe(true)
    expect(check.circulos).toEqual([1, 2]) // pode escolher o círculo
    expect(montarNotacaoUso(curar, 1)).toBe('1d8 + mod(carisma)')
    expect(montarNotacaoUso(curar, 2)).toBe('1d8 + mod(carisma) + 1d8')
  })

  it('Destruição Divina gasta slot de qualquer círculo ≥ 1', () => {
    const poder = { custo: [{ tipo: 'slot', circulo_minimo: 1 }] }
    const totais = { 1: 3, 2: 2, 3: 1 }
    expect(circulosGastaveis(totais, { 1: 3 }, 1)).toEqual([2, 3]) // 1º esgotado, sobem
    const check = podeUsarPoder(poder, { totaisSlots: totais, usadosSlots: { 1: 3 } })
    expect(check.ok).toBe(true)
  })

  it('Reserva Divina: 4d12 gastável para curar', () => {
    const reserva = { tipo: 'dados', dado: 'd12', maximo_formula: '4 + piso(nivel(paladino) / 6)' }
    const max = maximoPool(reserva, KRAD)
    expect(max).toBe(4)
    const r = gastarPool(4, 2)
    expect(r.ok).toBe(true)
    expect(r.novo).toBe(2)
    expect(notacaoGasto(reserva, 2)).toBe('2d12') // rola 2d12 para curar
  })

  it('slot esgotado bloqueia com aviso', () => {
    const r = gastarSlot(1, { 1: 3 }, { 1: 3 })
    expect(r.ok).toBe(false)
    expect(r.motivo).toMatch(/esgotad/i)
  })

  it('descanso longo devolve os slots', () => {
    const sistema = { slots: { ativo: true, recuperacao: { longo: { modo: 'total' } } } }
    expect(recuperarSlots(sistema, 'longo', { 1: 3 })).toEqual({ 1: 0 })
  })
})

// ─── (b) Infinit Corridor — Thariuns e transformação ────────────────────────
const IC = { nivel: 13 }

describe('Fase 20 (b) — IC: Thariuns, poder e transformação', () => {
  const THARIUNS = {
    id: 'p-thar', nome: 'Thariuns', tipo: 'pontos', maximo_formula: '2 * nivel',
    recuperacao: { longo: { modo: 'total' } },
  }

  it('Thariuns 2 × nível → 26 no nível 13', () => {
    expect(maximoPool(THARIUNS, IC)).toBe(26)
  })

  it('Pontos de Foco: outro pool independente', () => {
    const foco = { id: 'p-foco', nome: 'Pontos de Foco', maximo_formula: '5' }
    const { maximos } = calcularMaximos([THARIUNS, foco], IC)
    expect(maximos['p-thar']).toBe(26)
    expect(maximos['p-foco']).toBe(5)
  })

  it('poder custando 3 Thariuns: bloqueia com 2, libera com 26', () => {
    const poder = { custo: [{ tipo: 'pool', pool_id: 'p-thar', quantidade: '3' }] }
    const poolsPorId = { 'p-thar': THARIUNS }
    expect(podeUsarPoder(poder, { atualDoPool: () => 2, poolsPorId }).ok).toBe(false)
    const ok = podeUsarPoder(poder, { atualDoPool: () => 26, poolsPorId })
    expect(ok.ok).toBe(true)
    expect(ok.custos).toEqual([{ pool_id: 'p-thar', quantidade: 3 }])
  })

  it('transformação custa 2 Thariuns/turno: ativar debita, e desativa ao zerar', () => {
    const transf = { id: 'h', nome: 'Transformação', custo_pool: [{ pool_id: 'p-thar', quantidade: '2', por_turno: true }] }
    const poolsPorId = { 'p-thar': THARIUNS }
    const ativas = [{ id: 'hf', habilidade: transf }]

    // ativar debita 2
    expect(podeAtivarHabilidade(transf, { atualDoPool: () => 26, poolsPorId }).custos)
      .toEqual([{ pool_id: 'p-thar', quantidade: 2 }])

    // cada turno debita 2
    expect(planejarTurno(ativas, { atualDoPool: () => 26, poolsPorId }).debitos)
      .toEqual([{ pool_id: 'p-thar', atual: 24 }])

    // Thariuns zerando → desativa, sem debitar
    const p = planejarTurno(ativas, { atualDoPool: () => 1, poolsPorId })
    expect(p.debitos).toEqual([])
    expect(p.desativar).toEqual(['hf'])
    expect(p.avisos[0]).toMatch(/desativada/)
  })
})

// ─── (c) Painéis invisíveis em sistemas sem esses recursos ──────────────────
describe('Fase 20 (c) — adaptativo: nada aparece sem recursos', () => {
  it('sem pools, calcularMaximos devolve vazio', () => {
    const { maximos } = calcularMaximos([], IC)
    expect(maximos).toEqual({})
  })
  it('slots desativados não têm totais', () => {
    expect(slotsAtivos({ slots: { ativo: false } })).toBe(false)
    expect(slotsTotais({ slots: { ativo: false } }, [{ classe_id: 'x', nivel: 5 }])).toEqual({})
    expect(slotsAtivos(null)).toBe(false)
  })
  it('habilidade sem custo_pool sempre ativa e não cobra turno', () => {
    const hab = { nome: 'Postura' }
    expect(podeAtivarHabilidade(hab, {}).ok).toBe(true)
    expect(planejarTurno([{ id: 'x', habilidade: hab }], {}).debitos).toEqual([])
  })
})
