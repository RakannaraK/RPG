import { describe, it, expect } from 'vitest'
import { embaralhar, proximo } from './semente'
import {
  DIFICULDADES_RODA, avancarRoda, distanciaAngular, iniciarRoda, pontosPorAcerto, resultadoRoda, tempoLimiteAlvo, tocarRoda,
} from './rodaRunica'
import { cronometroVisivel, iniciarCronometro, pararCronometro } from './cronometro'
import { comecarResposta, iniciarMemoria, responderMemoria, resultadoMemoria, tempoExibir } from './memoria'
import { classificar, configDoJogo, resumoResultado, rotuloFeed, textoClassificacao } from './resultado'

/** Leva o ponteiro até o centro do arco (em passos pequenos) e toca. */
function acertar(e) {
  let estado = e
  for (let i = 0; i < 2000 && distanciaAngular(estado.angulo, estado.alvo.centro) > 1; i++) estado = avancarRoda(estado, 0.002)
  return tocarRoda(estado)
}

describe('semente', () => {
  it('mesma semente → mesma sequência; sementes diferentes → sequências diferentes', () => {
    const seq = s0 => { let s = s0; return Array.from({ length: 5 }, () => { const p = proximo(s); s = p.s; return p.valor }) }
    expect(seq(123)).toEqual(seq(123))
    expect(seq(123)).not.toEqual(seq(124))
    for (const v of seq(99)) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThan(1) }
  })

  it('embaralhar mantém os elementos e é determinístico', () => {
    const a = embaralhar([1, 2, 3, 4, 5, 6], 7).lista
    expect([...a].sort()).toEqual([1, 2, 3, 4, 5, 6])
    expect(embaralhar([1, 2, 3, 4, 5, 6], 7).lista).toEqual(a)
  })
})

describe('Roda Rúnica', () => {
  it('mesma semente → mesmos arcos', () => {
    expect(iniciarRoda(DIFICULDADES_RODA.dificil, 42).alvo).toEqual(iniciarRoda(DIFICULDADES_RODA.dificil, 42).alvo)
  })

  it('o arco nasce à frente do ponteiro (90°–270°)', () => {
    for (let s = 1; s < 30; s++) {
      const e = iniciarRoda({}, s)
      const d = distanciaAngular(e.angulo, e.alvo.centro)
      expect(d).toBeGreaterThanOrEqual(90 - 1e-9)
    }
  })

  it('combo: 5 acertos seguidos dobram os pontos por acerto', () => {
    expect([1, 4, 5, 9, 10].map(pontosPorAcerto)).toEqual([1, 1, 2, 2, 3])
    let e = iniciarRoda({ vidas: 5 }, 3)
    for (let i = 0; i < 5; i++) e = acertar(e)
    expect(e.acertos).toBe(5)
    expect(e.combo).toBe(5)
    expect(e.pontos).toBe(1 + 1 + 1 + 1 + 2)
  })

  it('acerto acelera, estreita o arco e (no Difícil) inverte o giro', () => {
    const e0 = iniciarRoda(DIFICULDADES_RODA.dificil, 11)
    const e1 = acertar(e0)
    expect(e1.velocidade).toBe(e0.velocidade + DIFICULDADES_RODA.dificil.aceleracao)
    expect(e1.largura).toBe(e0.largura - DIFICULDADES_RODA.dificil.encolhe)
    expect(e1.direcao).toBe(-e0.direcao)
  })

  it('tocar fora perde vida e zera o combo; sem vidas acaba', () => {
    let e = acertar(iniciarRoda({ vidas: 2 }, 5))
    // ponteiro longe do novo arco (o arco nasce ≥ 90° à frente)
    e = tocarRoda(e)
    expect(e.vidas).toBe(1)
    expect(e.combo).toBe(0)
    expect(e.ultimo.motivo).toBe('fora')
    e = tocarRoda(e)
    expect(e.fim).toBe(true)
    expect(tocarRoda(e)).toBe(e) // depois do fim nada muda
  })

  it('deixar o arco passar tempo demais conta como erro', () => {
    const e0 = iniciarRoda({ vidas: 3 }, 8)
    const e = avancarRoda(e0, tempoLimiteAlvo(e0) + 0.01)
    expect(e.vidas).toBe(2)
    expect(e.ultimo.motivo).toBe('expirou')
  })

  it('resultado arredonda a duração', () => {
    const e = avancarRoda(iniciarRoda({}, 1), 1.234)
    expect(resultadoRoda(e).duracao).toBe(1.2)
  })
})

describe('Cronômetro', () => {
  it('alvo determinístico dentro da faixa e oculto conforme a dificuldade', () => {
    const c = iniciarCronometro({ alvoMin: 3, alvoMax: 6, ocultarFracao: 0.5 }, 77)
    expect(iniciarCronometro({ alvoMin: 3, alvoMax: 6, ocultarFracao: 0.5 }, 77).alvo).toBe(c.alvo)
    expect(c.alvo).toBeGreaterThanOrEqual(3)
    expect(c.alvo).toBeLessThanOrEqual(6)
    expect(cronometroVisivel(c, c.alvo * 0.4)).toBe(true)
    expect(cronometroVisivel(c, c.alvo * 0.6)).toBe(false)
    expect(cronometroVisivel(iniciarCronometro({ ocultarFracao: 0 }, 1), 0)).toBe(false)
  })

  it('20 ms fora = Perfeito 980; faixas e placar', () => {
    const c = { alvo: 3 }
    expect(pararCronometro(c, 3.02)).toMatchObject({ erroMs: 20, pontos: 980, faixa: 'Perfeito', adiantado: false })
    expect(pararCronometro(c, 2.9)).toMatchObject({ erroMs: 100, faixa: 'Excelente', adiantado: true })
    expect(pararCronometro(c, 3.25).faixa).toBe('Bom')
    expect(pararCronometro(c, 3.5).faixa).toBe('Razoável')
    expect(pararCronometro(c, 5)).toMatchObject({ faixa: 'Errou', pontos: 0 })
  })
})

describe('Memória', () => {
  /** Responde a rodada inteira certo, ou erra na posição `errarEm`. */
  function jogarRodada(e, errarEm = null) {
    let estado = comecarResposta(e)
    for (let i = 0; i < e.sequencia.length; i++) {
      const runa = i === errarEm ? estado.opcoes.find(r => r !== estado.sequencia[i]) : estado.sequencia[i]
      estado = responderMemoria(estado, runa)
      if (estado.fase === 'fim') break
    }
    return estado
  }

  it('mesma semente → mesmas sequências', () => {
    expect(iniciarMemoria({}, 5).sequencia).toEqual(iniciarMemoria({}, 5).sequencia)
  })

  it('não aceita resposta enquanto memoriza', () => {
    const e = iniciarMemoria({}, 5)
    expect(responderMemoria(e, e.sequencia[0])).toBe(e)
  })

  it('Normal: erra na 2ª runa da rodada 3 → pontos = 4 + 5 + 1', () => {
    let e = iniciarMemoria({}, 21)
    expect(e.sequencia).toHaveLength(4)
    e = jogarRodada(e)
    expect(e.rodada).toBe(2)
    expect(e.sequencia).toHaveLength(5)
    e = jogarRodada(e)
    e = jogarRodada(e, 1)
    expect(e.fase).toBe('fim')
    expect(resultadoMemoria(e)).toEqual({ pontos: 10, maiorSequencia: 5, rodadas: 2 })
    expect(e.ultimo.tipo).toBe('erro')
  })

  it('sem repetição quando cabe; tempo para memorizar cresce por rodada', () => {
    const e = iniciarMemoria({ tamanhoInicial: 6, opcoes: 6, repete: false }, 9)
    expect(new Set(e.sequencia).size).toBe(6)
    const r2 = jogarRodada(e)
    expect(r2.sequencia).toHaveLength(7) // não cabe mais sem repetir: repete
    expect(tempoExibir(r2)).toBeGreaterThan(tempoExibir(e))
  })
})

describe('resultado e desafios', () => {
  it('personalizada sobrescreve a Normal; jogo desconhecido falha alto', () => {
    expect(configDoJogo('roda', 'personalizada', { vidas: 9 })).toMatchObject({ vidas: 9, velocidade: 150 })
    expect(configDoJogo('memoria', 'impossivel').opcoes).toBe(12)
    expect(() => configDoJogo('xadrez', 'normal')).toThrow()
  })

  it('textos do feed', () => {
    expect(rotuloFeed('roda', 'dificil')).toBe('🎮 Roda Rúnica (Difícil)')
    expect(resumoResultado('roda', { pontos: 23, acertos: 18, maiorCombo: 7, duracao: 42.1 })).toBe('23 pontos · 18 acertos · combo 7 · 42,1 s')
    expect(resumoResultado('cronometro', pararCronometro({ alvo: 4.5 }, 4.48))).toBe('Perfeito — parou em 4,48 s (alvo 4,5 s, −20 ms) · 980 pontos')
  })

  it('classificação com empate e meta', () => {
    const c = classificar([
      { nome: 'Borin', pontos: 17 },
      { nome: 'Aria', pontos: 23 },
      { nome: 'Cael', pontos: 17 },
      { nome: 'Dara', pontos: 9 },
    ], 15)
    expect(c.map(r => [r.nome, r.posicao, r.bateuMeta])).toEqual([
      ['Aria', 1, true], ['Borin', 2, true], ['Cael', 2, true], ['Dara', 4, false],
    ])
    expect(textoClassificacao(c)).toBe('1º Aria 23 ✓ · 2º Borin 17 ✓ · 2º Cael 17 ✓ · 4º Dara 9 ✗')
  })
})
