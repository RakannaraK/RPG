let _ctx = null

function getCtx() {
  if (!_ctx || _ctx.state === 'closed') {
    _ctx = new (window.AudioContext || window.webkitAudioContext)()
  }
  if (_ctx.state === 'suspended') _ctx.resume()
  return _ctx
}

function noise(ctx, duration, volume = 0.4) {
  const samples = Math.floor(ctx.sampleRate * duration)
  const buf = ctx.createBuffer(1, samples, ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < samples; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / samples) * volume
  }
  const src = ctx.createBufferSource()
  src.buffer = buf
  return src
}

// Toca o som de rolagem de dados (impactos + thud final)
export function playDiceRoll() {
  try {
    const ctx = getCtx()
    const now = ctx.currentTime

    // 3–4 impactos em sequência
    const hits = 3 + Math.floor(Math.random() * 2)
    for (let i = 0; i < hits; i++) {
      const t = now + i * 0.11 + Math.random() * 0.03
      const src = noise(ctx, 0.06, 0.35)
      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(1, t + 0.005)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.055)
      src.connect(gain)
      gain.connect(ctx.destination)
      src.start(t)
    }

    // Thud final (tom grave)
    const thudT = now + hits * 0.11
    const osc = ctx.createOscillator()
    const oscGain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(120, thudT)
    osc.frequency.exponentialRampToValueAtTime(40, thudT + 0.12)
    oscGain.gain.setValueAtTime(0.5, thudT)
    oscGain.gain.exponentialRampToValueAtTime(0.001, thudT + 0.15)
    osc.connect(oscGain)
    oscGain.connect(ctx.destination)
    osc.start(thudT)
    osc.stop(thudT + 0.15)
  } catch {
    // Silencia se o áudio não for suportado ou estiver bloqueado
  }
}

// Som mais suave para rolagem de outro jogador no feed
export function playDiceNotify() {
  try {
    const ctx = getCtx()
    const now = ctx.currentTime

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, now)
    osc.frequency.exponentialRampToValueAtTime(660, now + 0.08)
    gain.gain.setValueAtTime(0.15, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.2)
  } catch {
    // Silencia se o áudio não for suportado
  }
}
