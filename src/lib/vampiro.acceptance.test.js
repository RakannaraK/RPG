import { describe, it, expect } from 'vitest'
import { avaliarFormula } from './formulaEngine'
import { mergeConfigLayout, CONFIG_LAYOUT_DEFAULT } from './sistemaDefaults'
import { marcar, curar, redimensionar, ordenarExibicao, contarMarcas, recuperarTrilha, tipoMaisSevero } from './trackEngine'
import { modificadoresDeEstados, mapaEstados, especiaisDeEstados, faixaAtivaDoEstado, clampEstado } from './estadosEngine'
import { calcularValoresFinais } from './modifierEngine'
import { resolverRolagem, descreverResultado } from './resolutionEngine'

/**
 * TESTE DE ACEITAÇÃO — Fase 24 (o "Vampiro-like" completo, sem conteúdo
 * proprietário: nomes/símbolos/textos são os que um mestre digitaria).
 * Sistema de referência PERMANENTE: dots + trilhas (Vitalidade substituindo a
 * vida) + Fome alimentando os dados especiais da parada (F23) + efeito por
 * faixa + descanso curando marcas. Trava a fase contra regressão.
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
