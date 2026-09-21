import { describe, it, expect } from 'vitest'
import { montarArvore, resumoArvore, posicoesArvore, ligacoesArvore } from './arvoreHabilidades'

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
