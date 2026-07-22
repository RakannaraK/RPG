// Som sintético de rolagem por skin de material — 100% Web Audio API, sem
// arquivos externos. Cada skin (ver lib/diceSkins.js) tem um perfil de síntese
// próprio: madeira "toca", cristal tilinta, gelo é abafado, metal é inarmônico,
// néon zumbe, elétrico crepita.
//
// `tocarSomDado(skinId, opts)` usa o AudioContext ao vivo (criado/retomado no
// primeiro gesto do usuário). `construirSomDado(ctx, destino, skinId, opts)` é a
// camada de baixo nível — usada também para render offline (preview/testes).

let _ctx = null

function getCtx() {
  if (!_ctx || _ctx.state === 'closed') {
    _ctx = new (window.AudioContext || window.webkitAudioContext)()
  }
  if (_ctx.state === 'suspended') _ctx.resume()
  return _ctx
}

// ── Helpers ─────────────────────────────────────────────────────────────

function bufferRuido(ctx, dur) {
  const n = Math.max(1, Math.floor(ctx.sampleRate * dur))
  const buf = ctx.createBuffer(1, n, ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1
  const src = ctx.createBufferSource()
  src.buffer = buf
  return src
}

// Envelope percussivo padrão num GainNode
function envPercussivo(ctx, t, amp, decay) {
  const g = ctx.createGain()
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(amp, t + 0.004)
  g.gain.exponentialRampToValueAtTime(0.0006, t + decay)
  return g
}

// Reverb leve via feedback delay (shimmer) — usado por cristal
function reverbLeve(ctx, destino, wetAmount) {
  const input = ctx.createGain()
  const delay = ctx.createDelay(0.5)
  delay.delayTime.value = 0.045
  const fb = ctx.createGain()
  fb.gain.value = 0.35
  const wet = ctx.createGain()
  wet.gain.value = wetAmount
  input.connect(destino)        // dry
  input.connect(delay)
  delay.connect(fb)
  fb.connect(delay)             // cauda
  delay.connect(wet)
  wet.connect(destino)          // wet
  return input
}

// ── Perfis por skin ─────────────────────────────────────────────────────

// "Toc" de dado batendo: ruído filtrado em impactos decrescentes (quiques)
function somToc(ctx, destino, t0, volume, numDados, { cutoff, decay, ressalto }) {
  const hits = Math.min(2 + numDados, 7)
  for (let i = 0; i < hits; i++) {
    const t = t0 + i * (0.085 + Math.random() * 0.025)
    const amp = volume * 0.6 * Math.pow(ressalto, i)
    const src = bufferRuido(ctx, decay + 0.02)
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = cutoff
    const g = envPercussivo(ctx, t, amp, decay)
    src.connect(lp); lp.connect(g); g.connect(destino)
    src.start(t); src.stop(t + decay + 0.04)
  }
}

// Metal: impacto com parciais inarmônicos (sino), decaimento médio
function somMetal(ctx, destino, t0, volume, numDados) {
  const hits = Math.min(1 + numDados, 5)
  const ratios = [1, 2.76, 5.4, 8.93]
  for (let i = 0; i < hits; i++) {
    const t = t0 + i * 0.1
    const base = 300 + Math.random() * 90
    const ampBase = volume * 0.45 * Math.pow(0.7, i)
    ratios.forEach((r, idx) => {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = base * r
      const decay = 0.38 - idx * 0.06
      const g = envPercussivo(ctx, t, ampBase / (idx + 1), decay)
      osc.connect(g); g.connect(destino)
      osc.start(t); osc.stop(t + decay + 0.04)
    })
  }
}

// Cristal: senoidais agudas, decaimento longo (tilintar) + reverb leve
function somCristal(ctx, destino, t0, volume, numDados) {
  const rev = reverbLeve(ctx, destino, 0.3)
  const notas = [1568, 2093, 2637, 3136, 3520]
  const hits = Math.min(2 + numDados, 6)
  for (let i = 0; i < hits; i++) {
    const t = t0 + i * 0.075 + Math.random() * 0.02
    const f = notas[Math.floor(Math.random() * notas.length)]
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = f
    const decay = 0.9
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(volume * 0.3, t + 0.005)
    g.gain.exponentialRampToValueAtTime(0.0005, t + decay)
    osc.connect(g); g.connect(rev)
    osc.start(t); osc.stop(t + decay + 0.05)
  }
}

// Gelo: como cristal mas passa-baixa forte (fechado/abafado) + toque de ruído
function somGelo(ctx, destino, t0, volume, numDados) {
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 2400
  lp.Q.value = 0.7
  lp.connect(destino)
  const notas = [1175, 1568, 1976, 2349]
  const hits = Math.min(2 + numDados, 6)
  for (let i = 0; i < hits; i++) {
    const t = t0 + i * 0.08 + Math.random() * 0.02
    const f = notas[Math.floor(Math.random() * notas.length)]
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = f
    const decay = 0.6
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(volume * 0.28, t + 0.006)
    g.gain.exponentialRampToValueAtTime(0.0005, t + decay)
    osc.connect(g); g.connect(lp)
    osc.start(t); osc.stop(t + decay + 0.05)
    // toque de ruído curto e abafado
    const src = bufferRuido(ctx, 0.05)
    const ng = envPercussivo(ctx, t, volume * 0.08, 0.05)
    src.connect(ng); ng.connect(lp)
    src.start(t); src.stop(t + 0.07)
  }
}

// Néon: impactos brilhantes + zumbido senoidal grave por baixo
function somNeon(ctx, destino, t0, volume, numDados) {
  somToc(ctx, destino, t0, volume * 0.7, numDados, { cutoff: 5000, decay: 0.06, ressalto: 0.72 })
  // hum sustentado
  const t = t0
  const dur = 0.5
  const osc = ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(110, t)
  const lfo = ctx.createOscillator()
  lfo.type = 'sine'
  lfo.frequency.value = 30
  const lfoGain = ctx.createGain()
  lfoGain.gain.value = 12
  lfo.connect(lfoGain); lfoGain.connect(osc.frequency)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(volume * 0.22, t + 0.03)
  g.gain.exponentialRampToValueAtTime(0.0005, t + dur)
  osc.connect(g); g.connect(destino)
  osc.start(t); osc.stop(t + dur + 0.05)
  lfo.start(t); lfo.stop(t + dur + 0.05)
}

// Elétrico: rajadas de ruído filtrado (estalos) + zap descendente (arco)
function somEletrico(ctx, destino, t0, volume, numDados) {
  const crackles = Math.min(4 + numDados * 2, 14)
  for (let i = 0; i < crackles; i++) {
    const t = t0 + Math.random() * 0.42
    const src = bufferRuido(ctx, 0.03)
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 1500 + Math.random() * 3500
    bp.Q.value = 2.5
    const g = envPercussivo(ctx, t, volume * 0.22, 0.028)
    src.connect(bp); bp.connect(g); g.connect(destino)
    src.start(t); src.stop(t + 0.045)
  }
  // zap descendente
  const t = t0
  const osc = ctx.createOscillator()
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(1800, t)
  osc.frequency.exponentialRampToValueAtTime(120, t + 0.35)
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 2600
  const g = ctx.createGain()
  g.gain.setValueAtTime(volume * 0.22, t)
  g.gain.exponentialRampToValueAtTime(0.0005, t + 0.4)
  osc.connect(lp); lp.connect(g); g.connect(destino)
  osc.start(t); osc.stop(t + 0.42)
}

const PERFIS = {
  padrao:   (c, d, t, v, n) => somToc(c, d, t, v, n, { cutoff: 3500, decay: 0.06,  ressalto: 0.72 }),
  madeira:  (c, d, t, v, n) => somToc(c, d, t, v, n, { cutoff: 1400, decay: 0.07,  ressalto: 0.68 }),
  metal:    somMetal,
  cristal:  somCristal,
  gelo:     somGelo,
  neon:     somNeon,
  eletrico: somEletrico,
}

// ── API ─────────────────────────────────────────────────────────────────

/**
 * Constrói o grafo de áudio de uma skin num contexto/destino dados.
 * Baixo nível — também usado para render offline (preview/testes).
 *
 * @param {BaseAudioContext} ctx
 * @param {AudioNode} destino  - nó de destino (ex: ctx.destination ou um limiter)
 * @param {string} skinId
 * @param {{volume?:number, numDados?:number, t0?:number}} opts
 */
export function construirSomDado(ctx, destino, skinId, opts = {}) {
  const { volume = 0.6, numDados = 1, t0 = ctx.currentTime + 0.02 } = opts
  const perfil = PERFIS[skinId] || PERFIS.padrao
  perfil(ctx, destino, t0, volume, Math.max(1, numDados | 0))
}

/**
 * Estima quantos dados há numa notação (ex: "2d6+1d4" → 3) para dosar o número
 * de impactos no som. Cai para 1 se não houver nenhum termo de dado.
 * @param {string} notacao
 * @returns {number}
 */
export function estimarNumDados(notacao) {
  if (!notacao) return 1
  let total = 0
  const re = /(\d+)\s*d\s*\d+/gi
  let m
  while ((m = re.exec(notacao))) total += parseInt(m[1], 10) || 0
  return Math.max(1, total)
}

/**
 * Toca o som de rolagem de uma skin no AudioContext ao vivo.
 * @param {string} skinId
 * @param {{ativo?:boolean, volume?:number, numDados?:number}} opts
 */
export function tocarSomDado(skinId, opts = {}) {
  const { ativo = true, volume = 0.6, numDados = 1 } = opts
  if (!ativo || volume <= 0) return
  try {
    const ctx = getCtx()
    // Limiter no master pra mais dados não estourarem
    const limiter = ctx.createDynamicsCompressor()
    limiter.threshold.value = -10
    limiter.ratio.value = 12
    limiter.attack.value = 0.003
    limiter.release.value = 0.25
    limiter.connect(ctx.destination)
    construirSomDado(ctx, limiter, skinId, { volume, numDados, t0: ctx.currentTime + 0.02 })
  } catch {
    // Silencia se o áudio não for suportado ou estiver bloqueado
  }
}

/**
 * Expõe o AudioContext compartilhado (lazy, singleton) para outros módulos
 * de áudio sintetizado (ex: FV.4 — src/audio/actionSynth.js) reutilizarem em
 * vez de criar um segundo contexto.
 * @returns {AudioContext}
 */
export function getAudioContext() {
  return getCtx()
}
