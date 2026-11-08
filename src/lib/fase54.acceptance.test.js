// Aceitação da Fase 54 (parte pura): sistema "Caminhos" com pontos = nivel*2.
import { describe, it, expect } from 'vitest'
import { montarArvore, pontosDaArvore, dependentesConhecidos } from './arvoreHabilidades'

const habilidades = [
  { id: 'ini', nome: 'Início', custo_pontos: 0 },
  { id: 'tar', nome: 'Estilo da Tartaruga', requer_habilidades_ids: ['ini'], requer_habilidade_id: 'ini', custo_pontos: 2 },
  { id: 'cob', nome: 'Estilo da Cobra', requer_habilidades_ids: ['ini'], requer_habilidade_id: 'ini', custo_pontos: 2 },
  { id: 'arm', nome: 'Armadura', requer_habilidades_ids: ['tar', 'cob'], requer_habilidade_id: 'tar', requer_modo: 'todos', custo_pontos: 3 },
  { id: 'ctr', nome: 'Contra-ataque', requer_habilidades_ids: ['tar', 'cob'], requer_habilidade_id: 'tar', requer_modo: 'qualquer', custo_pontos: 1 },
]

// estado da ficha = ids aprendidos à mão (origem manual)
function situacao(aprendidas) {
  const habilidadesFicha = aprendidas.map(id => ({ id: `hf-${id}`, habilidade_id: id, origem: 'manual' }))
  const p = pontosDaArvore({ formula: 'nivel*2', contexto: { nivel: 3 }, habilidades, habilidadesFicha })
  const arv = montarArvore(habilidades, { conhecidasIds: aprendidas, contexto: { nivel: 3 }, saldoPontos: p.saldo })
  return { p, arv }
}

describe('Fase 54 — aceitação (Caminhos)', () => {
  it('percorre aprender, saldo, bloqueio por pontos e esquecer', () => {
    // nível 3 → 6 pontos
    let { p, arv } = situacao([])
    expect(p).toMatchObject({ total: 6, gastos: 0, saldo: 6 })
    expect(arv.nos.get('ini').estado).toBe('disponivel')
    expect(arv.nos.get('tar')).toMatchObject({ estado: 'bloqueada', motivo: 'Precisa de “Início”' })

    // Início (grátis) e Tartaruga (2): saldo 4
    ;({ p, arv } = situacao(['ini', 'tar']))
    expect(p.saldo).toBe(4)
    expect(arv.nos.get('cob').estado).toBe('disponivel')
    expect(arv.nos.get('arm')).toMatchObject({ estado: 'bloqueada', motivo: 'Precisa de “Estilo da Cobra”' })
    expect(arv.nos.get('ctr').estado).toBe('disponivel') // basta uma

    // + Cobra (2): saldo 2 → Armadura (3) trava por pontos; Contra-ataque (1) segue
    ;({ p, arv } = situacao(['ini', 'tar', 'cob']))
    expect(p.saldo).toBe(2)
    expect(arv.nos.get('arm')).toMatchObject({ estado: 'bloqueada', motivo: 'Custa 3 pontos (restam 2)' })
    expect(arv.nos.get('ctr').estado).toBe('disponivel')

    // esquecer a Cobra é permitido (nenhum conhecido a exige) e devolve 2 pontos
    expect(dependentesConhecidos('cob', arv)).toEqual([])
    ;({ p, arv } = situacao(['ini', 'tar']))
    expect(p.saldo).toBe(4)
    expect(arv.nos.get('arm').estado).toBe('bloqueada') // volta a faltar a Cobra

    // com Contra-ataque conhecido, Tartaruga e Cobra ficam presas
    ;({ arv } = situacao(['ini', 'tar', 'cob', 'ctr']))
    expect(dependentesConhecidos('tar', arv)).toEqual(['ctr'])
    expect(dependentesConhecidos('ctr', arv)).toEqual([])
  })

  it('banco sem as colunas novas: só o pré-requisito antigo, sem custo, sem orçamento', () => {
    const antigas = [{ id: 'a', nome: 'A', requer_habilidade_id: null }, { id: 'b', nome: 'B', requer_habilidade_id: 'a' }]
    const arv = montarArvore(antigas, { conhecidasIds: ['a'], saldoPontos: null })
    expect(arv.nos.get('b').estado).toBe('disponivel')
    expect(arv.nos.get('b').custo).toBe(0)
    expect(pontosDaArvore({ habilidades: antigas, habilidadesFicha: [] })).toEqual({ total: null, gastos: 0, saldo: null, erro: null })
  })
})
