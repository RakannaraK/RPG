import { describe, it, expect } from 'vitest'
import { montarItens, filtrarItens, itensDaBusca } from './paleta'

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

describe('itensDaBusca', () => {
  const l = (tipo, o = {}) => ({ tipo, id: 'i1', mesa_id: 'm1', mesa_nome: 'Éter', titulo: 'X', detalhe: null, ficha_id: null, ...o })
  it('converte cada tipo com rota, grupo e detalhe', () => {
    const r = itensDaBusca([
      l('ficha', { detalhe: 'criatura' }), l('item', { id: 'i2', detalhe: 'Brisa', ficha_id: 'f9' }), l('item', { id: 'i3', ficha_id: 'f9' }),
      l('bau', { id: 'b1' }), l('verbete', { id: 'v1', titulo: null }),
    ])
    expect(r.map(i => i.chave)).toEqual(['b:ficha:i1', 'b:item:i2', 'b:item:i3', 'b:bau:b1', 'b:verbete:v1'])
    expect(r[0]).toMatchObject({ grupo: 'Fichas', detalhe: 'Criatura · Éter', rota: '/mesa/m1/ficha/i1' })
    expect(r[1]).toMatchObject({ grupo: 'Itens', detalhe: 'Brisa · Éter', rota: '/mesa/m1/ficha/f9' })
    expect(r[3]).toMatchObject({ grupo: 'Itens', detalhe: 'Baú do grupo · Éter', rota: '/mesa/m1?aba=Fichas' })
    expect(r[4]).toMatchObject({ grupo: 'Verbetes', titulo: 'Verbete sem título', detalhe: 'Éter', rota: '/mesa/m1?aba=Enciclopédia&verbete=v1' })
  })
  it('não deduplica por rota e não limita a 30', () => {
    expect(itensDaBusca(Array.from({ length: 40 }, (_, i) => l('item', { id: `i${i}`, ficha_id: 'f' })))).toHaveLength(40)
  })
  it('entrada inválida vira lista vazia', () => expect(itensDaBusca(null)).toEqual([]))
})
