import { describe, it, expect } from 'vitest'
import { avaliarCondicao } from './modifierEngine'
import { montarCondicao } from './efeitoForm'

const ctx = {
  atributos: { forca: 14 },
  estados: { fome: 4 },
  pools: { mana: 3 },
  nivel: 5,
  vida_atual: 8,
  vida_max: 30,
  pericias: {},
  recursos: {},
}
const estadoFicha = { vida_atual: 8, vida_max: 30, nivel: 5, ctxFormula: ctx }

describe('condição por fórmula (metrica: formula)', () => {
  it('satisfaz quando a fórmula bate o comparador — estado(fome) >= 4', () => {
    const mod = { condicao_config: { metrica: 'formula', formula: 'estado(fome)', operador: '>=', valor: 4 } }
    expect(avaliarCondicao(mod, estadoFicha)).toBe(true)
  })

  it('não satisfaz quando a fórmula não bate', () => {
    const mod = { condicao_config: { metrica: 'formula', formula: 'estado(fome)', operador: '>=', valor: 5 } }
    expect(avaliarCondicao(mod, estadoFicha)).toBe(false)
  })

  it('lê pool — pool(mana) < 5', () => {
    const mod = { condicao_config: { metrica: 'formula', formula: 'pool(mana)', operador: '<', valor: 5 } }
    expect(avaliarCondicao(mod, estadoFicha)).toBe(true)
  })

  it('aceita expressão composta, não só uma variável', () => {
    const mod = { condicao_config: { metrica: 'formula', formula: 'atributo(forca) + nivel', operador: '>=', valor: 19 } }
    expect(avaliarCondicao(mod, estadoFicha)).toBe(true)
  })

  it('fórmula inválida NÃO quebra a ficha — apenas não satisfaz', () => {
    const mod = { condicao_config: { metrica: 'formula', formula: 'estado(inexistente)', operador: '>=', valor: 1 } }
    expect(avaliarCondicao(mod, estadoFicha)).toBe(false)
  })

  it('sem contexto de fórmula, não satisfaz (nunca lança)', () => {
    const mod = { condicao_config: { metrica: 'formula', formula: 'estado(fome)', operador: '>=', valor: 1 } }
    expect(avaliarCondicao(mod, { vida_atual: 8, vida_max: 30, nivel: 5 })).toBe(false)
  })

  it('fórmula vazia não satisfaz', () => {
    const mod = { condicao_config: { metrica: 'formula', formula: '', operador: '>=', valor: 1 } }
    expect(avaliarCondicao(mod, estadoFicha)).toBe(false)
  })
})

describe('retrocompatibilidade das métricas antigas', () => {
  it('nivel continua funcionando', () => {
    expect(avaliarCondicao({ condicao_config: { metrica: 'nivel', operador: '>=', valor: 5 } }, estadoFicha)).toBe(true)
    expect(avaliarCondicao({ condicao_config: { metrica: 'nivel', operador: '>', valor: 5 } }, estadoFicha)).toBe(false)
  })

  it('vida_percent continua funcionando', () => {
    const mod = { condicao_config: { metrica: 'vida_percent', operador: '<=', valor: 50 } }
    expect(avaliarCondicao(mod, estadoFicha)).toBe(true)
  })

  it('habilidade_ativa continua funcionando', () => {
    const mod = { condicao_config: { metrica: 'habilidade_ativa', habilidade_id: 'h1' } }
    expect(avaliarCondicao(mod, { ...estadoFicha, habilidadesAtivas: new Set(['h1']) })).toBe(true)
    expect(avaliarCondicao(mod, { ...estadoFicha, habilidadesAtivas: new Set([]) })).toBe(false)
  })
})

describe('montarCondicao com métrica formula', () => {
  it('guarda formula, operador e valor', () => {
    const r = montarCondicao({ condTipo: 'auto', condMetrica: 'formula', condFormula: '  estado(fome) ', condOperador: '>=', condValor: '4' })
    expect(r).toEqual({
      condicao_tipo: 'auto',
      condicao_config: { metrica: 'formula', formula: 'estado(fome)', operador: '>=', valor: 4 },
    })
  })

  it('métricas antigas seguem com o mesmo formato de sempre', () => {
    expect(montarCondicao({ condTipo: 'auto', condMetrica: 'nivel', condOperador: '>=', condValor: '3' }))
      .toEqual({ condicao_tipo: 'auto', condicao_config: { metrica: 'nivel', operador: '>=', valor: 3 } })
    expect(montarCondicao({ condTipo: 'auto', condMetrica: 'habilidade_ativa' }))
      .toEqual({ condicao_tipo: 'auto', condicao_config: { metrica: 'habilidade_ativa' } })
    expect(montarCondicao({ condTipo: 'nenhuma' }))
      .toEqual({ condicao_tipo: 'nenhuma', condicao_config: null })
  })
})
