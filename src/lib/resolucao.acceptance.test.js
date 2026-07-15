import { describe, it, expect } from 'vitest'
import {
  resolverRolagem, reresolver, descreverResultado,
  paradaComVantagem, escolherRollUnder, percentuaisAplicaveis, validarResolucao,
} from './resolutionEngine'

/**
 * TESTE DE ACEITAÇÃO — Fase 23 (Modos de Resolução).
 * Sistemas de referência PERMANENTES: um WoD-like (parada d10), um roll-under-like
 * (d100) e um por faixas (2d6). Nada proprietário — só estruturas/números. Trava a
 * fase contra regressão e garante que o modo soma continua idêntico.
 */

// ─────────────────────────────────────────── (a) WoD-like: parada d10
describe('Aceitação 23 · sistema WoD-like (parada d10, dif 6, par-crítico, botch, Fome)', () => {
  const SIST = {
    modo: 'sucessos', dado: 10, dificuldade_padrao: 6,
    par_de_max_critico: true, um_anula_sucesso: false, max_conta_dobrado: false, botch: true,
    dados_especiais: { ativo: true, nome: 'Fome', marcacoes: [
      { evento: 'critico_com_especial', rotulo: 'Crítico Sujo', texto: 'A Besta se manifesta.' },
      { evento: 'falha_com_especial', rotulo: 'Falha Bestial', texto: 'A Fome toma conta.' },
    ] },
  }

  it('Força+Briga como parada: 5 dados, dif 6', () => {
    // "Força 3 + Briga 2" = parada 5. Resultados [8,6,4,3,2] → 2 sucessos
    const r = resolverRolagem({ config: SIST, dados: [8, 6, 4, 3, 2] })
    expect(r.sucessos).toBe(2)
    expect(descreverResultado(r).texto).toBe('2 sucessos')
  })

  it('crítico por par de 10s', () => {
    const r = resolverRolagem({ config: SIST, dados: [10, 10, 7, 6, 2] })
    expect(r.critico).toBe(true)
    expect(r.sucessos).toBe(6) // 4 base + 2 do par
    expect(descreverResultado(r).texto).toBe('6 sucessos — crítico!')
  })

  it('botch (0 sucessos e um 1)', () => {
    const r = resolverRolagem({ config: SIST, dados: [5, 4, 3, 2, 1] })
    expect(r.botch).toBe(true)
    expect(descreverResultado(r).cor).toBe('vermelho')
  })

  it('rerolagem: trocar os fracassos re-resolve a parada inteira', () => {
    const params = { config: SIST, dados: [5, 4, 3, 2, 1] }
    expect(resolverRolagem(params).sucessos).toBe(0)
    const r = reresolver(params, [1, 2, 4], [7, 8, 6]) // rerola 3 fracassos
    expect(r.sucessos).toBe(3)
  })

  it('Dados de Fome disparam as marcações nomeadas pelo mestre', () => {
    // crítico com um 10 sendo Fome → Crítico Sujo
    const sujo = resolverRolagem({ config: SIST, dados: [10, 10, 6, 3, 2], especiais_idx: [0] })
    expect(sujo.marcacao.rotulo).toBe('Crítico Sujo')
    expect(descreverResultado(sujo).marcacao.texto).toBe('A Besta se manifesta.')
    // botch com um 1 sendo Fome → Falha Bestial
    const bestial = resolverRolagem({ config: SIST, dados: [4, 3, 2, 1, 5], especiais_idx: [3] })
    expect(bestial.marcacao.rotulo).toBe('Falha Bestial')
  })

  it('percentuais (F18) NÃO se aplicam neste modo — o editor avisa', () => {
    expect(percentuaisAplicaveis('sucessos')).toBe(false)
    expect(validarResolucao(SIST).avisos.some(a => a.includes('percentuais'))).toBe(true)
  })
})

// ─────────────────────────────────────────── (b) roll-under-like: d100
describe('Aceitação 23 · sistema roll-under-like (d100, alvo = perícia, qualidades)', () => {
  const SIST = { modo: 'roll_under', dado: 100, faixas_qualidade: true, critico_em: 1, desastre_em: 100 }
  const rolar = v => resolverRolagem({ config: SIST, dados: [v], dificuldade: 60 })

  it('perícia 60: extremo / bom / normal / falha', () => {
    expect(rolar(11).qualidade).toBe('extremo') // ≤ 12
    expect(rolar(29).qualidade).toBe('bom')      // ≤ 30
    expect(rolar(55).qualidade).toBe('normal')   // ≤ 60
    expect(rolar(61).sucesso).toBe(false)
    expect(descreverResultado(rolar(11)).texto).toBe('11 vs 60 — Extremo')
  })
  it('crítico no 1, desastre no 100', () => {
    expect(rolar(1).critico).toBe(true)
    expect(rolar(100).desastre).toBe(true)
  })
})

// ─────────────────────────────────────────── (c) faixas: 2d6
describe('Aceitação 23 · sistema por faixas (2d6, textos no feed)', () => {
  const SIST = { modo: 'faixas', notacao_base: '2d6', faixas: [
    { de: null, ate: 6, rotulo: 'Falha', texto: 'O mestre faz um movimento.', cor: 'vermelho' },
    { de: 7, ate: 9, rotulo: 'Sucesso parcial', texto: 'Você consegue, mas a um custo.', cor: 'ambar' },
    { de: 10, ate: null, rotulo: 'Sucesso pleno', texto: 'Você consegue plenamente.', cor: 'verde' },
  ] }
  const total = (dados, mod) => resolverRolagem({ config: SIST, dados, dificuldade: mod })

  it('os três resultados com seus textos', () => {
    expect(descreverResultado(total([2, 3], 0)).texto).toBe('Falha (5)')
    const parcial = descreverResultado(total([4, 3], 1)) // 8
    expect(parcial.texto).toBe('Sucesso parcial (8)')
    expect(parcial.textoFaixa).toBe('Você consegue, mas a um custo.')
    expect(descreverResultado(total([5, 5], 1)).texto).toBe('Sucesso pleno (11)')
  })
})

// ─────────────────────────────────────────── (d) soma intocado
describe('Aceitação 23 · modo soma idêntico ao de antes (regressão)', () => {
  it('sem config = soma; soma pura + modificador', () => {
    expect(resolverRolagem({ dados: [4, 6, 2] }).total).toBe(12)
    expect(resolverRolagem({ config: { modo: 'soma' }, dados: [4, 6, 2], dificuldade: 3 }).total).toBe(15)
    expect(descreverResultado({ modo: 'soma', total: 15 })).toBeNull() // feed usa o total normal
  })
})

// ─────────────────────────────────────────── vantagem por modo (23.6)
describe('Aceitação 23 · vantagem/desvantagem por modo (convenção documentada)', () => {
  it('sucessos: ±2 dados na parada (nunca < 0)', () => {
    expect(paradaComVantagem(5, 'vantagem')).toBe(7)
    expect(paradaComVantagem(5, 'desvantagem')).toBe(3)
    expect(paradaComVantagem(1, 'desvantagem')).toBe(0) // piso
    expect(paradaComVantagem(5, 'normal')).toBe(5)
  })
  it('roll_under: rola 2, pega o menor (vant.) / maior (desv.)', () => {
    expect(escolherRollUnder([12, 40], 'vantagem')).toEqual({ usado: 12, descartado: 40 })
    expect(escolherRollUnder([12, 40], 'desvantagem')).toEqual({ usado: 40, descartado: 12 })
    expect(escolherRollUnder([12, 40], 'normal')).toEqual({ usado: 12, descartado: null })
  })
})
