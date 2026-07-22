import { describe, it, expect } from 'vitest'
import { avaliarFormula } from './formulaEngine'
import { mergeConfigLayout, CONFIG_LAYOUT_DEFAULT } from './sistemaDefaults'
import { marcar, curar, redimensionar, ordenarExibicao, contarMarcas, recuperarTrilha, tipoMaisSevero } from './trackEngine'
import { modificadoresDeEstados, mapaEstados, especiaisDeEstados, faixaAtivaDoEstado, clampEstado } from './estadosEngine'
import { calcularValoresFinais } from './modifierEngine'
import { resolverRolagem, descreverResultado } from './resolutionEngine'
import { prioridadeDoGrupo, validarOrdemGrupos, valorFinalMembro, validarDistribuicaoGrupo, validarPontosLivres } from './prioridadesEngine'
import { custoCompra, validarCompra, registroDeCompra, saldoDoLog } from './purchaseEngine'

/**
 * TESTE DE ACEITAÇÃO — Fases 24-25 (o "Vampiro-like" completo, sem conteúdo
 * proprietário: nomes/símbolos/textos são os que um mestre digitaria).
 * Sistema de referência PERMANENTE: dots + trilhas (Vitalidade substituindo a
 * vida) + Fome alimentando os dados especiais da parada (F23) + efeito por
 * faixa + descanso curando marcas (F24); criação por prioridades (7/5/3
 * atributos, 13/9/5 perícias, 3 pontos em linha nativa) + XP direto comprando
 * atributo/perícia/rating de linha, desbloqueando poderes por nível (F25).
 * Trava as fases contra regressão.
 */

const S = 'superficial'
const A = 'agravado'
const _ = null

// ─── Sistema de referência ───────────────────────────────────────────────────
const VITALIDADE = {
  id: 'vitalidade', nome: 'Vitalidade',
  tamanho_formula: '3 + atributo(vigor)',
  tipos_marca: [
    { id: S, nome: 'Superficial', simbolo: '/', severidade: 1 },
    { id: A, nome: 'Agravado', simbolo: 'X', severidade: 2 },
  ],
  regra_transbordo: 'converter',
  ao_encher_do_maior: { rotulo: 'Incapacitado', aplica_condicao: true },
  substitui_vida: true,
  recuperacao: { d_noite: { [S]: { modo: 'total' }, [A]: { modo: 'fixo', valor: 1 } } },
}

const FOME = {
  id: 'fome', nome: 'Fome', min: 0, max: 5, inicial: 1, destaque: true,
  alimenta_dados_especiais: true,
  efeitos_por_faixa: [
    { de: 4, ate: null, aviso: 'A Besta está próxima.', modificadores: [
      { id: 'mf', tipo: 'atributo', alvo: 'autocontrole', operacao: 'somar', valor: -1 },
    ] },
  ],
}

const RESOLUCAO = {
  modo: 'sucessos', dado: 10, dificuldade_padrao: 6, par_de_max_critico: true, botch: true,
  dados_especiais: { ativo: true, nome: 'Fome', marcacoes: [
    { evento: 'critico_com_especial', rotulo: 'Crítico Sujo' },
    { evento: 'falha_com_especial', rotulo: 'Falha Bestial' },
  ] },
}

describe('Aceitação 24 · trilha de Vitalidade substituindo a vida', () => {
  it('tamanho pela fórmula: Vigor 3 → 6 caixinhas; subir Vigor → 7ª aparece vazia', () => {
    const tam = v => Math.floor(avaliarFormula(VITALIDADE.tamanho_formula, { atributos: { vigor: v } }))
    expect(tam(3)).toBe(6)
    let marcas = Array(6).fill(_)
    marcas = marcar(marcas, S, VITALIDADE).marcas
    marcas = marcar(marcas, S, VITALIDADE).marcas
    marcas = marcar(marcas, A, VITALIDADE).marcas
    expect(contarMarcas(marcas)).toMatchObject({ porTipo: { [S]: 2, [A]: 1 }, livres: 3, total: 6 })
    // level-up: Vigor 4 → 7 caixinhas, marcas preservadas
    const r = redimensionar(marcas, tam(4), VITALIDADE)
    expect(r.marcas.length).toBe(7)
    expect(r.removidas).toEqual([])
    expect(contarMarcas(r.marcas).marcadas).toBe(3)
  })

  it('exibição: agravados à esquerda (X X / / ○ ○)', () => {
    const marcas = [S, S, A, A, _, _]
    expect(ordenarExibicao(marcas, VITALIDADE)).toEqual([A, A, S, S, _, _])
  })

  it('transbordo: cheia de superficial + 1 superficial converte a mais antiga', () => {
    const r = marcar([S, S, S, S, S, S], S, VITALIDADE)
    expect(r.marcas[0]).toBe(A)
    expect(r.eventos).toContain('transbordo_convertido')
  })

  it('encher de agravado dispara "Incapacitado" (evento p/ condição F14 + feed)', () => {
    const r = marcar([A, A, A, A, A, _], A, VITALIDADE)
    expect(r.eventos).toContain('encheu_do_maior')
    expect(VITALIDADE.ao_encher_do_maior.aplica_condicao).toBe(true)
    expect(tipoMaisSevero(VITALIDADE)).toBe(A)
  })

  it('descanso noturno: superficiais total + 1 agravado', () => {
    const r = recuperarTrilha([A, A, S, S, _, _], VITALIDADE, 'd_noite')
    expect(r.curadas).toEqual({ [S]: 2, [A]: 1 })
    expect(contarMarcas(r.marcas).porTipo).toEqual({ [A]: 1 })
  })

  it('curar remove a marca certa (a superficial mais recente)', () => {
    expect(curar([A, S, S, _], S).marcas).toEqual([A, S, _, _])
  })
})

describe('Aceitação 24 · Fome alimentando a parada (F23) e os efeitos por faixa', () => {
  it('Fome 3 → 3 dados especiais na parada, automático', () => {
    expect(especiaisDeEstados([FOME], { fome: 3 })).toBe(3)
  })

  it('parada 7 com Fome 2: crítico envolvendo dado de Fome → "Crítico Sujo"', () => {
    const r = resolverRolagem({ config: RESOLUCAO, dados: [10, 10, 8, 6, 4, 2, 1], especiais_idx: [0, 1] })
    expect(r.sucessos).toBe(6)
    expect(r.critico).toBe(true)
    expect(r.marcacao.rotulo).toBe('Crítico Sujo')
    expect(descreverResultado(r).texto).toBe('6 sucessos — crítico!')
  })

  it('botch com 1 na Fome → "Falha Bestial"', () => {
    const r = resolverRolagem({ config: RESOLUCAO, dados: [5, 4, 3, 1, 2], especiais_idx: [3] })
    expect(r.botch).toBe(true)
    expect(r.marcacao.rotulo).toBe('Falha Bestial')
  })

  it('Fome 4: aviso + modificador da faixa entra no pipeline F12; Fome 3: sai', () => {
    const em4 = modificadoresDeEstados([FOME], { fome: 4 })
    expect(calcularValoresFinais({ atributos: { autocontrole: 3 }, vida_max: 0, combate: {} }, em4).atributos.autocontrole).toBe(2)
    expect(faixaAtivaDoEstado(FOME, 4).aviso).toContain('Besta')
    expect(modificadoresDeEstados([FOME], { fome: 3 })).toEqual([])
  })

  it('estado(fome) disponível em qualquer fórmula (F17)', () => {
    const estados = mapaEstados([FOME], { fome: 2 })
    expect(avaliarFormula('estado(fome) * 2', { estados })).toBe(4)
  })

  it('clamp: nunca passa dos limites; linha ausente = inicial', () => {
    expect(clampEstado(9, FOME)).toBe(5)
    expect(clampEstado(undefined, FOME)).toBe(1)
  })
})

describe('Aceitação 24 · retrocompatibilidade absoluta (a régua)', () => {
  it('sistema sem config nova = defaults inertes (nada aparece, nada muda)', () => {
    const cfg = mergeConfigLayout(null)
    expect(cfg.trilhas).toEqual([])
    expect(cfg.estados).toEqual([])
    expect(cfg.exibicao_atributos).toBe('numero')
  })

  it('config antiga (pré-24) merge sem perder nada e ganha os defaults', () => {
    const antiga = { rotulo_vida: 'PV', dado_padrao: 20, descansos: [{ id: 'd1', nome: 'Longo' }] }
    const cfg = mergeConfigLayout(antiga)
    expect(cfg.rotulo_vida).toBe('PV')
    expect(cfg.descansos).toHaveLength(1)
    expect(cfg.trilhas).toEqual([])
    expect(cfg.estados).toEqual([])
  })

  it('modo soma segue intocado com estados/trilhas configurados', () => {
    const r = resolverRolagem({ config: { modo: 'soma' }, dados: [4, 6], dificuldade: 3 })
    expect(r.total).toBe(13)
  })

  it('defaults novos existem no CONFIG_LAYOUT_DEFAULT (guarda contra regressão de merge)', () => {
    expect(CONFIG_LAYOUT_DEFAULT.trilhas).toEqual([])
    expect(CONFIG_LAYOUT_DEFAULT.estados).toEqual([])
    expect(CONFIG_LAYOUT_DEFAULT.exibicao_atributos).toBe('numero')
    expect(CONFIG_LAYOUT_DEFAULT.maximo_dots).toBe(5)
  })
})

// ─── Fase 25 — progressão e criação (mesmo sistema de referência) ────────────
const GRUPOS_ATRIBUTOS = [
  { id: 'fisico', nome: 'Físico', membros: ['forca', 'destreza', 'vigor'] },
  { id: 'social', nome: 'Social', membros: ['carisma', 'manipulacao', 'compostura'] },
  { id: 'mental', nome: 'Mental', membros: ['inteligencia', 'raciocinio', 'determinacao'] },
]
const GRUPOS_PERICIAS = [
  { id: 'fisicas', nome: 'Físicas', membros: ['briga', 'furtividade', 'sobrevivencia'] },
  { id: 'sociais', nome: 'Sociais', membros: ['etiqueta', 'intimidacao', 'manha'] },
  { id: 'mentais', nome: 'Mentais', membros: ['investigacao', 'ocultismo', 'academicos'] },
]
const ETAPA_LINHAS = { id: 'e3', nome: 'Disciplinas', tipo: 'pontos_livres', alvo: 'linha_poder', pontos: 3, apenas_nativas: true, maximo_por_item: 2 }
const DOMINACAO = { id: 'dominacao', nome: 'Dominação', maximo: 5 }
const OFUSCACAO = { id: 'ofuscacao', nome: 'Ofuscação', maximo: 5 }
const PODERES_DOMINACAO = [
  { id: 'p1', nome: 'Comando', linha_id: 'dominacao', nivel_linha: 1 },
  { id: 'p2', nome: 'Ordálio', linha_id: 'dominacao', nivel_linha: 2 },
]
const CATEGORIA_ATRIBUTO = { id: 'atributo', nome: 'Atributos', alvo: 'atributo', custo_formula: 'novo_valor * 5', maximo: 5 }
const CATEGORIA_PERICIA = { id: 'pericia', nome: 'Perícias', alvo: 'pericia', custo_formula: 'novo_valor * 3', maximo: 5 }
const CATEGORIA_LINHA = { id: 'linha_poder', nome: 'Disciplinas', alvo: 'linha_poder', custo_formula: 'novo_valor * 5', maximo: 5, custo_formula_fora: 'novo_valor * 7' }

describe('Aceitação 25 · criação por prioridades — 7/5/3, 13/9/5, 3 pontos em linha nativa', () => {
  it('ordem de prioridade precisa cobrir todos os 3 grupos', () => {
    expect(validarOrdemGrupos(GRUPOS_ATRIBUTOS, ['fisico', 'social', 'mental']).valido).toBe(true)
    expect(validarOrdemGrupos(GRUPOS_ATRIBUTOS, ['fisico', 'social']).valido).toBe(false)
  })

  it('Físico (1º na ordem) recebe 7; distribuir exatamente 7 entre forca/destreza/vigor', () => {
    const ordem = ['fisico', 'social', 'mental']
    const prioridade = prioridadeDoGrupo(ordem, [7, 5, 3], 'fisico')
    expect(prioridade).toBe(7)
    const r = validarDistribuicaoGrupo({
      membros: GRUPOS_ATRIBUTOS[0].membros, prioridade,
      alocacao: { forca: 3, destreza: 2, vigor: 2 },
      basePorMembro: 1, maximoPorMembro: 5,
    })
    expect(r).toEqual({ valido: true, gasto: 7, restante: 0 })
    expect(valorFinalMembro(1, 3)).toBe(4)
  })

  it('Perícias 13/9/5: grupo com prioridade 13 distribuído exatamente', () => {
    const r = validarDistribuicaoGrupo({
      membros: GRUPOS_PERICIAS[0].membros, prioridade: 13,
      alocacao: { briga: 5, furtividade: 5, sobrevivencia: 3 },
      basePorMembro: 0, maximoPorMembro: 5,
    })
    expect(r).toEqual({ valido: true, gasto: 13, restante: 0 })
  })

  it('3 pontos em duas linhas nativas (Dominação + Ofuscação): apenas_nativas exclui a terceira, e a distribuição respeita o máximo por item', () => {
    const OBLIVION = { id: 'oblivion', nome: 'Obtenebração', maximo: 5 }
    const nativas = new Set(['dominacao', 'ofuscacao'])
    const itens = [DOMINACAO, OFUSCACAO, OBLIVION].filter(l => nativas.has(l.id)).map(l => l.id)
    expect(itens).toEqual(['dominacao', 'ofuscacao'])
    const r = validarPontosLivres({ itens, pontos: ETAPA_LINHAS.pontos, alocacao: { dominacao: 2, ofuscacao: 1 }, maximoPorItem: ETAPA_LINHAS.maximo_por_item })
    expect(r).toEqual({ valido: true, gasto: 3, restante: 0 })
  })

  it('distribuição incompleta (sobra ou falta) é rejeitada — nasce só quando exata', () => {
    expect(validarDistribuicaoGrupo({ membros: ['a', 'b'], prioridade: 7, alocacao: { a: 3, b: 3 }, basePorMembro: 1, maximoPorMembro: 5 }).valido).toBe(false)
  })
})

describe('Aceitação 25 · XP direto — ganhar do mestre e comprar atributo/perícia/linha', () => {
  it('ganhar 30 XP e comprar atributo 2→3 (15) e perícia 2→3 (9): saldo 6', () => {
    const log = [
      { tipo: 'ganho', quantidade: 30, detalhe: { motivo: 'Sessão 1' } },
      registroDeCompra(CATEGORIA_ATRIBUTO, 'forca', 2, custoCompra(CATEGORIA_ATRIBUTO, 2)),
      registroDeCompra(CATEGORIA_PERICIA, 'briga', 2, custoCompra(CATEGORIA_PERICIA, 2)),
    ]
    expect(custoCompra(CATEGORIA_ATRIBUTO, 2)).toBe(15)
    expect(custoCompra(CATEGORIA_PERICIA, 2)).toBe(9)
    expect(saldoDoLog(log)).toBe(6)
  })

  it('rating 1→2 de Dominação (nativa): custa 10 (novo_valor 2 × 5), desbloqueia os poderes do nível 2', () => {
    const saldo = 20
    const v = validarCompra(CATEGORIA_LINHA, 1, saldo, {}, { fora: false })
    expect(v).toEqual({ permitida: true, custo: 10, novoValor: 2 })
    const rating = v.novoValor
    const desbloqueados = PODERES_DOMINACAO.filter(p => rating >= p.nivel_linha)
    expect(desbloqueados.map(p => p.nome)).toEqual(['Comando', 'Ordálio'])
  })

  it('mesma compra em linha NÃO-nativa custa pela fórmula "fora" (×7): 14', () => {
    expect(custoCompra(CATEGORIA_LINHA, 1, {}, { fora: true })).toBe(14)
  })

  it('saldo insuficiente bloqueia a compra com o motivo', () => {
    const v = validarCompra(CATEGORIA_LINHA, 4, 10)
    expect(v.permitida).toBe(false)
    expect(v.motivoBloqueio).toContain('XP insuficiente')
  })
})

describe('Aceitação 25 · retrocompatibilidade — a régua não muda', () => {
  it('sistema sem config nova = modo nivel (F19), sem criação por prioridades', () => {
    const cfg = mergeConfigLayout(null)
    expect(cfg.progressao.modo).toBe('nivel')
    expect(cfg.progressao.categorias_compra).toEqual([])
    expect(cfg.criacao_prioridades.ativo).toBe(false)
  })

  it('defaults novos existem no CONFIG_LAYOUT_DEFAULT (guarda contra regressão de merge)', () => {
    expect(CONFIG_LAYOUT_DEFAULT.progressao.modo).toBe('nivel')
    expect(CONFIG_LAYOUT_DEFAULT.criacao_prioridades).toEqual({ ativo: false, etapas: [] })
  })

  it('Fase 24 continua intocada com a Fase 25 configurada junto (mesmo sistema)', () => {
    const r = resolverRolagem({ config: RESOLUCAO, dados: [10, 10, 8, 6, 4, 2, 1], especiais_idx: [0, 1] })
    expect(r.sucessos).toBe(6)
    expect(especiaisDeEstados([FOME], { fome: 3 })).toBe(3)
  })
})
