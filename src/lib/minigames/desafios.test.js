import { describe, it, expect } from 'vitest'
import { pendentesDoJogador, situacaoDesafio, textoEncerramento, textoLancamento, tituloDesafio } from './desafios'

const nomes = { a: 'Aria', b: 'Borin', c: 'Cael', m: 'Mestre' }
const nomeDe = id => nomes[id] || '?'
const desafio = { id: 'd1', tipo: 'roda', dificuldade: 'dificil', participantes: ['a', 'b', 'c'], meta: 15, motivo: 'Quem alcança a corda', status: 'aberto' }

describe('desafios', () => {
  it('título e lançamento', () => {
    expect(tituloDesafio(desafio)).toBe('Roda Rúnica (Difícil)')
    expect(textoLancamento(desafio, nomeDe)).toBe('📣 Desafio: Roda Rúnica (Difícil) — Quem alcança a corda — participantes: Aria, Borin, Cael — meta 15')
  })

  it('pendentes: aberto, eu participo, ainda não joguei', () => {
    const lista = [
      desafio,
      { ...desafio, id: 'd2' },
      { ...desafio, id: 'd3', status: 'encerrado' },
      { ...desafio, id: 'd4', participantes: ['b'] },
    ]
    expect(pendentesDoJogador(lista, ['d2'], 'a').map(d => d.id)).toEqual(['d1'])
  })

  it('situação ao vivo: classificação, meta, quem falta; ignora quem não participa', () => {
    const resultados = [
      { desafio_id: 'd1', usuario_id: 'b', pontos: 17 },
      { desafio_id: 'd1', usuario_id: 'a', pontos: 23 },
      { desafio_id: 'd1', usuario_id: 'm', pontos: 99 }, // não é participante
      { desafio_id: 'outro', usuario_id: 'c', pontos: 50 },
    ]
    const s = situacaoDesafio(desafio, resultados, nomeDe)
    expect(s.classificados.map(r => [r.nome, r.posicao, r.bateuMeta])).toEqual([['Aria', 1, true], ['Borin', 2, true]])
    expect(s.faltam).toEqual(['c'])
    expect(s.completo).toBe(false)
    expect(textoEncerramento(desafio, s, nomeDe)).toBe(
      '🏆 Desafio encerrado: Roda Rúnica (Difícil) — Quem alcança a corda — 1º Aria 23 ✓ · 2º Borin 17 ✓ — meta 15 — não jogou: Cael'
    )
  })

  it('encerrar sem ninguém ter jogado e sem meta', () => {
    const d = { ...desafio, meta: null, motivo: null }
    const s = situacaoDesafio(d, [], nomeDe)
    expect(textoEncerramento(d, s, nomeDe)).toBe('🏆 Desafio encerrado: Roda Rúnica (Difícil) — ninguém jogou — não jogou: Aria, Borin, Cael')
  })
})
