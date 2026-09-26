import { describe, it, expect } from 'vitest'
import { CRIATURAS_SRD } from './srd5eDados'
import { buscarCriaturas, criaturaParaArquivo, modificador } from './srd5e'
import { planejarImportacao } from './fichaPortatil'
import { validarNotacao } from './diceNotation'

const ndNum = nd => (String(nd).includes('/') ? 1 / Number(String(nd).split('/')[1]) : Number(nd))
const proficiencia = nd => (ndNum(nd) <= 4 ? 2 : ndNum(nd) <= 8 ? 3 : 4)

describe('F50 — dados do SRD conferem com as regras do próprio SRD', () => {
  it('ids únicos e campos básicos', () => {
    expect(new Set(CRIATURAS_SRD.map(c => c.id)).size).toBe(CRIATURAS_SRD.length)
    for (const c of CRIATURAS_SRD) {
      expect(c.atr, c.nome).toHaveLength(6)
      expect(c.atr.every(v => v >= 1 && v <= 30), c.nome).toBe(true)
      for (const a of c.acoes) if (a.dano) expect(validarNotacao(a.dano), `${c.nome} ${a.nome}`).toBe(true)
    }
  })

  it('PV = média dos dados de vida, e o bônus por dado é o modificador de Constituição', () => {
    for (const c of CRIATURAS_SRD) {
      const [, n, d, k] = /^(\d+)d(\d+)([+-]\d+)?$/.exec(c.pvDados)
      const bonus = Number(k || 0)
      expect(Math.floor(Number(n) * (Number(d) + 1) / 2 + bonus), c.nome).toBe(c.pv)
      expect(bonus, c.nome).toBe(Number(n) * modificador(c.atr[2]))
    }
  })

  it('bônus de ataque = proficiência pelo ND + Força ou Destreza', () => {
    const excecoes = new Set(['carnical/Mordida']) // no SRD a mordida do carniçal é +2, sem proficiência
    for (const c of CRIATURAS_SRD) {
      const possiveis = [modificador(c.atr[0]), modificador(c.atr[1])].map(m => m + proficiencia(c.nd))
      for (const a of c.acoes.filter(x => x.ataque != null)) {
        if (excecoes.has(`${c.id}/${a.nome}`)) continue
        expect(possiveis, `${c.nome} — ${a.nome}`).toContain(a.ataque)
      }
    }
  })
})

describe('F50 — criatura vira ficha importável', () => {
  const goblin = CRIATURAS_SRD.find(c => c.id === 'goblin')
  const sistemaDnd = {
    atributos: ['FOR', 'DES', 'CON', 'INT', 'SAB', 'CAR'].map((nome, i) => ({ id: `a${i}`, nome })),
    sistema: { nome: 'D&D', config_layout: { campos_combate: [{ id: 'ca', nome: 'Classe de Armadura' }] } },
  }

  it('acha os nomes do sistema da mesa (FOR, Classe de Armadura…) e importa sem aviso de atributo', () => {
    const arq = criaturaParaArquivo(goblin, sistemaDnd)
    expect(arq.filhos.valores_atributos.map(v => v.atributo)).toEqual(['FOR', 'DES', 'CON', 'INT', 'SAB', 'CAR'])
    let n = 0
    const plano = planejarImportacao(arq, sistemaDnd, () => `id${n++}`)
    expect(plano.avisos.filter(a => a.startsWith('Atributo'))).toEqual([])
    expect(plano.filhos.valores_atributos.map(v => [v.atributo_id, v.valor])).toEqual([['a0', 8], ['a1', 14], ['a2', 10], ['a3', 10], ['a4', 8], ['a5', 8]])
    expect(plano.filhos.valores_combate).toEqual([expect.objectContaining({ campo_id: 'ca', valor: '15' })])
    expect(plano.ficha).toMatchObject({ nome_personagem: 'Goblin', hp_maximo: 7, hp_atual: 7 })
    expect(plano.ficha.tracos).toContain('Fuga Ágil')
    expect(plano.ficha.notas).toContain('Creative Commons Attribution 4.0')
  })

  it('ataques viram itens roláveis (ataque 1d20+bônus, dano e tipo)', () => {
    const itens = criaturaParaArquivo(goblin).filhos.itens_ficha
    expect(itens.map(i => i.nome)).toEqual(['Cimitarra', 'Arco curto'])
    expect(itens[0].atributos_extras).toEqual({ ataque: '1d20+4', dano: '1d6+2', tipo_dano: 'cortante' })
    // sopro não tem jogada de ataque: só o dano
    const dragao = criaturaParaArquivo(CRIATURAS_SRD.find(c => c.id === 'jovem-dragao-vermelho'))
    expect(dragao.filhos.itens_ficha.find(i => i.nome.startsWith('Sopro')).atributos_extras).toEqual({ dano: '16d6', tipo_dano: 'fogo' })
  })

  it('sistema sem esses atributos: importa assim mesmo, com avisos e o bloco completo em texto', () => {
    const plano = planejarImportacao(criaturaParaArquivo(goblin, { atributos: [] }), { atributos: [] }, () => 'x')
    expect(plano.avisos.filter(a => a.startsWith('Atributo'))).toHaveLength(6)
    expect(plano.ficha.tracos).toContain('FOR 8 (-1)')
  })

  it('busca sem acento e ordena por nível de desafio', () => {
    expect(buscarCriaturas(CRIATURAS_SRD, 'dragao').map(c => c.id)).toEqual(['filhote-dragao-vermelho', 'jovem-dragao-vermelho'])
    const todas = buscarCriaturas(CRIATURAS_SRD)
    expect(todas[0].nd).toBe('1/8')
    expect(todas[todas.length - 1].id).toBe('jovem-dragao-vermelho')
    expect(buscarCriaturas(CRIATURAS_SRD, 'nd 5').map(c => c.id).sort()).toEqual(['cria-vampirica', 'troll'])
  })
})
