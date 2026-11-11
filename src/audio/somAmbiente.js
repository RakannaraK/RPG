/**
 * Fase 57 — som ambiente sintetizado (laços de Web Audio, sem arquivo de áudio).
 * criarSomAmbiente() → { atualizar(volumes), trovao(volume), parar() }.
 * Tudo baixo de propósito: é fundo, não pode cobrir a voz da mesa.
 */
import { getAudioContext } from '../lib/diceSounds'
import { tocarPresetAcao } from './actionSynth'

const RAMPA = 0.4 // s
const NIVEL = 0.4 // ganho de um laço a volume 1

const acaso = (a, b) => a + Math.random() * (b - a)

function bufferRuido(ctx, marrom) {
  const n = Math.floor(ctx.sampleRate * 2)
  const buf = ctx.createBuffer(1, n, ctx.sampleRate)
  const d = buf.getChannelData(0)
  let ult = 0
  for (let i = 0; i < n; i++) {
    const b = Math.random() * 2 - 1
    if (marrom) { ult = (ult + 0.02 * b) / 1.02; d[i] = ult * 3.5 } else d[i] = b
  }
  return buf
}

function ruido(ctx, marrom) {
  const s = ctx.createBufferSource()
  s.buffer = bufferRuido(ctx, marrom)
  s.loop = true
  s.start()
  return s
}

function filtro(ctx, type, freq, q = 1) {
  const f = ctx.createBiquadFilter()
  f.type = type
  f.frequency.value = freq
  f.Q.value = q
  return f
}

function osc(ctx, type, freq) {
  const o = ctx.createOscillator()
  o.type = type
  o.frequency.value = freq
  o.start()
  return o
}

/** Oscilador lento que modula um parâmetro (`prof` = amplitude). */
function lfo(ctx, freq, prof, alvo) {
  const o = osc(ctx, 'sine', freq)
  const g = ctx.createGain()
  g.gain.value = prof
  o.connect(g)
  g.connect(alvo)
  return o
}

/** Repete `fn` em intervalos sorteados (ms). Devolve o cancelador. */
function repetir(fn, minMs, maxMs) {
  let t
  const volta = () => { fn(); t = setTimeout(volta, acaso(minMs, maxMs)) }
  t = setTimeout(volta, acaso(minMs, maxMs))
  return () => clearTimeout(t)
}

// Cada receita liga seus nós em `saida` e devolve a função que desfaz o que sobra (fontes e timers).
const RECEITAS = {
  fogo(ctx, saida) {
    const base = ruido(ctx, true)
    base.connect(filtro(ctx, 'lowpass', 900)).connect(saida)
    const estalos = bufferRuido(ctx, false)
    const cancelar = repetir(() => {
      const dur = acaso(0.008, 0.025)
      const s = ctx.createBufferSource()
      s.buffer = estalos
      const g = ctx.createGain()
      g.gain.value = acaso(0.3, 0.9)
      s.connect(filtro(ctx, 'bandpass', acaso(1500, 4000), 2)).connect(g).connect(saida)
      s.start(ctx.currentTime, acaso(0, 1.5), dur)
    }, 40, 200)
    return () => { base.stop(); cancelar() }
  },
  chuva(ctx, saida) {
    const r = ruido(ctx, false)
    r.connect(filtro(ctx, 'highpass', 1000)).connect(filtro(ctx, 'lowpass', 8000)).connect(saida)
    return () => r.stop()
  },
  vento(ctx, saida) {
    const r = ruido(ctx, false)
    const bp = filtro(ctx, 'bandpass', 600, 1.2)
    const g = ctx.createGain()
    g.gain.value = 0.7
    r.connect(bp).connect(g).connect(saida)
    const a = lfo(ctx, 0.12, 300, bp.frequency) // centro passeia entre 300 e 900 Hz
    const b = lfo(ctx, 0.07, 0.3, g.gain)       // ganho ondula
    return () => { r.stop(); a.stop(); b.stop() }
  },
  noite(ctx, saida) {
    const o = osc(ctx, 'sine', 4200)
    const g = ctx.createGain()
    g.gain.value = 0
    o.connect(g).connect(saida)
    const cancelar = repetir(() => {
      const t0 = ctx.currentTime
      for (let i = 0; i < 3; i++) { // trinado: 3 pios curtos
        g.gain.setValueAtTime(0.12, t0 + i * 0.09)
        g.gain.setValueAtTime(0, t0 + i * 0.09 + 0.04)
      }
    }, 600, 2200)
    return () => { o.stop(); cancelar() }
  },
  agua(ctx, saida) {
    const r = ruido(ctx, false)
    r.connect(filtro(ctx, 'lowpass', 400)).connect(saida)
    const cancelar = repetir(() => {
      const t0 = ctx.currentTime
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.frequency.setValueAtTime(300, t0)
      o.frequency.linearRampToValueAtTime(900, t0 + 0.08)
      g.gain.setValueAtTime(0.35, t0)
      g.gain.linearRampToValueAtTime(0, t0 + 0.08)
      o.connect(g).connect(saida)
      o.start(t0)
      o.stop(t0 + 0.1)
    }, 150, 700)
    return () => { r.stop(); cancelar() }
  },
  infernal(ctx, saida) {
    const a = osc(ctx, 'sawtooth', 55)
    const b = osc(ctx, 'sawtooth', 58.3)
    const lp = filtro(ctx, 'lowpass', 220)
    const g = ctx.createGain()
    g.gain.value = 0.5
    a.connect(lp); b.connect(lp)
    lp.connect(g).connect(saida)
    return () => { a.stop(); b.stop() }
  },
  arcano(ctx, saida) {
    const a = osc(ctx, 'sine', 220)
    const b = osc(ctx, 'sine', 331)
    const g = ctx.createGain()
    g.gain.value = 0.3
    a.connect(g); b.connect(g)
    g.connect(saida)
    const tremolo = lfo(ctx, 0.3, 0.2, g.gain)
    return () => { a.stop(); b.stop(); tremolo.stop() }
  },
}

export function criarSomAmbiente() {
  const lacos = new Map() // id → { ctx, ganho, desfazer, fechar }
  let ouvindo = null

  function esperarGesto(ctx) {
    if (ctx.state !== 'suspended' || ouvindo || typeof window === 'undefined') return
    ouvindo = () => { ctx.resume?.() }
    window.addEventListener('pointerdown', ouvindo, { once: true })
  }

  function desfazer(id) {
    const l = lacos.get(id)
    if (!l) return
    clearTimeout(l.fechar)
    try { l.desfazer() } catch { /* fonte já parada */ }
    l.ganho.disconnect()
    lacos.delete(id)
  }

  function ajustar(id, volume) {
    const l = lacos.get(id)
    const t = l.ctx.currentTime
    l.ganho.gain.cancelScheduledValues(t)
    l.ganho.gain.setValueAtTime(l.ganho.gain.value, t)
    l.ganho.gain.linearRampToValueAtTime(volume * NIVEL, t + RAMPA)
  }

  function atualizar(volumes) {
    try {
      for (const id of Object.keys(RECEITAS)) {
        const v = Math.min(1, Math.max(0, Number(volumes?.[id]) || 0))
        let l = lacos.get(id)
        if (v > 0) {
          if (!l) {
            const ctx = getAudioContext()
            esperarGesto(ctx)
            const ganho = ctx.createGain()
            ganho.gain.value = 0
            ganho.connect(ctx.destination)
            l = { ctx, ganho, desfazer: RECEITAS[id](ctx, ganho), fechar: 0 }
            lacos.set(id, l)
          }
          clearTimeout(l.fechar)
          l.fechar = 0
          ajustar(id, v)
        } else if (l && !l.fechar) {
          ajustar(id, 0)
          l.fechar = setTimeout(() => desfazer(id), RAMPA * 1000 + 50)
        }
      }
    } catch { /* sem áudio neste navegador: cena muda */ }
  }

  function parar() {
    for (const id of [...lacos.keys()]) desfazer(id)
    if (ouvindo && typeof window !== 'undefined') window.removeEventListener('pointerdown', ouvindo)
    ouvindo = null
  }

  return { atualizar, parar, trovao: volume => tocarPresetAcao('trovao', { ativo: true, volume }) }
}
