import { describe, it, expect } from 'vitest'
import { montarItens, filtrarItens } from './paleta'

const mesas = [
  { id: 'm1', nome: 'Ruínas de Éter', role: 'mestre', arquivada: false },
  { id: 'm2', nome: 'Velha Mesa', role: 'jogador', arquivada: true },
]
const personagens = [{ id: 'f1', nome_personagem: 'Brisa', mesa_id: 'm1', mesa: { id: 'm1', nome: 'Ruínas de Éter' } }]

describe('montarItens', () => {
  it('ordem dos grupos, recente com nome, rota única e mapa só em mesa ativa', () => {
    const recentes = [
      { tipo: 'ficha', mesaId: 'm1', fichaId: 'f1', rota: '/mesa/m1/ficha/f1' },
      { tipo: 'mesa', mesaId: 'm1', rota: '/mesa/m1' },
      { tipo: 'mesa', mesaId: 'xx', rota: '/mesa/xx' },
    ]
    const lista = montarItens({ recentes, mesas, personagens: [...personagens, { id: 'f2', nome_personagem: 'Cinza', mesa_id: 'm1', mesa: { nome: 'Ruínas de Éter' } }] })
    expect(lista[0]).toMatchObject({ grupo: 'Recentes', titulo: 'Ficha de Brisa' })
    expect(lista[1]).toMatchObject({ grupo: 'Recentes', titulo: 'Ruínas de Éter' })
    const rotas = lista.map(i => i.rota)
    expect(new Set(rotas).size).toBe(rotas.length)
    expect(rotas).not.toContain('/mesa/xx')
    expect(rotas).toContain('/mesa/m1/mapa')
    expect(rotas).not.toContain('/mesa/m2/mapa')
    expect([...new Set(lista.map(i => i.grupo))]).toEqual(['Recentes', 'Mesas', 'Personagens', 'Páginas'])
  })
})

describe('filtrarItens', () => {
  const itens = montarItens({ mesas, personagens: [] })
  it('texto vazio devolve tudo', () => expect(filtrarItens(itens, '  ')).toEqual(itens))
  it('ignora acento e caixa', () => {
    expect(filtrarItens([{ titulo: 'Sessão em X', detalhe: '' }], 'SESSAO')).toHaveLength(1)
  })
  it('todas as palavras precisam bater', () => {
    expect(filtrarItens(itens, 'mapa eter').map(i => i.titulo)).toEqual(['Mapa — Ruínas de Éter'])
    expect(filtrarItens(itens, 'mapa zzz')).toEqual([])
  })
  it('quem começa pelo texto vem antes', () => {
    const l = [{ titulo: 'Mapa de Pedra', detalhe: '' }, { titulo: 'Pedra Viva', detalhe: '' }]
    expect(filtrarItens(l, 'pedra')[0].titulo).toBe('Pedra Viva')
  })
  it('no máximo 30', () => {
    const l = Array.from({ length: 50 }, (_, i) => ({ titulo: `Item ${i}`, detalhe: '' }))
    expect(filtrarItens(l, 'item')).toHaveLength(30)
  })
})
