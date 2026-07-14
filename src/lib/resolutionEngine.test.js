import { describe, it, expect } from 'vitest'
import { resolverRolagem, reresolver } from './resolutionEngine'

// Rolador determinístico: consome uma fila de resultados (para explosão/rerolagem)
const fila = (...seq) => { let i = 0; return () => seq[i++] }

describe('23.1 · modo sucessos — contratos canônicos', () => {
  const V5 = { modo: 'sucessos', dado: 10, dificuldade_padrao: 6, par_de_max_critico: true, um_anula_sucesso: false, max_conta_dobrado: false, botch: true }

  it('7d10 dif6 [10,10,8,6,4,2,1] V5 → 6 sucessos, crítico (par de 10s)', () => {
    const r = resolverRolagem({ config: V5, dados: [10, 10, 8, 6, 4, 2, 1] })
    expect(r.sucessos).toBe(6) // base 4 (10,10,8,6) + par de 10s (+2)
    expect(r.critico).toBe(true)
    expect(r.botch).toBe(false)
  })

  it('5d10 dif6 [5,4,3,1,1] botch → falha crítica', () => {
    const r = resolverRolagem({ config: V5, dados: [5, 4, 3, 1, 1] })
    expect(r.sucessos).toBe(0)
    expect(r.botch).toBe(true)
    expect(r.critico).toBe(false)
  })

  it('WoD clássico (um_anula) [9,7,6,1,1] dif6 → 1 sucesso', () => {
    const wod = { modo: 'sucessos', dado: 10, dificuldade_padrao: 6, um_anula_sucesso: true, par_de_max_critico: false, botch: true }
    const r = resolverRolagem({ config: wod, dados: [9, 7, 6, 1, 1] })
    expect(r.sucessos).toBe(1) // 3 sucessos − 2 uns
    expect(r.botch).toBe(false) // sucessos finais > 0
  })

  it('max_conta_dobrado: cada 10 vale 2 (specialty)', () => {
    const cfg = { modo: 'sucessos', dado: 10, dificuldade_padrao: 6, max_conta_dobrado: true, par_de_max_critico: false }
    const r = resolverRolagem({ config: cfg, dados: [10, 8, 5] })
    expect(r.sucessos).toBe(3) // 10→2, 8→1, 5→0
  })

  it('dificuldade ad-hoc sobrescreve a padrão', () => {
    const r = resolverRolagem({ config: V5, dados: [7, 7, 5], dificuldade: 8 })
    expect(r.sucessos).toBe(0) // nenhum ≥ 8
  })

  it('um_anula pode zerar mas nunca vira negativo; botch só com 1s e 0 sucessos', () => {
    const cfg = { modo: 'sucessos', dado: 10, dificuldade_padrao: 6, um_anula_sucesso: true, botch: true }
    const r = resolverRolagem({ config: cfg, dados: [6, 1, 1, 1] })
    expect(r.sucessos).toBe(0) // 1 − 3, piso 0
    expect(r.botch).toBe(true)
  })
})

describe('23.1 · modo roll_under — contratos canônicos (alvo 60)', () => {
  const CoC = { modo: 'roll_under', dado: 100, faixas_qualidade: true, critico_em: 1, desastre_em: 100 }
  const rolar = valor => resolverRolagem({ config: CoC, dados: [valor], dificuldade: 60 })

  it('11 → extremo (≤ 12)', () => { const r = rolar(11); expect(r.sucesso).toBe(true); expect(r.qualidade).toBe('extremo') })
  it('29 → bom (≤ 30)', () => { const r = rolar(29); expect(r.qualidade).toBe('bom') })
  it('55 → normal', () => { const r = rolar(55); expect(r.qualidade).toBe('normal') })
  it('61 → falha (sem qualidade)', () => { const r = rolar(61); expect(r.sucesso).toBe(false); expect(r.qualidade).toBeNull() })
  it('1 → crítico', () => { const r = rolar(1); expect(r.critico).toBe(true); expect(r.sucesso).toBe(true) })
  it('100 → desastre', () => { const r = rolar(100); expect(r.desastre).toBe(true); expect(r.sucesso).toBe(false) })

  it('desastre_em configurável (ex: 96 para alvos baixos)', () => {
    const cfg = { modo: 'roll_under', dado: 100, critico_em: 1, desastre_em: 96 }
    expect(resolverRolagem({ config: cfg, dados: [96], dificuldade: 30 }).desastre).toBe(true)
    expect(resolverRolagem({ config: cfg, dados: [95], dificuldade: 30 }).desastre).toBe(false)
  })
})

describe('23.1 · modo faixas — PbtA 2d6', () => {
  const PbtA = { modo: 'faixas', faixas: [
    { ate: 6, rotulo: 'Falha', texto: 'O mestre faz um movimento.', cor: 'vermelho' },
    { de: 7, ate: 9, rotulo: 'Sucesso parcial', texto: 'Você consegue, mas a um custo.', cor: 'ambar' },
    { de: 10, rotulo: 'Sucesso pleno', texto: 'Você consegue plenamente.', cor: 'verde' },
    { de: 12, rotulo: 'Sucesso avançado', texto: 'Efeito extra.', cor: 'verde', opcional: true },
  ] }
  const total = (dados, mod) => resolverRolagem({ config: PbtA, dados, dificuldade: mod })

  it('6- → Falha', () => { const r = total([3, 3], 0); expect(r.total).toBe(6); expect(r.faixa.rotulo).toBe('Falha') })
  it('7-9 → Sucesso parcial (texto no feed)', () => {
    const r = total([4, 3], 2); expect(r.total).toBe(9); expect(r.faixa.rotulo).toBe('Sucesso parcial')
    expect(r.faixa.texto).toBe('Você consegue, mas a um custo.')
  })
  it('10-11 → Sucesso pleno', () => { const r = total([5, 4], 1); expect(r.total).toBe(10); expect(r.faixa.rotulo).toBe('Sucesso pleno') })
  it('12+ → Sucesso avançado (tier mais alto vence 10+)', () => {
    const r = total([6, 6], 1); expect(r.total).toBe(13); expect(r.faixa.rotulo).toBe('Sucesso avançado'); expect(r.faixa.opcional).toBe(true)
  })
})

describe('23.1 · explosão (limite de segurança 20)', () => {
  it('soma: 1d6 [6] explode +3 → 9', () => {
    const cfg = { modo: 'soma', dado: 6, explosao: { ativo: true } }
    const r = resolverRolagem({ config: cfg, dados: [6], rolarDado: fila(3) })
    expect(r.total).toBe(9)
  })

  it('soma: explosão encadeada [6]→6→6→2 = 20', () => {
    const cfg = { modo: 'soma', dado: 6, explosao: { ativo: true } }
    const r = resolverRolagem({ config: cfg, dados: [6], rolarDado: fila(6, 6, 2) })
    expect(r.total).toBe(20) // 6 + 6 + 6 + 2
  })

  it('trava em 20 explosões por dado (RNG sempre no máximo)', () => {
    const cfg = { modo: 'soma', dado: 6, explosao: { ativo: true } }
    const r = resolverRolagem({ config: cfg, dados: [6], rolarDado: () => 6 })
    expect(r.dados.length).toBe(21) // 1 original + 20 explosões (para)
    expect(r.total).toBe(126) // 6 × 21
  })

  it('sucessos: dado máximo explode e entra na parada', () => {
    const cfg = { modo: 'sucessos', dado: 10, dificuldade_padrao: 6, explosao: { ativo: true }, par_de_max_critico: false }
    const r = resolverRolagem({ config: cfg, dados: [10, 4], rolarDado: fila(7, 3) })
    // 10 explode → 7 (≥6, +1) → não explode; parada [10,7,4] → sucessos 10 e 7 = 2
    expect(r.sucessos).toBe(2)
    expect(r.dados.length).toBe(3)
  })
})

describe('23.1 · rerolagem re-resolve o contrato inteiro', () => {
  it('rerolar os dois 1s por dois 10s recontou os sucessos', () => {
    const params = { config: { modo: 'sucessos', dado: 10, dificuldade_padrao: 6, par_de_max_critico: true, botch: true }, dados: [5, 4, 3, 1, 1] }
    const original = resolverRolagem(params)
    expect(original.sucessos).toBe(0)
    expect(original.botch).toBe(true)
    const rerolado = reresolver(params, [3, 4], [10, 10])
    // parada vira [5,4,3,10,10] → base 2 + par de 10s (+2) = 4, crítico
    expect(rerolado.sucessos).toBe(4)
    expect(rerolado.critico).toBe(true)
    expect(rerolado.botch).toBe(false)
  })
})

describe('23.1 · dados especiais (Fome) → marcações', () => {
  const marcacoes = [
    { evento: 'critico_com_especial', rotulo: 'Crítico Sujo', texto: 'A Besta se manifesta.' },
    { evento: 'falha_com_especial', rotulo: 'Falha Bestial', texto: 'A Fome toma conta.' },
  ]
  const cfg = { modo: 'sucessos', dado: 10, dificuldade_padrao: 6, par_de_max_critico: true, botch: true, dados_especiais: { ativo: true, marcacoes } }

  it('crítico (par de 10s) incluindo um dado de Fome → "Crítico Sujo"', () => {
    const r = resolverRolagem({ config: cfg, dados: [10, 10, 8, 6, 4, 2, 1], especiais_idx: [0, 1] })
    expect(r.critico).toBe(true)
    expect(r.marcacao.evento).toBe('critico_com_especial')
    expect(r.marcacao.rotulo).toBe('Crítico Sujo')
  })

  it('botch com 1 num dado de Fome → "Falha Bestial"', () => {
    const r = resolverRolagem({ config: cfg, dados: [5, 4, 3, 1, 1, 2, 3], especiais_idx: [3] })
    expect(r.botch).toBe(true)
    expect(r.marcacao.evento).toBe('falha_com_especial')
    expect(r.marcacao.rotulo).toBe('Falha Bestial')
  })

  it('crítico sem dado de Fome envolvido → sem marcação', () => {
    // os dois 10s estão nos índices 0,1; os especiais são 5,6 (valores 2,1) — não no máximo
    const r = resolverRolagem({ config: cfg, dados: [10, 10, 8, 6, 4, 2, 1], especiais_idx: [5, 6] })
    expect(r.critico).toBe(true)
    expect(r.marcacao).toBeUndefined()
  })
})

describe('23.1 · modo soma — intocado (regressão)', () => {
  it('soma pura de dados + modificador', () => {
    const r = resolverRolagem({ config: { modo: 'soma' }, dados: [4, 6, 2], dificuldade: 3 })
    expect(r.total).toBe(15) // 12 + 3
  })
  it('sem config = soma (padrão retrocompatível)', () => {
    const r = resolverRolagem({ dados: [1, 2, 3] })
    expect(r.modo).toBe('soma')
    expect(r.total).toBe(6)
  })
})
