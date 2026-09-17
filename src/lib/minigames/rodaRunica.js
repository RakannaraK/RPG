import { proximo } from './semente'

/**
 * Fase 28 — Roda Rúnica (motor puro). Um ponteiro gira; tocar com ele dentro
 * do arco aceso = acerto. O tempo é passado por `avancarRoda(estado, dt)`.
 * Ângulos em graus, velocidade em graus/segundo.
 */
export const DIFICULDADES_RODA = {
  normal: { vidas: 3, velocidade: 150, aceleracao: 6, largura: 54, larguraMin: 20, encolhe: 1.5, inverte: false },
  dificil: { vidas: 2, velocidade: 210, aceleracao: 9, largura: 42, larguraMin: 14, encolhe: 2, inverte: true },
  impossivel: { vidas: 1, velocidade: 290, aceleracao: 12, largura: 30, larguraMin: 9, encolhe: 2, inverte: true },
}

/** O arco expira se o ponteiro der mais que isto de voltas sem o toque. */
export const VOLTAS_ATE_EXPIRAR = 1.25

const normalizar = a => ((a % 360) + 360) % 360

export function distanciaAngular(a, b) {
  const d = Math.abs(normalizar(a) - normalizar(b))
  return Math.min(d, 360 - d)
}

/** Combos multiplicam: 1–4 seguidos valem 1, 5–9 valem 2, 10–14 valem 3… */
export const pontosPorAcerto = combo => 1 + Math.floor(combo / 5)

export const tempoLimiteAlvo = estado => (360 / estado.velocidade) * VOLTAS_ATE_EXPIRAR

function novoAlvo(e) {
  const { valor, s } = proximo(e.s)
  // Sempre à frente do ponteiro (90°–270°), no sentido do giro
  const distancia = 90 + valor * 180
  return { ...e, s, alvo: { centro: normalizar(e.angulo + e.direcao * distancia), largura: e.largura }, alvoDesde: e.t }
}

export function iniciarRoda(config, semente) {
  const cfg = { ...DIFICULDADES_RODA.normal, ...config }
  return novoAlvo({
    cfg, s: semente >>> 0, t: 0, angulo: 0, direcao: 1,
    velocidade: cfg.velocidade, largura: cfg.largura, vidas: cfg.vidas,
    pontos: 0, acertos: 0, erros: 0, combo: 0, maiorCombo: 0,
    fim: false, ultimo: null,
  })
}

function errar(e, motivo) {
  const vidas = e.vidas - 1
  const depois = { ...e, vidas, combo: 0, erros: e.erros + 1, ultimo: { tipo: 'erro', motivo, t: e.t }, fim: vidas <= 0 }
  return depois.fim ? depois : novoAlvo(depois)
}

export function avancarRoda(e, dt) {
  if (e.fim || !(dt > 0)) return e
  const avancado = { ...e, t: e.t + dt, angulo: normalizar(e.angulo + e.direcao * e.velocidade * dt) }
  return avancado.t - e.alvoDesde > tempoLimiteAlvo(e) ? errar(avancado, 'expirou') : avancado
}

export function tocarRoda(e) {
  if (e.fim) return e
  if (distanciaAngular(e.angulo, e.alvo.centro) > e.alvo.largura / 2) return errar(e, 'fora')
  const combo = e.combo + 1
  return novoAlvo({
    ...e,
    combo,
    maiorCombo: Math.max(e.maiorCombo, combo),
    acertos: e.acertos + 1,
    pontos: e.pontos + pontosPorAcerto(combo),
    velocidade: e.velocidade + e.cfg.aceleracao,
    largura: Math.max(e.cfg.larguraMin, e.largura - e.cfg.encolhe),
    direcao: e.cfg.inverte ? -e.direcao : e.direcao,
    ultimo: { tipo: 'acerto', t: e.t },
  })
}

export function resultadoRoda(e) {
  return { pontos: e.pontos, acertos: e.acertos, erros: e.erros, maiorCombo: e.maiorCombo, duracao: Math.round(e.t * 10) / 10 }
}
