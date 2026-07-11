import { describe, it, expect } from 'vitest'
import {
  ehRolado, notacaoDoGanho, avaliarGanho, inicialDaRaca, ganhoPorNivelDaRaca,
  custoDistribuicao, validarDistribuicao, saldoDoLog,
} from './pontosEngine'

describe('22.1 — tipo de ganho (fixo x rolado)', () => {
  it('detecta ganho rolado', () => {
    expect(ehRolado('1d6 + 10')).toBe(true)
    expect(ehRolado('d20')).toBe(true)
    expect(ehRolado('16')).toBe(false)
    expect(ehRolado('nivel * 2')).toBe(false)
  })
  it('inicial 16 do Humano IC (fixo)', () => {
    expect(avaliarGanho('16', {})).toBe(16)
  })
  it('ganho fixo por fórmula', () => {
    expect(avaliarGanho('nivel * 2', { nivel: 5 })).toBe(10)
    expect(avaliarGanho('piso(nivel / 2)', { nivel: 7 })).toBe(3)
  })
  it('fixo: frações para baixo, nunca negativo, vazio → 0', () => {
    expect(avaliarGanho('nivel / 2', { nivel: 7 })).toBe(3)
    expect(avaliarGanho('0 - 5', {})).toBe(0)
    expect(avaliarGanho('', {})).toBe(0)
  })
  it('ganho d6+10 rolado: resolve variáveis e devolve a notação p/ a UI rolar', () => {
    expect(notacaoDoGanho('1d6 + 10', {})).toBe('1d6+10')
    // com variável na quantidade/bônus
    expect(notacaoDoGanho('1d6 + nivel', { nivel: 3 })).toBe('1d6+3')
  })
})

describe('22.1 — inicial/ganho por raça sobrescrevem o padrão', () => {
  const config = { inicial_por_raca: true, inicial: '10', ganho_por_nivel: '1d6 + 10' }
  it('raça define o inicial', () => {
    expect(inicialDaRaca(config, { pontos_config: { inicial: '16' } })).toBe('16')
  })
  it('sem override, usa o padrão do sistema', () => {
    expect(inicialDaRaca(config, { pontos_config: {} })).toBe('10')
    expect(inicialDaRaca(config, null)).toBe('10')
  })
  it('ganho por nível: raça sobrescreve; senão o do sistema', () => {
    expect(ganhoPorNivelDaRaca(config, { pontos_config: { ganho_por_nivel: '1d8 + 12' } })).toBe('1d8 + 12')
    expect(ganhoPorNivelDaRaca(config, null)).toBe('1d6 + 10')
  })
})

describe('22.1 — distribuição respeita saldo e teto', () => {
  const valoresBase = { forca: 10, agilidade: 10 }

  it('custo = pontos distribuídos × custo_por_ponto', () => {
    expect(custoDistribuicao({ forca: 3, agilidade: 2 }, 1)).toBe(5)
    expect(custoDistribuicao({ forca: 3 }, 2)).toBe(6)
  })

  it('dentro do saldo → válido, com restante', () => {
    const r = validarDistribuicao({ distribuicao: { forca: 6, agilidade: 4 }, disponiveis: 16, custo_por_ponto: 1, valoresBase })
    expect(r.valido).toBe(true)
    expect(r.custo).toBe(10)
    expect(r.restante).toBe(6)
  })

  it('acima do saldo → inválido', () => {
    const r = validarDistribuicao({ distribuicao: { forca: 20 }, disponiveis: 16, custo_por_ponto: 1, valoresBase })
    expect(r.valido).toBe(false)
    expect(r.erro).toMatch(/insuficientes/i)
  })

  it('respeita o teto por atributo', () => {
    const r = validarDistribuicao({ distribuicao: { forca: 11 }, disponiveis: 99, custo_por_ponto: 1, valoresBase, maximo_por_atributo: 20 })
    expect(r.valido).toBe(false) // 10 + 11 = 21 > 20
    expect(r.erro).toMatch(/teto/i)
  })

  it('deltas negativos são rejeitados (gasto é definitivo)', () => {
    expect(validarDistribuicao({ distribuicao: { forca: -1 }, disponiveis: 16 }).valido).toBe(false)
  })

  it('sem teto e dentro do saldo → ok', () => {
    expect(validarDistribuicao({ distribuicao: { forca: 16 }, disponiveis: 16, custo_por_ponto: 1, valoresBase }).valido).toBe(true)
  })
})

describe('22.1 — integridade do log (ganhos − gastos = disponíveis)', () => {
  const log = [
    { tipo: 'ganho_inicial', quantidade: 16 },
    { tipo: 'ganho_nivel', quantidade: 14 },
    { tipo: 'gasto', quantidade: -10 },
    { tipo: 'ajuste', quantidade: 2 },
  ]
  it('soma bate com o saldo', () => {
    expect(saldoDoLog(log)).toBe(22) // 16 + 14 - 10 + 2
  })
  it('log vazio → 0', () => {
    expect(saldoDoLog([])).toBe(0)
  })
})
