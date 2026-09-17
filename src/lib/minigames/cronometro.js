import { proximo } from './semente'

/**
 * Fase 28 — Cronômetro (motor puro): "pare exatamente em X,XX s".
 * `ocultarFracao` = até que fração do alvo o cronômetro fica visível (0 = nunca).
 */
export const DIFICULDADES_CRONOMETRO = {
  normal: { alvoMin: 3, alvoMax: 6, ocultarFracao: 0.5 },
  dificil: { alvoMin: 4, alvoMax: 8, ocultarFracao: 0.15 },
  impossivel: { alvoMin: 5, alvoMax: 10, ocultarFracao: 0 },
}

export const FAIXAS_CRONOMETRO = [
  { ate: 30, nome: 'Perfeito' },
  { ate: 100, nome: 'Excelente' },
  { ate: 250, nome: 'Bom' },
  { ate: 500, nome: 'Razoável' },
]

/** Quem não para até alvo + 3 s perde a partida (0 pontos). */
export const FOLGA_LIMITE = 3

const centesimos = n => Math.round(n * 100) / 100

export function iniciarCronometro(config, semente) {
  const cfg = { ...DIFICULDADES_CRONOMETRO.normal, ...config }
  const alvo = centesimos(cfg.alvoMin + proximo(semente >>> 0).valor * (cfg.alvoMax - cfg.alvoMin))
  return { cfg, alvo, ocultarApos: centesimos(alvo * cfg.ocultarFracao), limite: alvo + FOLGA_LIMITE }
}

export const cronometroVisivel = (c, t) => t < c.ocultarApos

export function pararCronometro(c, tempoParado) {
  const erroMs = Math.round(Math.abs(tempoParado - c.alvo) * 1000)
  return {
    alvo: c.alvo,
    parado: Math.round(tempoParado * 1000) / 1000,
    erroMs,
    adiantado: tempoParado < c.alvo,
    pontos: Math.max(0, 1000 - erroMs),
    faixa: FAIXAS_CRONOMETRO.find(f => erroMs <= f.ate)?.nome || 'Errou',
  }
}
