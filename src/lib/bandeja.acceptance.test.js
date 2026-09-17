/**
 * Fase 27 — teste de aceitação (docs/FASE27_DADOS_NA_MESA.md), camada pura + física.
 * A parte visual (canvas, portal, rótulos, fade) foi verificada no navegador
 * em /teste-dados; o Realtime usa o mesmo canal de INSERT do feed (F7).
 */
import { describe, it, expect } from 'vitest'
import { enfileirarLancamento, lancamentoDeRolagem, planejarLancamento } from './bandejaDados'
import { criarCorpoDado, criarMundo, estaParado, PROFUNDIDADE_BANDEJA } from './fisicaDados'

// Rolagem como o useRolagem grava (resultados.dados + skin)
const rolagem = (id, autor, dados, skin) => ({ id, autor_id: autor, resultados: { dados, skin } })

/** O que o OuvinteDadosMesa faz com um INSERT (as mesmas funções, sem o React). */
function receber(fila, r, opcoes) {
  const lancamento = lancamentoDeRolagem(r, opcoes)
  return lancamento ? enfileirarLancamento(fila, lancamento) : fila
}

describe('Fase 27 — aceitação', () => {
  const tresD6 = [{ lados: 6, valor: 2 }, { lados: 6, valor: 5 }, { lados: 6, valor: 6 }]

  it('A (madeira) rola 3d6: B vê 3 dados de madeira com os mesmos valores; A também', () => {
    const r = rolagem('r1', 'A', tresD6, 'madeira')
    const deB = receber([], r, { meuId: 'B', preferencia: 'todos' })
    const deA = receber([], r, { meuId: 'A', preferencia: 'todos' })
    for (const fila of [deB, deA]) {
      expect(fila).toHaveLength(1)
      expect(fila[0].skin).toBe('madeira')
      expect(fila[0].dados.map(d => d.valor)).toEqual([2, 5, 6])
    }
  })

  it('B com "só os meus" não vê a de A; "desligado" não vê nada', () => {
    const r = rolagem('r1', 'A', tresD6, 'madeira')
    expect(receber([], r, { meuId: 'B', preferencia: 'meus' })).toEqual([])
    expect(receber([], rolagem('r2', 'B', tresD6), { meuId: 'B', preferencia: 'meus' })).toHaveLength(1)
    expect(receber([], rolagem('r3', 'B', tresD6), { meuId: 'B', preferencia: 'nenhum' })).toEqual([])
  })

  it('60d6 → 40 dados rolam + selo "+20 dados (soma S)"', () => {
    const dados = Array.from({ length: 60 }, (_, i) => ({ lados: 6, valor: (i % 6) + 1 }))
    const [l] = receber([], rolagem('r1', 'A', dados), { meuId: 'B', preferencia: 'todos' })
    expect(l.dados).toHaveLength(40)
    const somaResto = dados.slice(40).reduce((s, d) => s + d.valor, 0)
    expect(l.excedente).toEqual({ qtd: 20, soma: somaResto })
  })

  it('rajada de 10 rolagens mostra no máximo 6 lançamentos', () => {
    let fila = []
    for (let i = 0; i < 10; i++) fila = receber(fila, rolagem(`r${i}`, 'A', [{ lados: 20, valor: 7 }]), { meuId: 'B', preferencia: 'todos' })
    expect(fila).toHaveLength(6)
  })

  it('evento sem dados (cura fixa) e rolagem antiga sem skin', () => {
    expect(receber([], rolagem('r1', 'A', []), { meuId: 'B', preferencia: 'todos' })).toEqual([])
    expect(receber([], rolagem('r2', 'A', tresD6, undefined), { meuId: 'B', preferencia: 'todos' })[0].skin).toBe('padrao')
  })

  it('os 40 dados de uma rolagem grande param dentro da bandeja de uma tela 16:9', () => {
    const largura = PROFUNDIDADE_BANDEJA * (16 / 9)
    const mundo = criarMundo(largura)
    let s = 3
    const rng = () => ((s = (s * 16807) % 2147483647) / 2147483647)
    const corpos = planejarLancamento(40, { largura, profundidade: PROFUNDIDADE_BANDEJA }, rng)
      .map(p => criarCorpoDado(mundo, 6, p))
    let passos = 0
    while (!corpos.every(estaParado) && passos < 60 * 20) { mundo.world.step(1 / 60); passos++ }
    expect(corpos.every(estaParado)).toBe(true)
    for (const c of corpos) {
      expect(Math.abs(c.position.x)).toBeLessThanOrEqual(largura / 2)
      expect(Math.abs(c.position.z)).toBeLessThanOrEqual(PROFUNDIDADE_BANDEJA / 2)
      expect(c.position.y).toBeGreaterThan(0)
    }
  })
})
