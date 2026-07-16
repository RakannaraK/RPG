import { describe, it, expect } from 'vitest'
import { marcar, curar, redimensionar, ordenarExibicao, contarMarcas, tipoMaisSevero } from './trackEngine'

// Config de referência (V5-like, sem conteúdo proprietário: nomes do mestre)
const CFG = {
  tipos_marca: [
    { id: 'superficial', nome: 'Superficial', simbolo: '/', severidade: 1 },
    { id: 'agravado', nome: 'Agravado', simbolo: 'X', severidade: 2 },
  ],
  regra_transbordo: 'converter',
}
const S = 'superficial'
const A = 'agravado'
const _ = null

describe('24.1 · contrato de marcação — exemplos canônicos', () => {
  it('trilha 7 vazia, marcar 3 superficiais → [/, /, /, ○, ○, ○, ○]', () => {
    let m = [_, _, _, _, _, _, _]
    m = marcar(m, S, CFG).marcas
    m = marcar(m, S, CFG).marcas
    m = marcar(m, S, CFG).marcas
    expect(m).toEqual([S, S, S, _, _, _, _])
  })

  it('trilha 7 cheia de superficial + 1 superficial (converter) → [X, /, /, /, /, /, /]', () => {
    const r = marcar([S, S, S, S, S, S, S], S, CFG)
    // a MAIS ANTIGA converteu um passo (índice 0)
    expect(r.marcas).toEqual([A, S, S, S, S, S, S])
    expect(r.eventos).toContain('transbordo_convertido')
    expect(ordenarExibicao(r.marcas, CFG)).toEqual([A, S, S, S, S, S, S])
  })

  it('trilha 7 [X, X, /, /, ○, ○, ○] + 1 agravado → ocupa a primeira VAZIA; exibição reordena', () => {
    const r = marcar([A, A, S, S, _, _, _], A, CFG)
    // armazenamento: na ordem de marcação (vazia do índice 4 recebeu o X)
    expect(r.marcas).toEqual([A, A, S, S, A, _, _])
    expect(r.eventos).toEqual([])
    // exibição: severas à esquerda → [X, X, X, /, /, ○, ○]
    expect(ordenarExibicao(r.marcas, CFG)).toEqual([A, A, A, S, S, _, _])
  })

  it('trilha cheia de agravado + 1 agravado → dispara encheu_do_maior (nada muda)', () => {
    const r = marcar([A, A, A], A, CFG)
    expect(r.marcas).toEqual([A, A, A])
    expect(r.eventos).toEqual(['encheu_do_maior'])
  })

  it('curar 1 superficial de [X, /, /, ○] → [X, /, ○, ○] (remove a mais recente)', () => {
    const r = curar([A, S, S, _], S)
    expect(r.marcas).toEqual([A, S, _, _])
    expect(r.curada).toBe(true)
  })
})

describe('24.1 · transbordo e encher do maior', () => {
  it('conversão em cadeia: trilha 2 cheia de superficial vai virando agravado', () => {
    let r = marcar([S, S], S, CFG)
    expect(r.marcas).toEqual([A, S])
    expect(r.eventos).toEqual(['transbordo_convertido'])
    // de novo: converte a última superficial → tudo agravado → encheu do maior
    r = marcar(r.marcas, S, CFG)
    expect(r.marcas).toEqual([A, A])
    expect(r.eventos).toEqual(['transbordo_convertido', 'encheu_do_maior'])
    // de novo: nada a fazer, só o aviso
    r = marcar(r.marcas, S, CFG)
    expect(r.marcas).toEqual([A, A])
    expect(r.eventos).toEqual(['encheu_do_maior'])
  })

  it('marcar agravado na última vazia dispara encheu_do_maior na hora', () => {
    const r = marcar([A, A, _], A, CFG)
    expect(r.marcas).toEqual([A, A, A])
    expect(r.eventos).toEqual(['encheu_do_maior'])
  })

  it('agravado sem vazia sobrescreve a superficial mais antiga (regra 3)', () => {
    const r = marcar([S, A, S], A, CFG)
    expect(r.marcas).toEqual([A, A, S]) // índice 0 era a menos severa mais antiga
    expect(r.eventos).toEqual([])
  })

  it('transbordo "ignorar": trilha cheia não marca além (no-op silencioso)', () => {
    const cfg = { ...CFG, regra_transbordo: 'ignorar' }
    const r = marcar([S, S, S], S, cfg)
    expect(r.marcas).toEqual([S, S, S])
    expect(r.eventos).toEqual([])
  })
})

describe('24.1 · três severidades', () => {
  const CFG3 = {
    tipos_marca: [
      { id: 'leve', simbolo: '-', severidade: 1 },
      { id: 'medio', simbolo: '/', severidade: 2 },
      { id: 'grave', simbolo: 'X', severidade: 3 },
    ],
    regra_transbordo: 'converter',
  }

  it('converter sobe UM passo: leve → médio (não pula para grave)', () => {
    const r = marcar(['leve', 'medio'], 'leve', CFG3)
    expect(r.marcas).toEqual(['medio', 'medio'])
    expect(r.eventos).toEqual(['transbordo_convertido'])
  })

  it('sem leves, converter promove a menos severa presente (médio → grave)', () => {
    const r = marcar(['medio', 'grave'], 'leve', CFG3)
    expect(r.marcas).toEqual(['grave', 'grave'])
    expect(r.eventos).toEqual(['transbordo_convertido', 'encheu_do_maior'])
  })

  it('grave sem vazia sobrescreve a MENOS severa mais antiga, não a do meio', () => {
    const r = marcar(['medio', 'leve', 'medio'], 'grave', CFG3)
    expect(r.marcas).toEqual(['medio', 'grave', 'medio'])
  })

  it('tipoMaisSevero acha o topo', () => {
    expect(tipoMaisSevero(CFG3)).toBe('grave')
  })
})

describe('24.1 · curar', () => {
  it('curar tipo inexistente é no-op', () => {
    const r = curar([A, S, _], 'inexistente')
    expect(r.marcas).toEqual([A, S, _])
    expect(r.curada).toBe(false)
  })

  it('curar compacta: remover marca do meio puxa as seguintes', () => {
    // [X, /, X, ○]: curar o agravado mais recente (índice 2)
    const r = curar([A, S, A, _], A)
    expect(r.marcas).toEqual([A, S, _, _])
  })

  it('curar em trilha vazia é no-op', () => {
    expect(curar([_, _], S).curada).toBe(false)
  })
})

describe('24.1 · redimensionar (fórmula do tamanho mudou)', () => {
  it('crescer acrescenta vazias no fim', () => {
    const r = redimensionar([S, A, _], 5, CFG)
    expect(r.marcas).toEqual([S, A, _, _, _])
    expect(r.removidas).toEqual([])
  })

  it('encolher remove vazias primeiro — sem perder marcas', () => {
    const r = redimensionar([S, A, _, _], 3, CFG)
    expect(r.marcas).toEqual([S, A, _])
    expect(r.removidas).toEqual([])
  })

  it('encolher além das vazias remove as MENOS severas (mais recentes primeiro) e avisa', () => {
    const r = redimensionar([A, S, S, _], 2, CFG)
    // 4→3 tira a vazia; 3→2 tira a superficial mais recente (índice 2)
    expect(r.marcas).toEqual([A, S])
    expect(r.removidas).toEqual([S])
  })

  it('encolher tudo devolve todas as marcas removidas', () => {
    const r = redimensionar([A, S], 0, CFG)
    expect(r.marcas).toEqual([])
    expect(r.removidas).toEqual([S, A]) // menos severa primeiro, depois a agravada
  })
})

describe('24.1 · exibição e contagem', () => {
  it('ordenarExibicao não muda a contagem nem o array original', () => {
    const original = [S, A, S, _, A]
    const exib = ordenarExibicao(original, CFG)
    expect(exib).toEqual([A, A, S, S, _])
    expect(original).toEqual([S, A, S, _, A]) // intocado (exibição ≠ mutação)
    expect(contarMarcas(exib)).toEqual(contarMarcas(original))
  })

  it('ordem_marcada_primeiro: false devolve a ordem crua de marcação', () => {
    const cfg = { ...CFG, ordem_marcada_primeiro: false }
    expect(ordenarExibicao([S, A, _], cfg)).toEqual([S, A, _])
  })

  it('contarMarcas: "5/7" com detalhe por tipo', () => {
    const c = contarMarcas([A, A, S, S, S, _, _])
    expect(c).toEqual({ porTipo: { agravado: 2, superficial: 3 }, livres: 2, total: 7, marcadas: 5 })
  })
})

describe('24.1 · pureza (as funções nunca mutam a entrada)', () => {
  it('marcar/curar/redimensionar devolvem arrays novos', () => {
    const m = [S, _, _]
    marcar(m, A, CFG)
    curar(m, S)
    redimensionar(m, 5, CFG)
    expect(m).toEqual([S, _, _])
  })
})
