import { useEffect, useRef } from 'react'
import { usePreferencias } from '../../context/PreferenciasContext'
import { particulasLigadas, TEMAS } from '../../lib/personalizacao'
import { brilho, misturar, mover, nascer, quantasParticulas } from '../../lib/ambiente'

const FPS = 30
const TROCA_MS = 650 // a cor das partículas migra para o tema novo neste tempo

function lerCores() {
  const css = getComputedStyle(document.documentElement)
  return [css.getPropertyValue('--energia-1').trim() || '#A78BFA', css.getPropertyValue('--energia-2').trim() || '#60A5FA']
}
const tipoDoTema = () => {
  const id = document.documentElement.getAttribute('data-tema') || 'violeta'
  return TEMAS.find(t => t.id === id)?.particula || 'runas'
}

/** Runa: três traços simples num círculo (desenho do Dado & Pena, não alfabeto real). */
function desenharRuna(ctx, p, cor, a) {
  ctx.save()
  ctx.translate(p.x, p.y)
  ctx.rotate(p.fase)
  ctx.globalAlpha = a * 0.16
  ctx.strokeStyle = cor
  ctx.lineWidth = 1
  const r = p.tam
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.moveTo(0, -r * 0.7); ctx.lineTo(0, r * 0.7)
  ctx.moveTo(-r * 0.5, -r * 0.2); ctx.lineTo(r * 0.45, r * 0.35)
  ctx.moveTo(-r * 0.45, r * 0.4); ctx.lineTo(r * 0.2, -r * 0.45)
  ctx.stroke()
  ctx.restore()
}

/**
 * Fase 52 — camada de ambientação: partículas do tema atrás do conteúdo.
 * Discreta por desenho: poucas dezenas de pontos, 30 quadros por segundo,
 * pausa com a aba escondida, some com "reduzir movimento" ou efeitos
 * sutis/desligados, e se desliga sozinha se a máquina estiver sofrendo.
 * Nunca recebe clique (pointer-events: none) e não vai para o papel.
 */
export default function EfeitosAmbiente() {
  const { preferencias, reduzido } = usePreferencias()
  const ligado = particulasLigadas(preferencias.efeitos, reduzido)
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!ligado) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return

    const fraco = (navigator.hardwareConcurrency || 8) <= 4
    let w = 0, h = 0, dpr = 1
    let tipo = tipoDoTema()
    let cores = lerCores(), coresDe = cores, coresPara = cores, trocaEm = 0
    let particulas = []
    let quadro = 0, ultimo = 0, lento = 0, desligadoPorPeso = false

    function medir() {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      w = window.innerWidth; h = window.innerHeight
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const sessao = document.documentElement.getAttribute('data-sessao') === 'ao-vivo'
      const n = quantasParticulas(w, h, { sessao, fraco })
      while (particulas.length < n) particulas.push(nascer(tipo, w, h, Math.random, true))
      particulas.length = n
    }

    function desenhar(agora) {
      quadro = requestAnimationFrame(desenhar)
      const dtMs = agora - ultimo
      if (dtMs < 1000 / FPS - 2) return
      ultimo = agora
      const dt = Math.min(dtMs / 1000, 0.1)

      // máquina sofrendo (quadros acima de 60 ms por ~3 s): corta pela metade e depois desliga
      lento = dtMs > 60 ? lento + 1 : Math.max(0, lento - 1)
      if (lento > 90) {
        if (particulas.length > 8) { particulas.length = Math.floor(particulas.length / 2); lento = 0 }
        else { desligadoPorPeso = true; cancelAnimationFrame(quadro); ctx.clearRect(0, 0, w, h); return }
      }

      // troca de tema: a cor das partículas migra devagar
      if (trocaEm) {
        const t = Math.min(1, (agora - trocaEm) / TROCA_MS)
        cores = [misturar(coresDe[0], coresPara[0], t), misturar(coresDe[1], coresPara[1], t)]
        if (t >= 1) trocaEm = 0
      }

      ctx.clearRect(0, 0, w, h)
      ctx.globalCompositeOperation = 'lighter'
      for (let i = 0; i < particulas.length; i++) {
        const p = particulas[i]
        if (!mover(p, tipo, dt, w, h)) { particulas[i] = nascer(tipo, w, h); continue }
        const a = brilho(p, tipo, h)
        if (a <= 0.01) continue
        const cor = cores[p.cor]
        if (tipo === 'runas' && p.tam > 6) { desenharRuna(ctx, p, cor, a); continue }
        const raio = p.tam * (tipo === 'brasas' ? 3.2 : 2.6)
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, raio)
        g.addColorStop(0, cor)
        g.addColorStop(1, 'transparent')
        ctx.globalAlpha = a * (tipo === 'neve' ? 0.45 : 0.6)
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(p.x, p.y, raio, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'
    }

    function iniciar() { if (!desligadoPorPeso) { cancelAnimationFrame(quadro); ultimo = performance.now(); quadro = requestAnimationFrame(desenhar) } }
    function parar() { cancelAnimationFrame(quadro) }
    const visibilidade = () => (document.hidden ? parar() : iniciar())

    // o tema (ou a sessão) mudou: novas partículas para o tipo novo, cor migrando
    const obs = new MutationObserver(() => {
      const novoTipo = tipoDoTema()
      coresDe = cores; coresPara = lerCores(); trocaEm = performance.now()
      if (novoTipo !== tipo) {
        tipo = novoTipo
        particulas = particulas.map(() => nascer(tipo, w, h, Math.random, true))
        particulas.forEach(p => { p.t = 0 }) // nascem apagadas e acendem
      }
      medir()
    })
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-tema', 'data-sessao'] })

    let tRedim = 0
    const redimensionar = () => { clearTimeout(tRedim); tRedim = setTimeout(medir, 150) }

    medir()
    iniciar()
    window.addEventListener('resize', redimensionar)
    document.addEventListener('visibilitychange', visibilidade)
    return () => {
      parar()
      obs.disconnect()
      clearTimeout(tRedim)
      window.removeEventListener('resize', redimensionar)
      document.removeEventListener('visibilitychange', visibilidade)
    }
  }, [ligado])

  if (!ligado) return null
  return <canvas ref={canvasRef} className="efeitos-ambiente" aria-hidden="true" />
}

/**
 * Chama arcana: a própria energia da borda virando pequenas chamas, na cor do
 * tema. Fica DENTRO de um elemento `relative` (encosta na borda de baixo) e
 * nunca passa por cima do texto — é pintada atrás (z-index 0) e com opacidade baixa.
 */
export function ChamaArcana({ className = '' }) {
  return (
    <span aria-hidden="true" className={`chama-arcana ${className}`}>
      <i className="c1" /><i className="c2" />
    </span>
  )
}
