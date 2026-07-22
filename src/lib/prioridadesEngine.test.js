import { describe, it, expect } from 'vitest'
import { prioridadeDoGrupo, validarOrdemGrupos, valorFinalMembro, validarDistribuicaoGrupo, validarPontosLivres } from './prioridadesEngine'

// Grupos de referência (formato da spec — nomes/membros são do mestre)
const GRUPOS_ATRIBUTOS = [
  { id: 'fisico', nome: 'Físico', membros: ['forca', 'destreza', 'vigor'] },
  { id: 'social', nome: 'Social', membros: ['carisma', 'manipulacao', 'compostura'] },
  { id: 'mental', nome: 'Mental', membros: ['inteligencia', 'raciocinio', 'determinacao'] },
]
const VALORES_ATRIBUTOS = [7, 5, 3]

describe('25.4 · prioridadeDoGrupo (ordenação define o valor)', () => {
  it('grupo na posição 0 recebe o primeiro valor (7/5/3)', () => {
    const ordem = ['fisico', 'social', 'mental']
    expect(prioridadeDoGrupo(ordem, VALORES_ATRIBUTOS, 'fisico')).toBe(7)
    expect(prioridadeDoGrupo(ordem, VALORES_ATRIBUTOS, 'social')).toBe(5)
    expect(prioridadeDoGrupo(ordem, VALORES_ATRIBUTOS, 'mental')).toBe(3)
  })
  it('reordenar muda o valor de cada grupo', () => {
    const ordem = ['mental', 'fisico', 'social']
    expect(prioridadeDoGrupo(ordem, VALORES_ATRIBUTOS, 'mental')).toBe(7)
    expect(prioridadeDoGrupo(ordem, VALORES_ATRIBUTOS, 'fisico')).toBe(5)
    expect(prioridadeDoGrupo(ordem, VALORES_ATRIBUTOS, 'social')).toBe(3)
  })
  it('grupo ausente da ordem → null', () => {
    expect(prioridadeDoGrupo(['fisico'], VALORES_ATRIBUTOS, 'social')).toBeNull()
  })
})

describe('25.4 · validarOrdemGrupos', () => {
  it('ordem completa e sem repetição é válida', () => {
    expect(validarOrdemGrupos(GRUPOS_ATRIBUTOS, ['fisico', 'social', 'mental']).valido).toBe(true)
  })
  it('faltando um grupo é inválido', () => {
    expect(validarOrdemGrupos(GRUPOS_ATRIBUTOS, ['fisico', 'social']).valido).toBe(false)
  })
  it('grupo repetido é inválido', () => {
    expect(validarOrdemGrupos(GRUPOS_ATRIBUTOS, ['fisico', 'fisico', 'mental']).valido).toBe(false)
  })
  it('grupo desconhecido é inválido', () => {
    expect(validarOrdemGrupos(GRUPOS_ATRIBUTOS, ['fisico', 'social', 'x']).valido).toBe(false)
  })
})

describe('25.4 · validarDistribuicaoGrupo — o fluxo 7/5/3 de atributos', () => {
  const base = 1, maximo = 5

  it('gasta exatamente a prioridade (7) e respeita o máximo → válido', () => {
    const r = validarDistribuicaoGrupo({
      membros: GRUPOS_ATRIBUTOS[0].membros, prioridade: 7,
      alocacao: { forca: 3, destreza: 2, vigor: 2 },
      basePorMembro: base, maximoPorMembro: maximo,
    })
    expect(r).toEqual({ valido: true, gasto: 7, restante: 0 })
  })

  it('valorFinalMembro soma base + alocado', () => {
    expect(valorFinalMembro(1, 3)).toBe(4)
    expect(valorFinalMembro(1, 0)).toBe(1)
  })

  it('gasto diferente da prioridade é inválido (falta ou sobra)', () => {
    const faltou = validarDistribuicaoGrupo({ membros: ['a', 'b'], prioridade: 5, alocacao: { a: 2, b: 2 }, basePorMembro: 0, maximoPorMembro: 5 })
    expect(faltou.valido).toBe(false)
    expect(faltou.restante).toBe(1)
    const sobrou = validarDistribuicaoGrupo({ membros: ['a', 'b'], prioridade: 5, alocacao: { a: 4, b: 4 }, basePorMembro: 0, maximoPorMembro: 5 })
    expect(sobrou.valido).toBe(false)
    expect(sobrou.restante).toBe(-3)
  })

  it('estourar o máximo por membro é inválido mesmo com o gasto total certo', () => {
    const r = validarDistribuicaoGrupo({
      membros: ['a', 'b', 'c'], prioridade: 7,
      alocacao: { a: 5, b: 1, c: 1 },
      basePorMembro: 1, maximoPorMembro: 5,
    })
    expect(r.valido).toBe(false)
    expect(r.erro).toContain('máximo')
  })

  it('perícias: prioridade 13, base 0, máximo 5 — mesma disciplina', () => {
    const r = validarDistribuicaoGrupo({
      membros: ['briga', 'furtividade', 'intimidacao', 'atletismo'], prioridade: 13,
      alocacao: { briga: 5, furtividade: 4, intimidacao: 4, atletismo: 0 },
      basePorMembro: 0, maximoPorMembro: 5,
    })
    expect(r).toEqual({ valido: true, gasto: 13, restante: 0 })
  })
})

describe('25.4 · validarPontosLivres — 3 pontos em linhas nativas', () => {
  it('gasta exatamente e respeita o máximo por item → válido', () => {
    const r = validarPontosLivres({
      itens: ['dominacao', 'ofuscacao'], pontos: 3,
      alocacao: { dominacao: 2, ofuscacao: 1 },
      maximoPorItem: 2,
    })
    expect(r).toEqual({ valido: true, gasto: 3, restante: 0 })
  })
  it('excede o máximo por item é inválido', () => {
    const r = validarPontosLivres({ itens: ['dominacao'], pontos: 3, alocacao: { dominacao: 3 }, maximoPorItem: 2 })
    expect(r.valido).toBe(false)
    expect(r.erro).toContain('máximo')
  })
  it('gasto diferente do total é inválido', () => {
    const r = validarPontosLivres({ itens: ['dominacao', 'ofuscacao'], pontos: 3, alocacao: { dominacao: 1, ofuscacao: 1 }, maximoPorItem: 2 })
    expect(r.valido).toBe(false)
    expect(r.restante).toBe(1)
  })
  it('sem máximo definido, qualquer alocação até o total é válida', () => {
    const r = validarPontosLivres({ itens: ['a'], pontos: 5, alocacao: { a: 5 }, maximoPorItem: null })
    expect(r.valido).toBe(true)
  })
})
