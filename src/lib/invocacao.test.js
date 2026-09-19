import { describe, it, expect } from 'vitest'
import { nomesDaInvocacao, defesaSugerida, planejarInvocacao } from './invocacao'

describe('nomes da invocação', () => {
  it('um só, nome livre: sem número', () => {
    expect(nomesDaInvocacao('Dragão', 1, ['Aria'])).toEqual(['Dragão'])
  })
  it('vários: numera', () => {
    expect(nomesDaInvocacao('Goblin', 3, [])).toEqual(['Goblin 1', 'Goblin 2', 'Goblin 3'])
  })
  it('continua a numeração de quem já está no combate', () => {
    expect(nomesDaInvocacao('Goblin', 2, ['Goblin 1', 'Goblin 2', 'Aria'])).toEqual(['Goblin 3', 'Goblin 4'])
    expect(nomesDaInvocacao('Goblin', 1, ['Goblin'])).toEqual(['Goblin 1'])
  })
  it('nome com caracteres especiais não quebra a busca', () => {
    expect(nomesDaInvocacao('Aranha (gigante)', 2, ['Aranha (gigante) 7'])).toEqual(['Aranha (gigante) 8', 'Aranha (gigante) 9'])
  })
  it('sem nome e quantidade torta', () => {
    expect(nomesDaInvocacao('', 0, [])).toEqual(['Criatura'])
  })
})

describe('defesa sugerida', () => {
  const campos = [{ id: 'desloc', nome: 'Deslocamento' }, { id: 'ca', nome: 'Classe de Armadura' }, { id: 'ini', nome: 'Iniciativa' }]
  it('acha o campo de defesa pelo nome', () => {
    const v = [{ campo_id: 'desloc', valor: '9' }, { campo_id: 'ca', valor: '15' }]
    expect(defesaSugerida(v, campos)).toEqual({ campoId: 'ca', nome: 'Classe de Armadura', valor: 15 })
  })
  it('sem campo de defesa: cai no primeiro numérico', () => {
    expect(defesaSugerida([{ campo_id: 'ini', valor: '2' }], [{ id: 'ini', nome: 'Iniciativa' }])).toMatchObject({ valor: 2 })
  })
  it('sem valores: null', () => {
    expect(defesaSugerida([], campos)).toBeNull()
    expect(defesaSugerida([{ campo_id: 'ca', valor: 'alta' }], campos)).toBeNull()
  })
})

describe('planejar invocação', () => {
  const criatura = { id: 'c1', nome_personagem: 'Goblin', hp_maximo: 9 }
  it('mooks apontam para a criatura do bestiário e herdam a vida', () => {
    const linhas = planejarInvocacao({ criatura, quantidade: 2, defesa: 13, nomesExistentes: [] })
    expect(linhas).toEqual([
      { nome: 'Goblin 1', tipo: 'inimigo', hp_atual: 9, hp_maximo: 9, ca: 13, ficha_id: 'c1' },
      { nome: 'Goblin 2', tipo: 'inimigo', hp_atual: 9, hp_maximo: 9, ca: 13, ficha_id: 'c1' },
    ])
  })
  it('vida e defesa do diálogo vencem a ficha; vazio = sem defesa', () => {
    const [l] = planejarInvocacao({ criatura, quantidade: 1, vida: 30, defesa: '', tipo: 'aliado' })
    expect(l).toMatchObject({ hp_maximo: 30, ca: null, tipo: 'aliado' })
  })
  it('boss: cada um com a ficha própria', () => {
    const linhas = planejarInvocacao({ criatura, quantidade: 2, fichasProprias: ['f1', 'f2'] })
    expect(linhas.map(l => l.ficha_id)).toEqual(['f1', 'f2'])
  })
})
