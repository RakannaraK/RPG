/**
 * Fase 28 — teste de aceitação (docs/FASE28_MINIGAMES.md), camada pura.
 * RLS (uma tentativa por desafio, espectador não registra, só gestor lança)
 * foi verificado no banco real em transação desfeita (20/20); a interface,
 * no navegador em /teste-dados.
 */
import { describe, it, expect } from 'vitest'
import { avancarRoda, distanciaAngular, iniciarRoda, resultadoRoda, tocarRoda } from './rodaRunica'
import { iniciarCronometro, pararCronometro } from './cronometro'
import { comecarResposta, iniciarMemoria, responderMemoria, resultadoMemoria } from './memoria'
import { configDoJogo } from './resultado'
import { pendentesDoJogador, situacaoDesafio, textoEncerramento } from './desafios'

/** Jogador "robô" da Roda: acerta N vezes (esperando o ponteiro chegar) e depois erra até acabar. */
function jogarRoda(config, semente, acertos) {
  let e = iniciarRoda(config, semente)
  for (let i = 0; i < acertos; i++) {
    for (let p = 0; p < 5000 && distanciaAngular(e.angulo, e.alvo.centro) > 1; p++) e = avancarRoda(e, 0.002)
    e = tocarRoda(e)
  }
  while (!e.fim) e = tocarRoda(e)
  return resultadoRoda(e)
}

describe('Fase 28 — aceitação', () => {
  it('mesma semente produz a mesma Roda, o mesmo Cronômetro e a mesma Memória', () => {
    const cfg = configDoJogo('roda', 'dificil')
    expect(iniciarRoda(cfg, 777).alvo).toEqual(iniciarRoda(cfg, 777).alvo)
    expect(iniciarCronometro(configDoJogo('cronometro', 'normal'), 777).alvo).toBe(iniciarCronometro(configDoJogo('cronometro', 'normal'), 777).alvo)
    expect(iniciarMemoria(configDoJogo('memoria', 'normal'), 777).sequencia).toEqual(iniciarMemoria(configDoJogo('memoria', 'normal'), 777).sequencia)
  })

  it('Roda: 5 acertos seguidos dobram os pontos por acerto (1+1+1+1+2)', () => {
    expect(jogarRoda(configDoJogo('roda', 'normal'), 5, 5).pontos).toBe(6)
  })

  it('Cronômetro: 20 ms fora é "Perfeito" com 980 pontos', () => {
    const c = iniciarCronometro(configDoJogo('cronometro', 'normal'), 9)
    expect(pararCronometro(c, c.alvo + 0.02)).toMatchObject({ faixa: 'Perfeito', pontos: 980 })
  })

  it('Memória Normal: erra na 2ª runa da rodada 3 → 4 + 5 + 1 = 10', () => {
    let e = iniciarMemoria(configDoJogo('memoria', 'normal'), 31)
    const rodada = errarEm => {
      e = comecarResposta(e)
      for (let i = 0; i < e.sequencia.length && e.fase === 'responder'; i++) {
        e = responderMemoria(e, i === errarEm ? e.opcoes.find(r => r !== e.sequencia[i]) : e.sequencia[i])
      }
    }
    rodada(null)
    rodada(null)
    rodada(1)
    expect(resultadoMemoria(e).pontos).toBe(10)
  })

  it('Desafio: 3 jogadores na Roda Difícil com a mesma semente, meta, classificação e quem faltou', () => {
    const desafio = {
      id: 'd1', tipo: 'roda', dificuldade: 'dificil', config: configDoJogo('roda', 'dificil'), semente: 4242,
      participantes: ['aria', 'borin', 'cael'], meta: 4, motivo: 'Atravessar a ponte', status: 'aberto',
    }
    const nomes = { aria: 'Aria', borin: 'Borin', cael: 'Cael' }
    const nomeDe = id => nomes[id]

    // Todos recebem a MESMA partida
    const primeiroArco = iniciarRoda(desafio.config, desafio.semente).alvo
    for (let i = 0; i < 3; i++) expect(iniciarRoda(desafio.config, desafio.semente).alvo).toEqual(primeiroArco)

    // Aria e Borin jogam; Cael não
    const resultados = [
      { desafio_id: 'd1', usuario_id: 'aria', pontos: jogarRoda(desafio.config, desafio.semente, 6).pontos },
      { desafio_id: 'd1', usuario_id: 'borin', pontos: jogarRoda(desafio.config, desafio.semente, 2).pontos },
    ]
    expect(pendentesDoJogador([desafio], ['d1'], 'aria')).toEqual([])
    expect(pendentesDoJogador([desafio], [], 'cael')).toHaveLength(1)

    const s = situacaoDesafio(desafio, resultados, nomeDe)
    expect(s.classificados.map(r => [r.nome, r.posicao, r.bateuMeta])).toEqual([['Aria', 1, true], ['Borin', 2, false]])
    expect(s.faltam).toEqual(['cael'])
    expect(textoEncerramento(desafio, s, nomeDe)).toBe(
      `🏆 Desafio encerrado: Roda Rúnica (Difícil) — Atravessar a ponte — 1º Aria ${resultados[0].pontos} ✓ · 2º Borin ${resultados[1].pontos} ✗ — meta 4 — não jogou: Cael`
    )
  })
})
