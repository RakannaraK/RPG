import { useEffect, useRef } from 'react'
import { tocarPresetAcao } from '../../audio/actionSynth'
import { DURACAO_MS, ATRASO_ALVO_MS } from '../../lib/vfx'

const TAU = Math.PI * 2
const lim01 = v => Math.min(1, Math.max(0, v))
const saida = u => 1 - (1 - u) * (1 - u)
const lerp = (a, b, k) => a + (b - a) * k
/** Sorteio estável por (semente): faíscas não piscam entre quadros. */
const rnd = n => { const s = Math.sin(n * 12.9898) * 43758.5453; return s - Math.floor(s) }

function brilho(ctx, x, y, r, cor, a) {
  if (r <= 0 || a <= 0) return
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, cor)
  g.addColorStop(1, 'transparent')
  ctx.globalAlpha = lim01(a)
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(x, y, r, 0, TAU)
  ctx.fill()
}
function anel(ctx, x, y, r, cor, larg, a) {
  if (r <= 0 || a <= 0) return
  ctx.globalAlpha = lim01(a)
  ctx.strokeStyle = cor
  ctx.lineWidth = larg
  ctx.beginPath()
  ctx.arc(x, y, r, 0, TAU)
  ctx.stroke()
}
function faiscas(ctx, x, y, n, alcance, u, cor, z, semente) {
  for (let i = 0; i < n; i++) {
    const ang = rnd(semente + i) * TAU
    const d = alcance * (0.4 + 0.6 * rnd(semente + i + 99)) * saida(u)
    brilho(ctx, x + Math.cos(ang) * d, y + Math.sin(ang) * d, 3.5 * z, cor, 1 - u)
  }
}

/** Um alvo de um efeito. `t` = ms desde que ESTE alvo começou; `o` = origem; `p` = alvo (já em px da tela). */
function desenharForma(ctx, forma, [c1, c2], t, o, p, z, R, semente) {
  const u = lim01(t / DURACAO_MS[forma])
  if (forma === 'projetil') {
    const voo = 450
    if (t < voo) {
      const k = saida(t / voo)
      for (let j = 6; j >= 1; j--) {
        const kk = Math.max(0, k - j * 0.035)
        brilho(ctx, lerp(o.x, p.x, kk), lerp(o.y, p.y, kk), (9 - j) * z, c2, 0.5)
      }
      brilho(ctx, lerp(o.x, p.x, k), lerp(o.y, p.y, k), 13 * z, c1, 1)
    } else {
      const v = (t - voo) / 350
      anel(ctx, p.x, p.y, (6 + 30 * saida(v)) * z, c1, 3 * z, 1 - v)
      faiscas(ctx, p.x, p.y, 14, 34 * z, v, c2, z, semente)
    }
  } else if (forma === 'explosao') {
    brilho(ctx, p.x, p.y, R * 0.7, c1, 1 - u * 3)
    brilho(ctx, p.x, p.y, R * Math.max(0.1, saida(u)), c2, 0.35 * (1 - u))
    anel(ctx, p.x, p.y, R * saida(u), c1, 5 * z, 1 - u)
    faiscas(ctx, p.x, p.y, 30, R, u, c2, z, semente)
  } else if (forma === 'raio') {
    // 3 lampejos de 60 ms dentro de 280 ms; a linha é refeita a cada quadro
    if (t % 100 > 60) return
    const n = 10, dx = p.x - o.x, dy = p.y - o.y, len = Math.hypot(dx, dy) || 1
    const nx = -dy / len, ny = dx / len
    ctx.beginPath()
    ctx.moveTo(o.x, o.y)
    for (let i = 1; i < n; i++) {
      const j = (Math.random() - 0.5) * 24 * z
      ctx.lineTo(o.x + (dx * i) / n + nx * j, o.y + (dy * i) / n + ny * j)
    }
    ctx.lineTo(p.x, p.y)
    ctx.lineJoin = 'round'
    ctx.globalAlpha = 0.9; ctx.strokeStyle = c1; ctx.lineWidth = 5 * z; ctx.stroke()
    ctx.globalAlpha = 1; ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1.8 * z; ctx.stroke()
    brilho(ctx, p.x, p.y, 20 * z, c2, 0.8)
  } else if (forma === 'cura') {
    anel(ctx, p.x, p.y + (14 - 56 * u) * z, 22 * z, c1, 3 * z, 1 - u)
    for (let i = 0; i < 16; i++) {
      const v = lim01((u - rnd(semente + i) * 0.4) / 0.6)
      if (v <= 0) continue
      brilho(ctx, p.x + (rnd(semente + i + 50) - 0.5) * 44 * z, p.y + (20 - (30 + rnd(semente + i + 70) * 40) * v) * z, 4 * z, i % 2 ? c2 : c1, 1 - v)
    }
  } else if (forma === 'corte') {
    const ini = -Math.PI / 4 - 1.05, varre = 2.1, k = lim01(t / 180)
    const fade = t > 180 ? 1 - (t - 180) / 120 : 1
    ctx.lineCap = 'round'
    ctx.globalAlpha = 0.6 * fade; ctx.strokeStyle = c2; ctx.lineWidth = 7 * z
    ctx.beginPath(); ctx.arc(p.x, p.y, 26 * z, ini, ini + varre * k); ctx.stroke()
    ctx.globalAlpha = fade; ctx.strokeStyle = c1; ctx.lineWidth = 3 * z
    ctx.beginPath(); ctx.arc(p.x, p.y, 26 * z, ini + varre * Math.max(0, k - 0.35), ini + varre * k); ctx.stroke()
  } else if (forma === 'onda') {
    anel(ctx, o.x, o.y, R * saida(u), c1, 5 * z, 1 - u)
    anel(ctx, o.x, o.y, R * 0.75 * saida(u), c2, 2.5 * z, 0.7 * (1 - u))
  }
}

/**
 * Fase 59 — canvas dos efeitos de ação. `ativos` = [{ id, efeito, de, para, raioPx, inicio }] (px do mapa,
 * `inicio` = Date.now()). O laço só roda enquanto houver efeito vivo; `densidade` 0 não desenha (o som toca).
 */
export default function CamadaVfx({ ativos = [], vista, densidade = 1, somAtivo = true, somVolume = 0.6 }) {
  const canvasRef = useRef(null)
  const vistaRef = useRef(vista)
  useEffect(() => { vistaRef.current = vista }, [vista])
  const tocados = useRef(new Set())

  // som: uma vez por efeito que aparece
  useEffect(() => {
    const ids = new Set(ativos.map(a => a.id))
    tocados.current.forEach(id => { if (!ids.has(id)) tocados.current.delete(id) })
    for (const a of ativos) {
      if (tocados.current.has(a.id)) continue
      tocados.current.add(a.id)
      if (a.efeito?.som) tocarPresetAcao(a.efeito.som, { ativo: somAtivo, volume: somVolume })
    }
  }, [ativos, somAtivo, somVolume])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx || !ativos.length || !(densidade > 0)) return
    const fim = a => a.inicio + DURACAO_MS[a.efeito.forma] + ATRASO_ALVO_MS * (a.para.length - 1)
    let quadro = 0
    function desenhar() {
      const agora = Date.now()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = canvas.clientWidth, h = canvas.clientHeight
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr)
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      ctx.globalCompositeOperation = 'lighter'
      const v = vistaRef.current || { x: 0, y: 0, zoom: 1 }
      const tela = q => ({ x: q.x * v.zoom + v.x, y: q.y * v.zoom + v.y })
      let vivo = false
      for (const a of ativos) {
        if (agora >= fim(a)) continue
        vivo = true
        const { forma, cores } = a.efeito
        const semente = [...a.id].reduce((s, c) => s + c.charCodeAt(0), 0)
        a.para.forEach((p, i) => {
          const t = agora - a.inicio - i * ATRASO_ALVO_MS
          if (t < 0 || t > DURACAO_MS[forma]) return
          const o = tela(p.de || a.de || p)
          desenharForma(ctx, forma, cores, t, o, tela(p), v.zoom, (a.raioPx || 100) * v.zoom, semente + i * 7)
        })
      }
      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'
      if (vivo) quadro = requestAnimationFrame(desenhar)
      else ctx.clearRect(0, 0, w, h)
    }
    quadro = requestAnimationFrame(desenhar)
    return () => { cancelAnimationFrame(quadro); ctx.clearRect(0, 0, canvas.width, canvas.height) }
  }, [ativos, densidade])

  return <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 w-full h-full pointer-events-none" />
}
