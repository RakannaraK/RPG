import { describe, it, expect } from 'vitest'
import {
  clampEstado, faixaAtivaDoEstado, modificadoresDeEstados, avisosDeEstados,
  bloqueiosDeEstados, mapaEstados, especiaisDeEstados, calorDoEstado,
} from './estadosEngine'
import { avaliarFormula } from './formulaEngine'
import { calcularValoresFinais } from './modifierEngine'

// Estado de referência (formato genérico; nomes do mestre)
const FOME = {
  id: 'fome', nome: 'Fome', min: 0, max: 5, inicial: 1, destaque: true,
  alimenta_dados_especiais: true,
  efeitos_por_faixa: [
    { de: 4, ate: 4, aviso: 'Fome voraz: a Besta está próxima.', modificadores: [
      { id: 'mf4', tipo: 'atributo', alvo: 'autocontrole', operacao: 'somar', valor: -1 },
    ] },
    { de: 5, ate: null, aviso: 'Não pode gastar mais vitae.', bloqueios: ['gastar_vitae'], modificadores: [] },
  ],
}

describe('24.4 · clamp e faixa ativa', () => {
  it('linha ausente = inicial; preso a [min, max]', () => {
    expect(clampEstado(undefined, FOME)).toBe(1)
    expect(clampEstado(9, FOME)).toBe(5)
    expect(clampEstado(-2, FOME)).toBe(0)
  })
  it('faixa por valor (4 → voraz; 5 → bloqueio; 2 → nenhuma)', () => {
    expect(faixaAtivaDoEstado(FOME, 4).aviso).toContain('voraz')
    expect(faixaAtivaDoEstado(FOME, 5).bloqueios).toEqual(['gastar_vitae'])
    expect(faixaAtivaDoEstado(FOME, 2)).toBeNull()
  })
})

describe('24.4 · efeitos por faixa entram no pipeline F12/18 (sem segundo mecanismo)', () => {
  it('Fome 4: o modificador da faixa aplica −1 no atributo', () => {
    const mods = modificadoresDeEstados([FOME], { fome: 4 })
    expect(mods).toHaveLength(1)
    expect(mods[0]._fonte).toBe('Fome')
    const finais = calcularValoresFinais({ atributos: { autocontrole: 3 }, vida_max: 0, combate: {} }, mods)
    expect(finais.atributos.autocontrole).toBe(2)
  })
  it('Fome 3: nenhuma faixa → nenhum modificador (entra/sai automático)', () => {
    expect(modificadoresDeEstados([FOME], { fome: 3 })).toEqual([])
  })
})

describe('24.4 · avisos, bloqueios e destaque', () => {
  it('aviso da faixa ativa vira chip', () => {
    expect(avisosDeEstados([FOME], { fome: 4 })[0].aviso).toContain('voraz')
    expect(avisosDeEstados([FOME], { fome: 2 })).toEqual([])
  })
  it('bloqueio informativo no máximo', () => {
    expect(bloqueiosDeEstados([FOME], { fome: 5 })).toEqual([{ estadoId: 'fome', nome: 'Fome', bloqueio: 'gastar_vitae' }])
  })
  it('calor esquenta com o valor (0 → 0; 5 → 1)', () => {
    expect(calorDoEstado(FOME, 0)).toBe(0)
    expect(calorDoEstado(FOME, 5)).toBe(1)
  })
})

describe('24.4 · estado(x) na F17 e integração com dados especiais (F23)', () => {
  it('estado(fome) resolve por id e por nome', () => {
    const estados = mapaEstados([FOME], { fome: 3 })
    expect(avaliarFormula('estado(fome)', { estados })).toBe(3)
    expect(avaliarFormula('estado(Fome)', { estados })).toBe(3)
    expect(avaliarFormula('2 * estado(fome) + 1', { estados })).toBe(7)
  })
  it('alimenta_dados_especiais: parada com Fome 3 → 3 dados especiais', () => {
    expect(especiaisDeEstados([FOME], { fome: 3 })).toBe(3)
    expect(especiaisDeEstados([{ ...FOME, alimenta_dados_especiais: false }], { fome: 3 })).toBeNull()
  })
})
