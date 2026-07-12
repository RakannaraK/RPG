import { describe, it, expect } from 'vitest'
import { avaliarFormula } from './formulaEngine'
import { coletarModificadores, calcularValoresFinais, agregarDefesas, listarCondicoesManuais } from './modifierEngine'
import { resolverFaixas, faixaAtiva } from './faixas'
import { nivelPorXp, progressoXp } from './progressaoEngine'
import { maximoPool } from './poolEngine'
import { slotsTotais, slotsDisponiveis, usadosPorCirculo, circulosGastaveis } from './slotsEngine'
import { podeUsarPoder, cdDoPoder, extraDaEscala, circuloBaseDoPoder } from './poderes'
import { limiarCritico, ehCritico, dadoPuro, multiplicadorCritico, aplicarCritico } from './criticoEngine'
import { resolverTipoDano } from './conversao'
import { totalConsolidado, converter, saldoDe } from './moedasEngine'

/**
 * TESTE DE ACEITAÇÃO FINAL — Krad (house rule de D&D).
 * Fecha o PLANO_MESTRE exercitando, de ponta a ponta (nível de motor), cada item
 * do checklist. Nada de conteúdo embutido: tudo é config/números que o mestre
 * digitaria. Se algum motor regredir, aqui quebra.
 */

const MODF = 'piso((x - 10) / 2)' // modificador de atributo do D&D
const mod = (attr, valor) => avaliarFormula(`mod(${attr})`, { atributos: { [attr]: valor }, formulaModificador: MODF })

describe('Krad · Bárbaro 9 / Paladino 4 + XP/level-up', () => {
  const niveisClasse = { barbaro: 9, paladino: 4 }
  const ctx = { nivel: 13, niveisClasse, formulaModificador: MODF }

  it('nível total e nível por classe (multiclasse)', () => {
    expect(avaliarFormula('nivel', ctx)).toBe(13)
    expect(avaliarFormula('nivel(barbaro)', ctx)).toBe(9)
    expect(avaliarFormula('nivel(paladino)', ctx)).toBe(4)
    expect(avaliarFormula('nivel(druida)', ctx)).toBe(0) // classe ausente = 0
  })

  it('XP → nível 13 pela tabela de progressão', () => {
    const prog = { modo: 'tabela', tabela: [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000] }
    expect(nivelPorXp(119999, prog)).toBe(12)
    expect(nivelPorXp(120000, prog)).toBe(13)
    const p = progressoXp(120000, 13, prog)
    expect(p.podeSubir).toBe(false) // exatamente no limiar do 13; falta p/ o 14
    expect(p.faltam).toBe(20000)
  })
})

describe('Krad · CA 17/19/21 por interruptores + CA sem armadura calculada', () => {
  const CA = 'ca'
  const barbaro = {
    id: 'c_barb', nome: 'Bárbaro',
    modificadores: [{ id: 'm_defensivo', tipo: 'combate', alvo: CA, operacao: 'somar', valor: 2, condicao_tipo: 'manual', condicao_config: { rotulo: 'Postura defensiva' } }],
  }
  const escudo = {
    id: 'i_escudo', nome: 'Escudo rúnico', equipado: true,
    modificadores: [{ id: 'm_escudo', tipo: 'combate', alvo: CA, operacao: 'somar', valor: 2, condicao_tipo: 'manual', condicao_config: { rotulo: 'Escudo erguido' } }],
  }
  const caCom = toggles => {
    const mods = coletarModificadores({ classes: [barbaro], itens: [escudo], condicoesManuais: toggles })
    return calcularValoresFinais({ atributos: {}, vida_max: 0, combate: { [CA]: 17 } }, mods).combate[CA]
  }

  it('base 17 → 19 (um) → 21 (dois interruptores)', () => {
    expect(caCom({})).toBe(17)
    expect(caCom({ m_escudo: true })).toBe(19)
    expect(caCom({ m_escudo: true, m_defensivo: true })).toBe(21)
  })

  it('os dois interruptores aparecem para ligar/desligar', () => {
    const lista = listarCondicoesManuais({ classes: [barbaro], itens: [escudo] })
    expect(lista.map(m => m.condicao_config.rotulo).sort()).toEqual(['Escudo erguido', 'Postura defensiva'])
  })

  it('CA sem armadura = 10 + mod(DES) + mod(CON) (Bárbaro)', () => {
    const caSemArmadura = avaliarFormula('10 + mod(destreza) + mod(constituicao)', {
      atributos: { destreza: 14, constituicao: 16 }, formulaModificador: MODF,
    })
    expect(caSemArmadura).toBe(15) // 10 + 2 + 3
  })
})

describe('Krad · Fúria (recurso/efeitos/vantagem) + Frenesi condicionado', () => {
  const furia = {
    id: 'h_furia', nome: 'Fúria', tipo: 'ativavel', recurso_max: 3,
    modificadores: [
      { id: 'mf_vant', tipo: 'vantagem', alvo: 'forca' },
      { id: 'mf_res', tipo: 'resistencia', alvo: 'cortante' },
    ],
  }
  // Frenesi só vale ENQUANTO em Fúria (condição automática: habilidade ativa)
  const frenesi = {
    id: 'h_frenesi', nome: 'Frenesi', tipo: 'passiva',
    modificadores: [{ id: 'mfr', tipo: 'combate', alvo: 'dano_corpo', operacao: 'somar', valor: 2, condicao_tipo: 'auto', condicao_config: { metrica: 'habilidade_ativa', habilidade_id: 'h_furia' } }],
  }
  const colher = furiaAtiva => {
    const estadoFicha = { nivel: 13, vida_atual: 60, vida_max: 100, habilidadesAtivas: new Set(furiaAtiva ? ['h_furia'] : []) }
    return coletarModificadores({
      habilidadesFicha: [{ habilidade: furia, ativa: furiaAtiva }, { habilidade: frenesi, ativa: false }],
      estadoFicha,
    })
  }

  it('sem Fúria: nada da Fúria nem o Frenesi condicionado', () => {
    const mods = colher(false)
    expect(mods.some(m => m.id === 'mf_vant')).toBe(false)
    expect(mods.some(m => m.id === 'mfr')).toBe(false) // Frenesi gated pela Fúria
  })

  it('com Fúria: vantagem em Força, resistência a cortante e Frenesi ligado', () => {
    const mods = colher(true)
    expect(mods.some(m => m.tipo === 'vantagem' && m.alvo === 'forca')).toBe(true)
    expect(agregarDefesas(mods).resistencias).toContain('cortante')
    expect(mods.some(m => m.id === 'mfr')).toBe(true) // auto: Fúria ativa → Frenesi entra
  })
})

describe('Krad · Sopro por faixa + reserva 4d12 + Mãos Consagradas 5×nível(paladino)', () => {
  it('Mãos Consagradas = 5 × nível do Paladino', () => {
    expect(avaliarFormula('5 * nivel(paladino)', { niveisClasse: { paladino: 4 } })).toBe(20)
  })

  it('reserva de dados: máximo 4 (4d12)', () => {
    expect(maximoPool({ tipo: 'dados', maximo_formula: '4' }, {})).toBe(4)
  })

  it('Sopro escala por faixa de nível de Bárbaro', () => {
    const spec = { variavel: 'nivel:barbaro', campo: 'dados_extras', faixas: [
      { de: 1, ate: 5, valor: '2d6' }, { de: 6, ate: 10, valor: '3d6' }, { de: 11, ate: null, valor: '4d6' },
    ] }
    expect(faixaAtiva(spec, { niveisClasse: { barbaro: 9 } }).faixa.valor).toBe('3d6')
    const mods = resolverFaixas([{ tipo: 'combate', alvo: 'sopro', operacao: 'somar', faixas: spec }], { niveisClasse: { barbaro: 9 } })
    expect(mods[0].dados_extras).toBe('3d6')
  })
})

describe('Krad · Grimório (slots 3/3, CD 14, escala de círculo, Destruição Divina)', () => {
  const config = { slots: { ativo: true, grades: { c_pal: { 1: [3, 3] } } } } // 3 de 1º, 3 de 2º
  const classesFicha = [{ classe_id: 'c_pal', nivel: 4 }]

  it('slots totais 3/3 e disponíveis após gastar um de 1º', () => {
    const totais = slotsTotais(config, classesFicha)
    expect(totais).toEqual({ 1: 3, 2: 3 })
    const disp = slotsDisponiveis(totais, usadosPorCirculo([{ circulo: 1, usados: 1 }]))
    expect(disp).toEqual({ 1: 2, 2: 3 })
  })

  it('CD do poder resolve 14', () => {
    expect(cdDoPoder({ cd_formula: '8 + 2 + mod(carisma)' }, '', { atributos: { carisma: 16 }, formulaModificador: MODF })).toBe(13)
    expect(cdDoPoder({}, '14')).toBe(14) // CD do sistema
  })

  it('Destruição Divina elevada: escala de círculo adiciona dados', () => {
    const poder = { nome: 'Destruição Divina', custo: [{ tipo: 'slot', circulo_minimo: 1 }], efeito_notacao: '2d8', escala_circulo: { faixas: [{ de: 1, ate: null, valor_extra_por_circulo: '1d8' }] } }
    expect(circuloBaseDoPoder(poder)).toBe(1)
    const extra = extraDaEscala(poder, 3) // usada em 3º círculo → +2 círculos acima
    expect(extra.termos).toEqual(['1d8', '1d8'])
  })

  it('pode usar um poder de slot havendo disponibilidade', () => {
    const estado = { totaisSlots: { 1: 3, 2: 3 }, usadosSlots: { 1: 3 }, contexto: {} }
    const r = podeUsarPoder({ custo: [{ tipo: 'slot', circulo_minimo: 1 }] }, estado)
    expect(r.ok).toBe(true)
    expect(r.circulos).toEqual([2]) // 1º esgotado, sobe para o 2º
  })
})

describe('Krad · Espada Devoradora 29/50 + manoplas convertendo + crítico "total" + carteira', () => {
  it('item danificado (durabilidade 0) para de conceder modificadores', () => {
    const espada = danos => ({ id: 'i_esp', nome: 'Espada Devoradora', equipado: true, durabilidade: { atual: danos, max: 50 }, modificadores: [{ id: 'me', tipo: 'combate', alvo: 'dano_corpo', operacao: 'somar', valor: 3 }] })
    expect(coletarModificadores({ itens: [espada(29)] }).some(m => m.id === 'me')).toBe(true)
    expect(coletarModificadores({ itens: [espada(0)] }).some(m => m.id === 'me')).toBe(false)
  })

  it('manoplas convertem o tipo de dano (contundente → radiante)', () => {
    const manoplas = [{ operacao: 'converter', alvo: 'tipo_dano', valor: { de: 'contundente', para: 'radiante' } }]
    expect(resolverTipoDano('contundente', manoplas)).toEqual({ tipo: 'radiante', convertidoDe: 'contundente' })
    expect(resolverTipoDano('cortante', manoplas).tipo).toBe('cortante') // regra não casa → intacto
  })

  it('crítico modo "total" dobra o resultado inteiro (dados + fixos)', () => {
    const config = { ativo: true, limiar_formula: '20', multiplicador_padrao: 2, modo_multiplicador: 'total' }
    const limiar = limiarCritico(config, {})
    expect(limiar).toBe(20)
    expect(ehCritico(dadoPuro([{ valor: 20 }]), limiar)).toBe(true)
    // 2d6 (=9) + 4 fixos = 13; crítico total → 26
    expect(aplicarCritico({ dadosTotal: 9, fixos: 4, multiplicador: multiplicadorCritico(config), modo: 'total' })).toBe(26)
  })

  it('carteira de 5 moedas: consolida e converte', () => {
    const denominacoes = [
      { id: 'pc', valor: 1 }, { id: 'pp', valor: 10 }, { id: 'pe', valor: 50 }, { id: 'po', valor: 100 }, { id: 'pl', valor: 1000 },
    ]
    const carteira = { pc: 8, pp: 5, po: 5 } // 8 + 50 + 500 = 558 pc
    expect(totalConsolidado(carteira, denominacoes)).toBe(558)
    const { carteira: trocada, recebido } = converter(carteira, 'po', 'pc', 1, denominacoes) // 1 po → 100 pc
    expect(recebido).toBe(100)
    expect(saldoDe(trocada, 'po')).toBe(4)
    expect(saldoDe(trocada, 'pc')).toBe(108)
    expect(totalConsolidado(trocada, denominacoes)).toBe(558) // valor preservado
  })
})
