import { describe, it, expect } from 'vitest'
import {
  slotsAtivos, linhaDaGrade, slotsTotais, usadosPorCirculo, slotsDisponiveis,
  circulosGastaveis, gastarSlot, devolverSlot, recuperarSlots, diffRecuperacaoSlots,
} from './slotsEngine'

const CLS_PALADINO = 'cls-pal'
const CLS_BARBARO = 'cls-bar'
const CLS_MAGO = 'cls-mago'

// Grade DIGITADA pelo mestre (nada embutido): Paladino ganha slots devagar.
const SISTEMA_KRAD = {
  slots: {
    ativo: true,
    rotulo: 'Espaços de Magia',
    circulo_max: 9,
    preparacao: true,
    cd_formula: '8 + proficiencia + mod(carisma)',
    grades: {
      [CLS_PALADINO]: { 2: [2], 3: [3], 5: [4, 2] },
      [CLS_MAGO]: { 1: [2], 3: [4, 2] },
      // Bárbaro não tem grade — não contribui com slots
    },
    recuperacao: { 'desc-longo': { modo: 'total' }, 'desc-curto': { modo: 'nada' } },
  },
}

// Infinit Corridor: slots desativados
const SISTEMA_IC = { slots: { ativo: false } }

// Krad: Bárbaro 9 / Paladino 4
const KRAD_CLASSES = [
  { classe_id: CLS_BARBARO, nivel: 9 },
  { classe_id: CLS_PALADINO, nivel: 4 },
]

describe('20.3 — modo opcional', () => {
  it('sistema com slots desativados não tem totais', () => {
    expect(slotsAtivos(SISTEMA_IC)).toBe(false)
    expect(slotsTotais(SISTEMA_IC, KRAD_CLASSES)).toEqual({})
  })
  it('config ausente = desativado', () => {
    expect(slotsAtivos(null)).toBe(false)
    expect(slotsAtivos({})).toBe(false)
  })
})

describe('20.3 — linha da grade: a maior definida que não passa do nível', () => {
  const grade = SISTEMA_KRAD.slots.grades[CLS_PALADINO]
  it('nível exato', () => {
    expect(linhaDaGrade(grade, 3)).toEqual([3])
    expect(linhaDaGrade(grade, 5)).toEqual([4, 2])
  })
  it('nível intermediário usa a última linha definida', () => {
    expect(linhaDaGrade(grade, 4)).toEqual([3]) // Paladino 4 → linha do 3
    expect(linhaDaGrade(grade, 9)).toEqual([4, 2])
  })
  it('abaixo da primeira linha → nada', () => {
    expect(linhaDaGrade(grade, 1)).toBeNull()
  })
  it('classe sem grade → nada', () => {
    expect(linhaDaGrade(undefined, 9)).toBeNull()
  })
})

describe('20.3 — Krad (Bárbaro 9 / Paladino 4): 1º círculo 3/3', () => {
  const totais = slotsTotais(SISTEMA_KRAD, KRAD_CLASSES)

  it('total derivado da grade do Paladino; Bárbaro não contribui', () => {
    expect(totais).toEqual({ 1: 3 })
  })

  it('sem nada usado → 3 disponíveis', () => {
    expect(slotsDisponiveis(totais, {})).toEqual({ 1: 3 })
  })

  it('gastar um slot → 2/3', () => {
    const r = gastarSlot(1, totais, {})
    expect(r.ok).toBe(true)
    expect(r.usados).toBe(1)
    expect(slotsDisponiveis(totais, { 1: 1 })).toEqual({ 1: 2 })
  })

  it('descanso longo devolve tudo → 3/3', () => {
    const novo = recuperarSlots(SISTEMA_KRAD, 'desc-longo', { 1: 3 })
    expect(novo).toEqual({ 1: 0 })
    expect(slotsDisponiveis(totais, novo)).toEqual({ 1: 3 })
  })

  it('descanso curto não devolve slots', () => {
    expect(recuperarSlots(SISTEMA_KRAD, 'desc-curto', { 1: 2 })).toEqual({ 1: 2 })
    expect(recuperarSlots(SISTEMA_KRAD, 'inexistente', { 1: 2 })).toEqual({ 1: 2 })
  })
})

describe('20.3 — multiclasse soma as grades', () => {
  it('Paladino 5 + Mago 3 somam por círculo', () => {
    const totais = slotsTotais(SISTEMA_KRAD, [
      { classe_id: CLS_PALADINO, nivel: 5 }, // [4,2]
      { classe_id: CLS_MAGO, nivel: 3 },     // [4,2]
    ])
    expect(totais).toEqual({ 1: 8, 2: 4 })
  })
  it('zeros na grade não criam círculo', () => {
    const cfg = { slots: { ativo: true, grades: { c: { 1: [2, 0] } } } }
    expect(slotsTotais(cfg, [{ classe_id: 'c', nivel: 1 }])).toEqual({ 1: 2 })
  })
})

describe('20.3 — gastar slot: falha antes do efeito, com motivo', () => {
  const totais = { 1: 3, 2: 1 }
  it('esgotado bloqueia com aviso claro', () => {
    const r = gastarSlot(1, totais, { 1: 3 })
    expect(r.ok).toBe(false)
    expect(r.usados).toBe(3) // nada foi debitado
    expect(r.motivo).toMatch(/esgotad/i)
  })
  it('círculo sem slots bloqueia', () => {
    const r = gastarSlot(5, totais, {})
    expect(r.ok).toBe(false)
    expect(r.motivo).toMatch(/Sem slots/i)
  })
  it('devolver nunca fica negativo', () => {
    expect(devolverSlot(1, { 1: 1 })).toBe(0)
    expect(devolverSlot(1, {})).toBe(0)
  })
})

describe('20.3 — círculos gastáveis (escolha ao usar um poder)', () => {
  const totais = { 1: 3, 2: 1, 3: 2 }
  it('do círculo mínimo para cima, só os que têm disponível', () => {
    expect(circulosGastaveis(totais, { 2: 1 }, 1)).toEqual([1, 3]) // 2º esgotado
    expect(circulosGastaveis(totais, {}, 3)).toEqual([3])
    expect(circulosGastaveis(totais, { 1: 3, 2: 1, 3: 2 }, 1)).toEqual([])
  })
})

describe('20.3 — usadosPorCirculo e preview do descanso', () => {
  it('converte as linhas de slots_ficha', () => {
    expect(usadosPorCirculo([{ circulo: 1, usados: 2 }, { circulo: 3, usados: 0 }]))
      .toEqual({ 1: 2, 3: 0 })
  })
  it('diff mostra só o que muda', () => {
    const d = diffRecuperacaoSlots(SISTEMA_KRAD, 'desc-longo', { 1: 2, 2: 0 })
    expect(d).toEqual([{ circulo: 1, de: 2, para: 0 }])
  })
  it('descanso que não recupera → diff vazio', () => {
    expect(diffRecuperacaoSlots(SISTEMA_KRAD, 'desc-curto', { 1: 2 })).toEqual([])
  })
})
