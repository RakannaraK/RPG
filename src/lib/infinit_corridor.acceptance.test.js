import { describe, it, expect } from 'vitest'
import { avaliarFormula } from './formulaEngine'
import { resolverNotacaoFormula } from './diceNotation'
import { coletarModificadores, calcularValoresFinais } from './modifierEngine'
import { atendeNivelMinimo } from './requisitos'
import { inicialDaRaca, ganhoPorNivelDaRaca, ehRolado, notacaoDoGanho, validarDistribuicao } from './pontosEngine'
import { maximoPool } from './poolEngine'
import { podeUsarPoder } from './poderes'
import { planejarTurno } from './custoHabilidade'
import { calcularMaestria, bonusMaestria, proximaPropriedade } from './masteryEngine'
import { limiarCritico } from './criticoEngine'
import { resolverDefesa, planejarDefesa } from './defesaEngine'
import { recompensasAoSubir } from './recompensas'

/**
 * TESTE DE ACEITAÇÃO FINAL — Infinit Corridor (sistema autoral por distribuição).
 * Fecha o PLANO_MESTRE exercitando cada item do checklist do IC nos motores.
 * Genérico: nada de conteúdo embutido; tudo é config/números do mestre.
 */

describe('IC · 8 atributos por distribuição (inicial por raça; ganho d6+10 por nível)', () => {
  const config = { ativo: true, inicial_por_raca: true, inicial: '12', ganho_por_nivel: '1d6 + 10', custo_por_ponto: 1, maximo_por_atributo: 20 }
  const humano = { pontos_config: { inicial: '16' } } // Humano do IC começa com 16

  it('inicial vem da raça (16), ganho por nível é rolado (1d6+10)', () => {
    expect(inicialDaRaca(config, humano)).toBe('16')
    const ganho = ganhoPorNivelDaRaca(config, humano)
    expect(ganho).toBe('1d6 + 10')
    expect(ehRolado(ganho)).toBe(true)
    expect(notacaoDoGanho(ganho, {})).toBe('1d6+10')
  })

  it('distribuição respeita saldo e teto por atributo', () => {
    // 8 atributos, 16 pontos disponíveis
    const dist = { forca: 4, agilidade: 3, vitalidade: 3, intelecto: 2, foco: 2, vontade: 1, presenca: 1, percepcao: 0 }
    const ok = validarDistribuicao({ distribuicao: dist, disponiveis: 16, custo_por_ponto: 1, valoresBase: {}, maximo_por_atributo: 20 })
    expect(ok.valido).toBe(true)
    expect(ok.custo).toBe(16)
    expect(ok.restante).toBe(0)

    const caro = validarDistribuicao({ distribuicao: { forca: 20 }, disponiveis: 16, custo_por_ponto: 1 })
    expect(caro.valido).toBe(false) // pontos insuficientes

    const estouraTeto = validarDistribuicao({ distribuicao: { forca: 6 }, disponiveis: 99, valoresBase: { forca: 16 }, maximo_por_atributo: 20 })
    expect(estouraTeto.valido).toBe(false) // 16 + 6 > 20
  })
})

describe('IC · classe +% (Lutador +13%) + vida 4d4 + (vitalidade)d3', () => {
  it('Lutador soma +13% ao dano (percentual F18)', () => {
    const lutador = { id: 'c_lut', nome: 'Lutador', modificadores: [{ id: 'ml', tipo: 'combate', alvo: 'dano', operacao: 'percentual', valor: 13 }] }
    const mods = coletarModificadores({ classes: [lutador] })
    // 100 de dano base → +13% → 113
    expect(calcularValoresFinais({ atributos: {}, vida_max: 0, combate: { dano: 100 } }, mods).combate.dano).toBe(113)
  })

  it('vida 4d4 + (vitalidade)d3 resolve a quantidade de dados pela Vitalidade', () => {
    const { notacao } = resolverNotacaoFormula('4d4 + (vitalidade)d3', { atributos: { vitalidade: 5 } })
    expect(notacao).toBe('4d4+5d3')
  })
})

describe('IC · Thariuns 2×nível + Pontos de Foco + poder custando Thariuns', () => {
  it('Thariuns máximo = 2 × nível', () => {
    expect(maximoPool({ id: 'thariuns', tipo: 'pontos', maximo_formula: '2 * nivel' }, { nivel: 40 })).toBe(80)
  })

  it('Pontos de Foco: pool próprio com sua fórmula', () => {
    expect(maximoPool({ id: 'foco', tipo: 'pontos', maximo_formula: '10 + piso(nivel / 4)' }, { nivel: 40 })).toBe(20)
  })

  it('poder custando 10 Thariuns: passa com 80, falha com 5', () => {
    const poder = { nome: 'Rajada', custo: [{ tipo: 'pool', pool_id: 'thariuns', quantidade: '10' }] }
    const poolsPorId = { thariuns: { id: 'thariuns', nome: 'Thariuns' } }
    expect(podeUsarPoder(poder, { atualDoPool: () => 80, poolsPorId, contexto: {} }).ok).toBe(true)
    const falha = podeUsarPoder(poder, { atualDoPool: () => 5, poolsPorId, contexto: {} })
    expect(falha.ok).toBe(false)
    expect(falha.motivo).toContain('Thariuns')
  })
})

describe('IC · Transformação (nível mínimo 40, percentuais, custo por turno)', () => {
  const transformacao = {
    id: 'h_transf', nome: 'Transformação Abissal', tipo: 'ativavel', nivel_minimo: 40,
    custo_pool: [{ pool_id: 'thariuns', quantidade: '2', por_turno: true }],
    modificadores: [{ id: 'mt', tipo: 'atributo', alvo: 'forca', operacao: 'percentual', valor: 50 }],
  }

  it('exige nível 40 para entrar em jogo', () => {
    expect(atendeNivelMinimo(transformacao, { nivel: 40 })).toBe(true)
    expect(atendeNivelMinimo(transformacao, { nivel: 39 })).toBe(false)
  })

  it('ativa aplica +50% de Força (percentual)', () => {
    const mods = coletarModificadores({
      habilidadesFicha: [{ habilidade: transformacao, ativa: true }],
      estadoFicha: { nivel: 42, habilidadesAtivas: new Set(['h_transf']) },
    })
    // Força 40 → +50% → 60
    expect(calcularValoresFinais({ atributos: { forca: 40 }, vida_max: 0, combate: {} }, mods).atributos.forca).toBe(60)
  })

  it('custo por turno debita 2 Thariuns; sem saldo, desativa', () => {
    const ativas = [{ id: 'h_transf', habilidade: transformacao }]
    const poolsPorId = { thariuns: { id: 'thariuns', nome: 'Thariuns' } }
    const comSaldo = planejarTurno(ativas, { atualDoPool: () => 10, poolsPorId, contexto: {} })
    expect(comSaldo.debitos).toEqual([{ pool_id: 'thariuns', atual: 8 }])
    expect(comSaldo.desativar).toEqual([])

    const semSaldo = planejarTurno(ativas, { atualDoPool: () => 1, poolsPorId, contexto: {} })
    expect(semSaldo.desativar).toEqual(['h_transf'])
    expect(semSaldo.avisos[0]).toContain('Transformação Abissal desativada')
  })
})

describe('IC · Maestria por categoria (XP 10/20/50, +10%/nível, desbloqueios em 2/4/6)', () => {
  const curva = { modo: 'tabela', tabela: [10, 20, 50] } // custo de cada nível
  const config = { bonus_por_nivel: { efeito_percentual: 10, acerto_percentual: 0 } }
  const propriedades = [
    { nome: 'Crítico', maestria_minima: 2 }, { nome: 'Golpe Duplo', maestria_minima: 4 }, { nome: 'Disparo', maestria_minima: 6 },
  ]

  it('XP acumulado → nível pela curva (10 / 30 / 80)', () => {
    expect(calcularMaestria(9, curva).nivel).toBe(0)
    expect(calcularMaestria(10, curva).nivel).toBe(1)
    expect(calcularMaestria(29, curva).nivel).toBe(1)
    expect(calcularMaestria(30, curva).nivel).toBe(2) // 10 + 20
    expect(calcularMaestria(80, curva).nivel).toBe(3) // 10 + 20 + 50
  })

  it('+10% de efeito por nível (F18)', () => {
    expect(bonusMaestria(3, config).efeito_percentual).toBe(30)
  })

  it('desbloqueios em 2/4/6 conforme o nível', () => {
    expect(bonusMaestria(1, config, propriedades).desbloqueadas.map(p => p.nome)).toEqual([])
    expect(bonusMaestria(4, config, propriedades).desbloqueadas.map(p => p.nome)).toEqual(['Crítico', 'Golpe Duplo'])
    expect(proximaPropriedade(4, propriedades).nome).toBe('Disparo')
  })
})

describe('IC · Crítico d100 com limiar dinâmico (85 → 25 conforme a maestria)', () => {
  const config = { ativo: true, limiar_formula: 'max(25, 85 - 15 * piso(maestria / 2))', multiplicador_padrao: 2, modo_multiplicador: 'total' }
  it('maestria 0→85, 2→70, 8→25, 10→25 (piso)', () => {
    expect(limiarCritico(config, { maestria: 0 })).toBe(85)
    expect(limiarCritico(config, { maestria: 2 })).toBe(70)
    expect(limiarCritico(config, { maestria: 8 })).toBe(25)
    expect(limiarCritico(config, { maestria: 10 })).toBe(25)
  })
})

describe('IC · Defesa ativa (faixas 90/60/35, condição no contra-ataque)', () => {
  const faixas = [
    { de: 5, ate: null, reducao_percentual: 90, rotulo: 'Superior' },
    { de: -4, ate: 4, reducao_percentual: 60, rotulo: 'Empate' },
    { de: null, ate: -5, reducao_percentual: 35, rotulo: 'Inferior' },
  ]
  const cfg = { faixas, contra_ataque: { sofre_dano_cheio: true, condicao: { nome: 'Exposto', duracao_rodadas: 1 } } }

  it('desvio superior (+7) reduz 90%', () => {
    const r = resolverDefesa({ ataque: 71, defesa: 78, dano: 20, faixas })
    expect(r.reducao).toBe(90)
    expect(r.danoReduzido).toBe(2)
  })

  it('contra-ataque: dano cheio + condição no atacante', () => {
    const dp = { ataque: 71, dano: 20, atacante_combatente_id: 'atk', atacante_nome: 'Aberração', resposta: { opcao_id: 'contra', opcao_nome: 'Contra-atacar', contra_ataque: true, defesa_total: 78 } }
    const p = planejarDefesa(dp, cfg, 'Kai')
    expect(p.danoFinal).toBe(20)
    expect(p.condicao).toEqual({ combatente_id: 'atk', nome: 'Exposto', descricao: undefined, duracao_rodadas: 1 })
    expect(p.contraAtaque).toBe(true)
  })
})

describe('IC · Recompensas de nível (criar habilidade em 1 / 5 / 9)', () => {
  const recompensas = [
    { id: 'r1', nivel: 1, classe_id: null, texto: 'Crie uma habilidade inicial' },
    { id: 'r5', nivel: 5, classe_id: null, texto: 'Crie uma habilidade de especialização' },
    { id: 'r9', nivel: 9, classe_id: null, texto: 'Crie uma habilidade avançada' },
  ]
  it('subir para o nível 5 destrava a recompensa do 5', () => {
    expect(recompensasAoSubir(recompensas, { nivelTotal: 5 }).map(r => r.id)).toEqual(['r5'])
    expect(recompensasAoSubir(recompensas, { nivelTotal: 3 })).toEqual([]) // nada no 3
    expect(recompensasAoSubir(recompensas, { nivelTotal: 9 }).map(r => r.id)).toEqual(['r9'])
  })
})
