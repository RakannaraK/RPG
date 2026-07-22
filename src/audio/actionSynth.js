// Sintetizador Web Audio dos presets de som de ação (FV.4b). Efeitoso, sem
// testes unitários — a lógica de QUAL preset toca é pura e testada em
// src/engines/actionSoundEngine.js. Reutiliza o MESMO AudioContext dos sons
// de dado da F11 (src/lib/diceSounds.js) — nunca cria um segundo contexto.
// Teto de duração de qualquer preset: 700ms.

import { getAudioContext } from '../lib/diceSounds'

function ruido(ctx, dur) {
  const n = Math.max(1, Math.floor(ctx.sampleRate * dur))
  const buf = ctx.createBuffer(1, n, ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1
  const src = ctx.createBufferSource()
  src.buffer = buf
  return src
}

function envelope(ctx, t, pico, decay, ataque = 0.004) {
  const g = ctx.createGain()
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(pico, t + ataque)
  g.gain.exponentialRampToValueAtTime(0.0005, t + decay)
  return g
}

// ── Presets (catálogo genérico — ver PRESET_IDS em actionSoundEngine.js) ──

function somLamina(ctx, destino, t, volume) {
  const src = ruido(ctx, 0.18)
  const hp = ctx.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.setValueAtTime(6000, t)
  hp.frequency.exponentialRampToValueAtTime(800, t + 0.16)
  const g = envelope(ctx, t, volume * 0.5, 0.18, 0.002)
  src.connect(hp); hp.connect(g); g.connect(destino)
  src.start(t); src.stop(t + 0.2)
}

function somImpacto(ctx, destino, t, volume) {
  const src = ruido(ctx, 0.22)
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 400
  const g = envelope(ctx, t, volume * 0.6, 0.22, 0.003)
  src.connect(lp); lp.connect(g); g.connect(destino)
  src.start(t); src.stop(t + 0.24)

  const osc = ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(140, t)
  osc.frequency.exponentialRampToValueAtTime(60, t + 0.2)
  const og = envelope(ctx, t, volume * 0.4, 0.2, 0.002)
  osc.connect(og); og.connect(destino)
  osc.start(t); osc.stop(t + 0.22)
}

function somDisparo(ctx, destino, t, volume) {
  const burst = ruido(ctx, 0.05)
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 1800
  bp.Q.value = 1.2
  const g = envelope(ctx, t, volume * 0.7, 0.05, 0.001)
  burst.connect(bp); bp.connect(g); g.connect(destino)
  burst.start(t); burst.stop(t + 0.06)

  const click = ctx.createOscillator()
  click.type = 'square'
  click.frequency.value = 90
  const cg = envelope(ctx, t, volume * 0.35, 0.04, 0.001)
  click.connect(cg); cg.connect(destino)
  click.start(t); click.stop(t + 0.05)

  // eco curto
  const eco = ruido(ctx, 0.04)
  const ecoBp = ctx.createBiquadFilter()
  ecoBp.type = 'bandpass'
  ecoBp.frequency.value = 1400
  const ecoG = envelope(ctx, t + 0.09, volume * 0.25, 0.05, 0.002)
  eco.connect(ecoBp); ecoBp.connect(ecoG); ecoG.connect(destino)
  eco.start(t + 0.09); eco.stop(t + 0.14)
}

function somProjetil(ctx, destino, t, volume) {
  const src = ruido(ctx, 0.28)
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.Q.value = 6
  bp.frequency.setValueAtTime(2400, t)
  bp.frequency.exponentialRampToValueAtTime(700, t + 0.26)
  const g = envelope(ctx, t, volume * 0.4, 0.28, 0.01)
  src.connect(bp); bp.connect(g); g.connect(destino)
  src.start(t); src.stop(t + 0.3)
}

function somArcano(ctx, destino, t, volume) {
  const razoes = [1, 1.5, 2]
  const base = 440
  razoes.forEach((r, i) => {
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = base * r
    const lfo = ctx.createOscillator()
    lfo.type = 'sine'
    lfo.frequency.value = 5.5
    const lfoGain = ctx.createGain()
    lfoGain.gain.value = 4
    lfo.connect(lfoGain); lfoGain.connect(osc.frequency)
    const dur = 0.5
    const g = envelope(ctx, t, (volume * 0.22) / (i + 1), dur, 0.02)
    osc.connect(g); g.connect(destino)
    osc.start(t); osc.stop(t + dur + 0.05)
    lfo.start(t); lfo.stop(t + dur + 0.05)
  })
}

function somCura(ctx, destino, t, volume) {
  const notas = [523.25, 659.25, 783.99] // dó–mi–sol, arpejo ascendente
  notas.forEach((f, i) => {
    const tn = t + i * 0.05
    const osc = ctx.createOscillator()
    osc.type = 'triangle'
    osc.frequency.value = f
    const g = envelope(ctx, tn, volume * 0.35, 0.18, 0.01)
    osc.connect(g); g.connect(destino)
    osc.start(tn); osc.stop(tn + 0.2)
  })
}

function somEscudo(ctx, destino, t, volume) {
  const osc = ctx.createOscillator()
  osc.type = 'triangle'
  osc.frequency.value = 90
  const g = envelope(ctx, t, volume * 0.5, 0.4, 0.01)
  osc.connect(g); g.connect(destino)
  osc.start(t); osc.stop(t + 0.42)

  const osc2 = ctx.createOscillator()
  osc2.type = 'sine'
  osc2.frequency.value = 135
  const g2 = envelope(ctx, t, volume * 0.25, 0.35, 0.01)
  osc2.connect(g2); g2.connect(destino)
  osc2.start(t); osc2.stop(t + 0.37)
}

function somCritico(ctx, destino, t, volume) {
  const notas = [1568, 2093, 2637]
  notas.forEach((f, i) => {
    const tn = t + i * 0.015
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = f
    const g = envelope(ctx, tn, volume * 0.3, 0.22, 0.003)
    osc.connect(g); g.connect(destino)
    osc.start(tn); osc.stop(tn + 0.24)
  })
}

function somFalha(ctx, destino, t, volume) {
  ;[220, 233.08].forEach(f0 => {
    const osc = ctx.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(f0, t)
    osc.frequency.exponentialRampToValueAtTime(f0 * 0.5, t + 0.3)
    const g = envelope(ctx, t, volume * 0.25, 0.3, 0.005)
    osc.connect(g); g.connect(destino)
    osc.start(t); osc.stop(t + 0.32)
  })
}

function somNeutro(ctx, destino, t, volume) {
  const src = ruido(ctx, 0.03)
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 2000
  const g = envelope(ctx, t, volume * 0.3, 0.035, 0.001)
  src.connect(bp); bp.connect(g); g.connect(destino)
  src.start(t); src.stop(t + 0.05)
}

const SINTESE = {
  lamina: somLamina,
  impacto: somImpacto,
  disparo: somDisparo,
  projetil: somProjetil,
  arcano: somArcano,
  cura: somCura,
  escudo: somEscudo,
  critico: somCritico,
  falha: somFalha,
  neutro: somNeutro,
}

/**
 * Toca um preset de som de ação no AudioContext compartilhado.
 * @param {string} presetId
 * @param {{ativo?:boolean, volume?:number}} opts
 */
export function tocarPresetAcao(presetId, opts = {}) {
  const { ativo = true, volume = 0.6 } = opts
  if (!ativo || volume <= 0) return
  const sintetizar = SINTESE[presetId] || SINTESE.neutro
  try {
    const ctx = getAudioContext()
    const limiter = ctx.createDynamicsCompressor()
    limiter.threshold.value = -10
    limiter.ratio.value = 12
    limiter.attack.value = 0.003
    limiter.release.value = 0.25
    limiter.connect(ctx.destination)
    sintetizar(ctx, limiter, ctx.currentTime + 0.02, volume)
  } catch {
    // silencia se áudio não for suportado ou estiver bloqueado
  }
}

/**
 * Toca o resultado de resolveActionSound: o preset base e, se houver, a
 * camada de crítico/falha logo em seguida, discretamente mais baixa.
 * @param {{presetId:string, intensity?:number, layer?:('critico'|'falha'|null)}|null} som
 * @param {{ativo?:boolean, volume?:number}} opts
 */
export function tocarSomAcao(som, opts = {}) {
  if (!som) return
  tocarPresetAcao(som.presetId, opts)
  if (som.layer) {
    const { volume = 0.6 } = opts
    tocarPresetAcao(som.layer, { ...opts, volume: volume * 0.8 })
  }
}
