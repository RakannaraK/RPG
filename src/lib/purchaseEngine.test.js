import { describe, it, expect } from 'vitest'
import { custoCompra, validarCompra, registroDeCompra, saldoDoLog } from './purchaseEngine'
import { mergeConfigLayout } from './sistemaDefaults'

// Categorias de referência (formato da spec; números do mestre)
const ATRIBUTO = { id: 'atributo', nome: 'Atributos', alvo: 'atributo', custo_formula: 'novo_valor * 5', maximo: 5 }
const PERICIA = { id: 'pericia', nome: 'Perícias', alvo: 'pericia', custo_formula: 'novo_valor * 3', maximo: 5 }
const LINHA = { id: 'linha_poder', nome: 'Disciplinas', alvo: 'linha_poder', custo_formula: 'novo_valor * 5', maximo: 5, custo_formula_fora: 'novo_valor * 7' }
const TRILHA = { id: 'trilha', nome: 'Força de Vontade', alvo: 'trilha_tamanho_bonus', custo_formula: '8', maximo: 3 }

describe('25.1 · contrato de compra — exemplos canônicos', () => {
  it('atributo 2→3 com "novo_valor * 5" = 15 XP', () => {
    expect(custoCompra(ATRIBUTO, 2)).toBe(15)
  })
  it('perícia 0→1 com "novo_valor * 3" = 3 XP', () => {
    expect(custoCompra(PERICIA, 0)).toBe(3)
  })
  it('linha nativa 2→3 = 15; não-nativa (custo_formula_fora) = 21', () => {
    expect(custoCompra(LINHA, 2)).toBe(15)
    expect(custoCompra(LINHA, 2, {}, { fora: true })).toBe(21)
  })
  it('custo fixo ("8") independe do valor', () => {
    expect(custoCompra(TRILHA, 0)).toBe(8)
    expect(custoCompra(TRILHA, 2)).toBe(8)
  })
  it('fórmula pode usar outras variáveis F17 (ex: nivel)', () => {
    const cat = { ...ATRIBUTO, custo_formula: 'novo_valor * 5 + nivel' }
    expect(custoCompra(cat, 2, { nivel: 4 })).toBe(19)
  })
  it('opts.fora sem custo_formula_fora cai na fórmula normal', () => {
    expect(custoCompra(ATRIBUTO, 2, {}, { fora: true })).toBe(15)
  })
})

describe('25.1 · validarCompra — bloqueios', () => {
  it('permitida quando há saldo e não estourou o máximo', () => {
    const v = validarCompra(ATRIBUTO, 2, 30)
    expect(v).toEqual({ permitida: true, custo: 15, novoValor: 3 })
  })
  it('bloqueada por XP insuficiente (com o motivo)', () => {
    const v = validarCompra(ATRIBUTO, 2, 10)
    expect(v.permitida).toBe(false)
    expect(v.custo).toBe(15)
    expect(v.motivoBloqueio).toContain('XP insuficiente')
  })
  it('bloqueada pelo máximo da categoria', () => {
    const v = validarCompra(ATRIBUTO, 5, 999)
    expect(v.permitida).toBe(false)
    expect(v.motivoBloqueio).toContain('máximo')
  })
  it('fórmula inválida bloqueia com motivo claro (não lança)', () => {
    const v = validarCompra({ ...ATRIBUTO, custo_formula: 'novo_valor *' }, 2, 99)
    expect(v.permitida).toBe(false)
    expect(v.motivoBloqueio).toContain('inválida')
  })
})

describe('25.1 · log íntegro (padrão F22): Σ ganhos − Σ gastos = disponível', () => {
  it('conceder 30, gastar 15 e 9 → saldo 6; compra de 15 bloqueia', () => {
    const log = [
      { tipo: 'ganho', quantidade: 30, detalhe: { motivo: 'Sessão 12' } },
      registroDeCompra(ATRIBUTO, 'manipulacao', 2, 15),
      registroDeCompra(PERICIA, 'briga', 2, 9),
    ]
    expect(saldoDoLog(log)).toBe(6)
    expect(validarCompra(LINHA, 2, saldoDoLog(log)).permitida).toBe(false)
  })
  it('registroDeCompra grava de/para/custo (compra é +1, definitiva)', () => {
    const r = registroDeCompra(ATRIBUTO, 'forca', 2, 15)
    expect(r).toEqual({ tipo: 'gasto', quantidade: -15, detalhe: { categoria: 'atributo', alvo_id: 'forca', de: 2, para: 3, custo: 15 } })
  })
})

describe('25.1 · migração de config F19→25 (idempotente)', () => {
  it('config antiga (só progressao_xp) → modo nivel, curva preservada', () => {
    const antiga = { progressao_xp: { modo: 'tabela', tabela: [0, 300, 900], formula: '' } }
    const cfg = mergeConfigLayout(antiga)
    expect(cfg.progressao.modo).toBe('nivel')
    expect(cfg.progressao.categorias_compra).toEqual([])
    expect(cfg.progressao_xp.tabela).toEqual([0, 300, 900]) // F19 intocada
  })
  it('config sem nada → modo nivel (comportamento F19 de sempre)', () => {
    expect(mergeConfigLayout(null).progressao.modo).toBe('nivel')
  })
  it('idempotente: migrar duas vezes = mesmo resultado', () => {
    const uma = mergeConfigLayout({ progressao_xp: { modo: 'formula', formula: '100' } })
    const duas = mergeConfigLayout(uma)
    expect(duas.progressao).toEqual(uma.progressao)
    expect(duas.progressao_xp).toEqual(uma.progressao_xp)
  })
  it('sistema já no xp_direto passa intacto', () => {
    const nova = { progressao: { modo: 'xp_direto', categorias_compra: [ATRIBUTO] } }
    const cfg = mergeConfigLayout(nova)
    expect(cfg.progressao.modo).toBe('xp_direto')
    expect(cfg.progressao.categorias_compra).toHaveLength(1)
  })
})
