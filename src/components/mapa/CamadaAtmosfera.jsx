import { useEffect, useMemo, useRef } from 'react'
import { TIPOS_ATMOSFERA } from '../../lib/efeitosVocabulario'
import { hexParaRgb, misturar } from '../../lib/ambiente'
import { ehLocal, mover, nascer, opacidade, quantasParticulas, tetoParticulas, volumesDaAtmosfera } from '../../lib/atmosfera'
import { normalizarGrade, pontoRevelado } from '../../lib/mapaEngine'
import { criarSomAmbiente } from '../../audio/somAmbiente'

const FPS = 30
const SOMA_DE_LUZ = ['fogo', 'brasas', 'vagalumes', 'runas']
const acaso = (a, b) => a + Math.random() * (b - a)

function ponto(ctx, x, y, r) {
  ctx.beginPath()
  ctx.arc(x, y, Math.max(0.3, r), 0, Math.PI * 2)
  ctx.fill()
}

/** Uma partícula de `tipo`, já na caixa da região. `a` = opacidade, `cor` = hex do efeito. */
function desenharParticula(ctx, p, tipo, cor, a, intens) {
  ctx.globalAlpha = a
  ctx.fillStyle = cor
  switch (tipo) {
    case 'fogo': {
      // Labareda = mancha macia que se soma às vizinhas (bolinha de borda dura parece confete)
      const k = p.t / p.vida
      const [r, g, b] = hexParaRgb(k < 0.5 ? misturar('#FFE066', cor, k * 2) : misturar(cor, '#5A0A0A', (k - 0.5) * 2)) || [255, 122, 26]
      const raio = p.tam * (1.5 - k * 0.6)
      const gr = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, raio)
      gr.addColorStop(0, `rgba(${r},${g},${b},0.9)`)
      gr.addColorStop(0.4, `rgba(${r},${g},${b},0.35)`)
      gr.addColorStop(1, `rgba(${r},${g},${b},0)`)
      ctx.fillStyle = gr
      ctx.fillRect(p.x - raio, p.y - raio, raio * 2, raio * 2)
      break
    }
    case 'brasas': ponto(ctx, p.x, p.y, p.tam * 1.6); break
    case 'neve': ponto(ctx, p.x, p.y, p.tam); break
    case 'cinzas': ponto(ctx, p.x, p.y, p.tam); break
    case 'vagalumes':
      ponto(ctx, p.x, p.y, p.tam)
      ctx.globalAlpha = a * 0.3
      ponto(ctx, p.x, p.y, p.tam * 3.5)
      break
    case 'runas':
      if (p.tam <= 6) { ponto(ctx, p.x, p.y, p.tam); break }
      ctx.save() // três traços num círculo, como no fundo do site
      ctx.translate(p.x, p.y)
      ctx.rotate(p.fase)
      ctx.globalAlpha = a * 0.5
      ctx.strokeStyle = cor
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(0, 0, p.tam, 0, Math.PI * 2)
      ctx.moveTo(0, -p.tam * 0.7); ctx.lineTo(0, p.tam * 0.7)
      ctx.moveTo(-p.tam * 0.5, -p.tam * 0.2); ctx.lineTo(p.tam * 0.45, p.tam * 0.35)
      ctx.stroke()
      ctx.restore()
      break
    case 'chuva':
      ctx.strokeStyle = cor
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(p.x, p.y)
      ctx.lineTo(p.x + (p.vx / p.vy) * p.tam, p.y - p.tam)
      ctx.stroke()
      break
    case 'areia': ctx.fillRect(p.x, p.y, p.tam * 2, p.tam * 0.7); break
    case 'bolhas':
      ctx.strokeStyle = cor
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.tam, 0, Math.PI * 2)
      ctx.stroke()
      break
    case 'neblina': {
      const [r, g, b] = hexParaRgb(cor) || [255, 255, 255]
      const gr = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.tam)
      gr.addColorStop(0, `rgb(${r},${g},${b})`)
      gr.addColorStop(1, `rgba(${r},${g},${b},0)`)
      ctx.globalAlpha = a * intens
      ctx.fillStyle = gr
      ctx.fillRect(p.x - p.tam, p.y - p.tam, p.tam * 2, p.tam * 2)
      break
    }
    default: break
  }
}

/**
 * Fase 57 — partículas de clima e ambiente sobre o mapa (HTML, na `sobreposicao` do MapaVisor).
 * Efeitos de cena inteira são simulados em px da tela; os locais, em px do mapa e desenhados com
 * a transformação da `vista`. 30 quadros/s, pausa com a aba oculta, corta pela metade e depois
 * desliga se a máquina sofrer. Também cuida do som ambiente da cena.
 * `grade` (extra, opcional): converte o raio dos efeitos locais (unidades da grade) em px.
 */
export default function CamadaAtmosfera({ atmosfera, vista, nevoa, verTudo, densidade = 1, somVolume = 1, grade }) {
  const canvasRef = useRef(null)
  const vivo = useRef({})
  const somRef = useRef(null)
  const ligado = densidade > 0 && atmosfera.efeitos.length > 0

  useEffect(() => { vivo.current = { atmosfera, vista, nevoa, verTudo, densidade, somVolume, grade } })

  useEffect(() => {
    if (!ligado) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return

    const grupos = new Map() // id do efeito → { chave, parts, regiao }
    const raios = new Map()  // id do relâmpago → { proximo, inicio }
    const timers = new Set()
    let w = 0, h = 0, dpr = 1, escala = 1
    let quadro = 0, ultimo = 0, lento = 0, desligado = false

    function medir() {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = canvas.clientWidth; h = canvas.clientHeight
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr)
    }

    function trovao(intens) {
      const { atmosfera: atm, somVolume: sv } = vivo.current
      if (atm.som === false || !(sv > 0)) return
      const t = setTimeout(() => { timers.delete(t); somRef.current?.trovao(Math.min(1, intens * sv)) }, acaso(300, 1500))
      timers.add(t)
    }

    function clarao(agora, e) {
      let st = raios.get(e.id)
      if (!st) { st = { proximo: agora + 1000 * acaso(2, 8), inicio: -1e9 }; raios.set(e.id, st) }
      if (agora >= st.proximo) {
        st.inicio = agora
        st.proximo = agora + (1000 * acaso(4, 14)) / (0.5 + e.intensidade)
        trovao(e.intensidade)
      }
      const d = agora - st.inicio
      const pulso = (a, b) => (d >= a && d < b ? 1 - Math.abs((d - a) / (b - a) - 0.5) * 2 : 0)
      const alfa = 0.35 * (0.4 + 0.6 * e.intensidade) * Math.max(pulso(0, 80), pulso(110, 200))
      if (alfa <= 0.005) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.globalAlpha = alfa
      ctx.fillStyle = e.cor || TIPOS_ATMOSFERA.relampago.cor
      ctx.fillRect(0, 0, w, h)
    }

    function desenhar(agora) {
      quadro = requestAnimationFrame(desenhar)
      const dtMs = agora - ultimo
      if (dtMs < 1000 / FPS - 2) return
      ultimo = agora
      const dt = Math.min(dtMs / 1000, 0.1)

      lento = dtMs > 60 ? lento + 1 : Math.max(0, lento - 1)
      if (lento > 90) {
        if (escala > 0.5) { escala = 0.5; lento = 0 }
        else { desligado = true; cancelAnimationFrame(quadro); ctx.clearRect(0, 0, canvas.width, canvas.height); return }
      }

      const { atmosfera: atm, vista: v, nevoa: nv, verTudo: tudo, densidade: dens, grade: gr } = vivo.current
      const g = normalizarGrade(gr)
      const pxPorUnidade = g.tamanho / (g.unidade > 0 ? g.unidade : 1)
      const visiveis = atm.efeitos.filter(e => !ehLocal(e) || tudo || pontoRevelado(nv, { x: e.x, y: e.y }))

      // quanto cada efeito pede, com o teto global repartido
      const planos = visiveis.map(e => {
        const local = ehLocal(e)
        const r = local ? e.raio * pxPorUnidade : 0
        const regiao = local ? { cx: e.x, cy: e.y, r } : { x: 0, y: 0, w, h }
        const area = local ? Math.PI * r * r : w * h
        return { e, regiao, chave: `${e.tipo}|${local ? Math.round(r) : `${w}x${h}`}`, pedido: quantasParticulas(e.tipo, e.intensidade, area, dens) * escala }
      })
      const total = planos.reduce((s, p) => s + p.pedido, 0)
      const fator = total > tetoParticulas(dens) * escala ? (tetoParticulas(dens) * escala) / total : 1
      const vistos = new Set(planos.map(p => p.e.id))
      for (const id of grupos.keys()) if (!vistos.has(id)) grupos.delete(id)

      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      for (const { e, regiao, chave, pedido } of planos) {
        if (e.tipo === 'relampago') { clarao(agora, e); continue }
        let gp = grupos.get(e.id)
        if (!gp || gp.chave !== chave) { gp = { chave, parts: [] }; grupos.set(e.id, gp) }
        const n = Math.floor(pedido * fator)
        while (gp.parts.length < n) gp.parts.push(nascer(e.tipo, regiao, Math.random, true))
        gp.parts.length = n

        const cor = e.cor || TIPOS_ATMOSFERA[e.tipo].cor
        const local = regiao.r !== undefined
        ctx.save()
        if (local) {
          ctx.setTransform(dpr * v.zoom, 0, 0, dpr * v.zoom, v.x * dpr, v.y * dpr)
          ctx.translate(regiao.cx - regiao.r, regiao.cy - regiao.r)
          ctx.beginPath()
          ctx.arc(regiao.r, regiao.r, regiao.r, 0, Math.PI * 2)
          ctx.clip()
        } else ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        ctx.globalCompositeOperation = SOMA_DE_LUZ.includes(e.tipo) ? 'lighter' : 'source-over'
        if (e.tipo === 'areia') { // véu leve da cor do efeito
          ctx.globalAlpha = 0.06 * e.intensidade
          ctx.fillStyle = cor
          ctx.fillRect(0, 0, local ? regiao.r * 2 : w, local ? regiao.r * 2 : h)
        }
        for (let i = 0; i < gp.parts.length; i++) {
          const p = gp.parts[i]
          if (!mover(p, e.tipo, dt, regiao)) { gp.parts[i] = nascer(e.tipo, regiao, Math.random); continue }
          const a = opacidade(p, e.tipo, regiao)
          if (a > 0.01) desenharParticula(ctx, p, e.tipo, cor, a, e.intensidade)
        }
        ctx.restore()
      }
      ctx.globalAlpha = 1
    }

    function iniciar() { if (!desligado) { cancelAnimationFrame(quadro); ultimo = performance.now(); quadro = requestAnimationFrame(desenhar) } }
    const visibilidade = () => (document.hidden ? cancelAnimationFrame(quadro) : iniciar())

    medir()
    iniciar()
    const obs = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(medir) : null
    obs?.observe(canvas)
    document.addEventListener('visibilitychange', visibilidade)
    return () => {
      cancelAnimationFrame(quadro)
      obs?.disconnect()
      timers.forEach(clearTimeout)
      document.removeEventListener('visibilitychange', visibilidade)
    }
  }, [ligado])

  // som: laços da atmosfera × volume do navegador (somVolume 0 = mudo)
  const volumes = useMemo(() => volumesDaAtmosfera(atmosfera), [atmosfera])
  useEffect(() => {
    somRef.current = criarSomAmbiente()
    return () => { somRef.current.parar(); somRef.current = null }
  }, [])
  useEffect(() => {
    const v = {}
    for (const [id, vol] of Object.entries(volumes)) v[id] = vol * (somVolume || 0)
    somRef.current?.atualizar(v)
  }, [volumes, somVolume])

  if (!ligado) return null
  return <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }} />
}
