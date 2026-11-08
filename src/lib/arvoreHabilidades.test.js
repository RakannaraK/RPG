import { describe, it, expect } from 'vitest'
import { montarArvore, resumoArvore, posicoesArvore, ligacoesArvore, prerequisitosDe, pontosDaArvore, dependentesConhecidos } from './arvoreHabilidades'

const habs = [
  { id: 'a', nome: 'Golpe Rápido', requer_habilidade_id: null },
  { id: 'b', nome: 'Golpe Duplo', requer_habilidade_id: 'a' },
  { id: 'c', nome: 'Redemoinho', requer_habilidade_id: 'b', nivel_minimo: 5 },
  { id: 'd', nome: 'Postura Firme', requer_habilidade_id: null },
]

describe('montar árvore', () => {
  it('camadas por profundidade, em ordem alfabética', () => {
    const arv = montarArvore(habs, { conhecidasIds: [], contexto: { nivel: 1 } })
    expect(arv.camadas.map(c => c.map(n => n.hab.nome))).toEqual([
      ['Golpe Rápido', 'Postura Firme'], ['Golpe Duplo'], ['Redemoinho'],
    ])
    expect(arv.nos.get('c').profundidade).toBe(2)
  })

  it('estados: conhecida, disponível e bloqueada com o motivo', () => {
    const arv = montarArvore(habs, { conhecidasIds: ['a'], contexto: { nivel: 1 } })
    expect(arv.nos.get('a').estado).toBe('conhecida')
    expect(arv.nos.get('b').estado).toBe('disponivel')       // tem o pré-requisito
    expect(arv.nos.get('c')).toMatchObject({ estado: 'bloqueada', motivo: 'Precisa de “Golpe Duplo”' })
    expect(arv.nos.get('d').estado).toBe('disponivel')       // raiz sem requisito
    expect(resumoArvore(arv)).toEqual({ conhecida: 1, disponivel: 2, bloqueada: 1 })
  })

  it('nível mínimo bloqueia mesmo com o pré-requisito', () => {
    const arv = montarArvore(habs, { conhecidasIds: ['a', 'b'], contexto: { nivel: 3 } })
    expect(arv.nos.get('c')).toMatchObject({ estado: 'bloqueada', motivo: 'Precisa de nível 5' })
    const arv2 = montarArvore(habs, { conhecidasIds: ['a', 'b'], contexto: { nivel: 5 } })
    expect(arv2.nos.get('c').estado).toBe('disponivel')
  })

  it('nível mínimo de habilidade de classe usa o nível DAQUELA classe', () => {
    const hab = [{ id: 'x', nome: 'Voo', requer_habilidade_id: null, nivel_minimo: 5, classe_id: 'dragao' }]
    const semClasse = montarArvore(hab, { contexto: { nivel: 9, niveisClasse: {} } })
    expect(semClasse.nos.get('x').estado).toBe('bloqueada')
    const comClasse = montarArvore(hab, { contexto: { nivel: 9, niveisClasse: { dragao: 5 } } })
    expect(comClasse.nos.get('x').estado).toBe('disponivel')
  })

  it('pré-requisito apagado ou em círculo vira raiz, com aviso', () => {
    const tortas = [
      { id: 'p', nome: 'Perdida', requer_habilidade_id: 'nao-existe' },
      { id: 'y', nome: 'Yin', requer_habilidade_id: 'z' },
      { id: 'z', nome: 'Yang', requer_habilidade_id: 'y' },
    ]
    const arv = montarArvore(tortas, { conhecidasIds: [] })
    expect(arv.camadas).toHaveLength(1) // todas viraram raiz
    expect(arv.avisos).toHaveLength(3)
    expect(arv.avisos[0]).toMatch(/pré-requisito inválido/)
    expect(arv.nos.get('y').estado).toBe('disponivel')
  })

  it('posições e ligações para o desenho', () => {
    const arv = montarArvore(habs, { conhecidasIds: [] })
    const pos = posicoesArvore(arv)
    expect(pos.get('a')).toEqual({ x: 1 / 3, y: 0.5 / 3 })
    expect(pos.get('d').x).toBeCloseTo(2 / 3)
    expect(ligacoesArvore(arv)).toEqual(expect.arrayContaining([{ de: 'a', para: 'b' }, { de: 'b', para: 'c' }]))
    expect(ligacoesArvore(arv)).toHaveLength(2)
  })

  it('sistema sem habilidades não quebra', () => {
    const arv = montarArvore([], {})
    expect(arv.camadas).toEqual([])
    expect(posicoesArvore(arv).size).toBe(0)
  })
})

describe('F54 — vários pré-requisitos e pontos', () => {
  const base = [
    { id: 'a', nome: 'A' }, { id: 'b', nome: 'B' },
    { id: 't', nome: 'Todas', requer_habilidades_ids: ['a', 'b'] },
    { id: 'q', nome: 'Qualquer', requer_habilidades_ids: ['a', 'b'], requer_modo: 'qualquer' },
  ]
  const est = (conh, id) => montarArvore(base, { conhecidasIds: conh }).nos.get(id)

  it('prerequisitosDe une lista e antigo, sem repetir nem ids apagados', () => {
    expect(prerequisitosDe({ requer_habilidades_ids: ['a', 'x'], requer_habilidade_id: 'a' }, ['a'])).toEqual(['a'])
    expect(prerequisitosDe({ requer_habilidade_id: 'b' }, ['a', 'b'])).toEqual(['b'])
  })

  it('todos: lista só os que faltam; qualquer: basta um', () => {
    expect(est([], 't')).toMatchObject({ estado: 'bloqueada', motivo: 'Precisa de “A” e “B”' })
    expect(est(['a'], 't')).toMatchObject({ estado: 'bloqueada', motivo: 'Precisa de “B”' })
    expect(est(['a', 'b'], 't').estado).toBe('disponivel')
    expect(est([], 'q')).toMatchObject({ estado: 'bloqueada', motivo: 'Precisa de “A” ou “B”' })
    expect(est(['b'], 'q').estado).toBe('disponivel')
  })

  it('camada = caminho mais longo; ligações múltiplas', () => {
    const habs = [{ id: 'a', nome: 'A' }, { id: 'b', nome: 'B', requer_habilidade_id: 'a' }, { id: 'c', nome: 'C', requer_habilidades_ids: ['a', 'b'] }]
    const arv = montarArvore(habs)
    expect(arv.nos.get('c').profundidade).toBe(2)
    expect(ligacoesArvore(arv)).toHaveLength(3)
  })

  it('ciclo com dois pais: só a aresta do círculo cai', () => {
    const habs = [
      { id: 'r', nome: 'Raiz' },
      { id: 'y', nome: 'Yin', requer_habilidades_ids: ['r', 'z'] },
      { id: 'z', nome: 'Yang', requer_habilidade_id: 'y' },
    ]
    const arv = montarArvore(habs)
    expect(arv.nos.get('y').paisIds).toEqual(['r'])
    expect(arv.nos.get('z').paisIds).toEqual([])
    expect(arv.avisos.some(a => /pré-requisito inválido/.test(a))).toBe(true)
  })

  it('custo e saldo bloqueiam', () => {
    const habs = [{ id: 'a', nome: 'A', custo_pontos: 3 }, { id: 'b', nome: 'B', custo_pontos: 1 }]
    const arv = montarArvore(habs, { saldoPontos: 2 })
    expect(arv.nos.get('a')).toMatchObject({ estado: 'bloqueada', motivo: 'Custa 3 pontos (restam 2)' })
    expect(arv.nos.get('b').estado).toBe('disponivel')
    expect(montarArvore(habs, { saldoPontos: null }).nos.get('a').estado).toBe('disponivel')
  })

  it('pontosDaArvore: sem fórmula, com erro, e só origem manual gasta', () => {
    const habilidades = [{ id: 'a', custo_pontos: 2 }, { id: 'b', custo_pontos: 5 }, { id: 'c' }]
    const hf = [{ habilidade_id: 'a', origem: 'manual' }, { habilidade_id: 'b', origem: 'classe' }, { habilidade_id: 'c' }]
    expect(pontosDaArvore({ formula: '', habilidades, habilidadesFicha: hf })).toEqual({ total: null, gastos: 2, saldo: null, erro: null })
    expect(pontosDaArvore({ formula: 'nivel*2', contexto: { nivel: 3 }, habilidades, habilidadesFicha: hf })).toMatchObject({ total: 6, gastos: 2, saldo: 4 })
    const ruim = pontosDaArvore({ formula: 'nivel*', contexto: { nivel: 3 }, habilidades, habilidadesFicha: hf })
    expect(ruim.total).toBeNull()
    expect(ruim.erro).toBeTruthy()
  })

  it('dependentesConhecidos e ordem pela média dos pais', () => {
    const habs = [
      { id: 'a', nome: 'A' }, { id: 'b', nome: 'B' }, { id: 'c', nome: 'C' },
      { id: 'x', nome: 'X', requer_habilidade_id: 'c' }, { id: 'y', nome: 'Y', requer_habilidade_id: 'a' },
    ]
    const arv = montarArvore(habs, { conhecidasIds: ['y', 'x'] })
    expect(dependentesConhecidos('a', arv)).toEqual(['y'])
    const pos = posicoesArvore(arv)
    expect(pos.get('y').x).toBeLessThan(pos.get('x').x) // Y (pai A) antes de X (pai C), apesar de X < Y no alfabeto
  })
})
