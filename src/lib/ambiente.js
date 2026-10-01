/**
 * Fase 52 — física das partículas do fundo (puro, sem DOM). Cada tema tem um
 * comportamento: brasas sobem e morrem, faíscas sobem rápido e piscam, neve
 * desce devagar, éter flutua sem rumo, runas giram paradas. O componente
 * (EfeitosAmbiente) só desenha o que estas funções calculam.
 */

/** Quantas partículas cabem na tela: pouca coisa, e menos em telas pequenas. */
export function quantasParticulas(largura, altura, { sessao = false, fraco = false } = {}) {
  const base = Math.min(34, Math.max(10, Math.round((largura * altura) / 45000)))
  const n = Math.round(base * (sessao ? 1.6 : 1) * (fraco ? 0.6 : 1))
  return Math.min(56, n)
}

const acaso = (min, max, r = Math.random) => min + r() * (max - min)

/** Nasce uma partícula do tipo, num lugar que faz sentido para ele. */
export function nascer(tipo, w, h, r = Math.random, espalhada = false) {
  const p = { x: acaso(0, w, r), y: 0, vx: 0, vy: 0, t: 0, vida: 1, tam: 1, fase: acaso(0, Math.PI * 2, r), cor: r() < 0.65 ? 0 : 1, giro: 0 }
  switch (tipo) {
    case 'brasas':
      p.y = espalhada ? acaso(h * 0.3, h, r) : h + acaso(0, 30, r)
      p.vy = -acaso(14, 34, r); p.vx = acaso(-6, 6, r)
      p.tam = acaso(0.8, 2.2, r); p.vida = acaso(5, 10, r)
      break
    case 'faiscas':
      p.y = espalhada ? acaso(h * 0.2, h, r) : h + acaso(0, 20, r)
      p.vy = -acaso(30, 60, r); p.vx = acaso(-12, 12, r)
      p.tam = acaso(0.6, 1.5, r); p.vida = acaso(2.5, 5, r)
      break
    case 'neve':
      p.y = espalhada ? acaso(0, h, r) : -acaso(0, 30, r)
      p.vy = acaso(6, 16, r); p.vx = acaso(-4, 4, r)
      p.tam = acaso(0.8, 2.4, r); p.vida = Infinity
      break
    case 'runas':
      p.y = acaso(0, h, r)
      p.vy = -acaso(1, 4, r); p.vx = acaso(-2, 2, r)
      p.tam = r() < 0.12 ? acaso(7, 11, r) : acaso(0.8, 1.8, r) // runas raras, o resto poeira arcana
      p.giro = acaso(-0.15, 0.15, r); p.vida = acaso(10, 20, r)
      break
    default: // éter
      p.y = acaso(0, h, r)
      p.vy = acaso(-5, 5, r); p.vx = acaso(-5, 5, r)
      p.tam = acaso(1, 2.6, r); p.vida = acaso(8, 16, r)
  }
  return p
}

/** Avança `dt` segundos. Devolve false quando a partícula deve renascer. */
export function mover(p, tipo, dt, w, h) {
  p.t += dt
  const balanco = Math.sin(p.t * 0.9 + p.fase)
  p.x += (p.vx + balanco * (tipo === 'neve' ? 8 : 5)) * dt
  p.y += p.vy * dt
  if (tipo === 'runas') p.fase += p.giro * dt
  if (p.t > p.vida) return false
  if (tipo === 'neve') return p.y < h + 20
  if (tipo === 'brasas' || tipo === 'faiscas') return p.y > -20
  return p.x > -30 && p.x < w + 30 && p.y > -30 && p.y < h + 30
}

/** Opacidade de 0 a 1 ao longo da vida: acende, segura, apaga. Brasas morrem antes do topo. */
export function brilho(p, tipo, h) {
  const nasce = Math.min(1, p.t / 1.2)
  const morre = Number.isFinite(p.vida) ? Math.min(1, Math.max(0, (p.vida - p.t) / 1.5)) : 1
  let a = nasce * morre
  if (tipo === 'brasas') a *= Math.min(1, Math.max(0, (p.y / h) * 1.6)) // somem subindo
  if (tipo === 'faiscas' || tipo === 'eter') a *= 0.55 + 0.45 * Math.sin(p.t * (tipo === 'faiscas' ? 9 : 2) + p.fase)
  return Math.max(0, Math.min(1, a))
}

/** Mistura duas cores hex (#rrggbb) — para a troca de tema não "pular". */
export function misturar(a, b, t) {
  const pa = hexParaRgb(a), pb = hexParaRgb(b)
  if (!pa || !pb) return b || a
  const m = pa.map((v, i) => Math.round(v + (pb[i] - v) * t))
  return `#${m.map(v => v.toString(16).padStart(2, '0')).join('')}`
}

export function hexParaRgb(hex) {
  const m = String(hex || '').trim().match(/^#?([0-9a-f]{6})$/i)
  if (!m) return null
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
