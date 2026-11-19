import { encaixar } from './mapaEngine'

/**
 * Fase 63 — paredes, portas e linha de visão (puro, sem React).
 * Formato: { ativa, segmentos: [{ id, x1, y1, x2, y2, porta, aberta }] }, px do mapa.
 */
export const MAX_SEGMENTOS = 300
export const PAREDES_VAZIAS = { ativa: false, segmentos: [] }

const MIN_COMPRIMENTO = 8
const LIMITE_COORD = 100000
const EPS = 1e-4

const novoId = () => Math.random().toString(36).slice(2, 10).padEnd(8, '0')
const coord = v => (Number.isFinite(v) ? Math.max(-LIMITE_COORD, Math.min(LIMITE_COORD, Math.round(v))) : null)

/** JSON do banco é dado não confiável: descarta o inválido e corta no máximo. */
export function normalizarParedes(json) {
  const lista = Array.isArray(json?.segmentos) ? json.segmentos : []
  const usados = new Set()
  const segmentos = []
  for (const s of lista) {
    if (segmentos.length >= MAX_SEGMENTOS) break
    if (!s || typeof s !== 'object') continue
    const [x1, y1, x2, y2] = [coord(s.x1), coord(s.y1), coord(s.x2), coord(s.y2)]
    if ([x1, y1, x2, y2].some(v => v === null) || (x1 === x2 && y1 === y2)) continue
    let id = typeof s.id === 'string' && s.id && s.id.length <= 16 ? s.id : novoId()
    while (usados.has(id)) id = novoId()
    usados.add(id)
    const porta = s.porta === true
    segmentos.push({ id, x1, y1, x2, y2, porta, aberta: porta && s.aberta === true })
  }
  return { ativa: json?.ativa === true, segmentos }
}

export function adicionarSegmento(paredes, { x1, y1, x2, y2, porta }) {
  const p = normalizarParedes(paredes)
  if (Math.hypot(x2 - x1, y2 - y1) < MIN_COMPRIMENTO || p.segmentos.length >= MAX_SEGMENTOS) return p
  return normalizarParedes({ ...p, segmentos: [...p.segmentos, { id: novoId(), x1, y1, x2, y2, porta: !!porta, aberta: false }] })
}

export const removerSegmento = (paredes, id) => {
  const p = normalizarParedes(paredes)
  return { ...p, segmentos: p.segmentos.filter(s => s.id !== id) }
}

export const alternarPorta = (paredes, id) => {
  const p = normalizarParedes(paredes)
  return { ...p, segmentos: p.segmentos.map(s => (s.id === id && s.porta ? { ...s, aberta: !s.aberta } : s)) }
}

export const definirVisaoAtiva = (paredes, ligada) => ({ ...normalizarParedes(paredes), ativa: !!ligada })

export const limparParedes = paredes => ({ ...normalizarParedes(paredes), segmentos: [] })

/** Segmentos que bloqueiam: paredes e portas fechadas. */
export const bloqueios = paredes => normalizarParedes(paredes).segmentos.filter(s => !(s.porta && s.aberta))

const cruz = (ax, ay, bx, by) => ax * by - ay * bx

/** Distância t (na direção d, não normalizada) até o segmento s, ou null. */
function cruzamento(o, d, s) {
  const sx = s.x2 - s.x1
  const sy = s.y2 - s.y1
  const den = cruz(d.x, d.y, sx, sy)
  if (Math.abs(den) < 1e-12) return null
  const px = s.x1 - o.x
  const py = s.y1 - o.y
  const t = cruz(px, py, sx, sy) / den
  const u = cruz(px, py, d.x, d.y) / den
  return t > 0 && u >= -1e-9 && u <= 1 + 1e-9 ? t : null
}

/**
 * Polígono do que se vê a partir de `origem`: raios para as pontas dos segmentos
 * (com desvio para cada lado) e cantos do mapa; a borda do mapa é parede.
 * ponytail: O(pontas × segmentos), até ~550 mil testes por origem com 300 segmentos; sem quadtree.
 */
export function poligonoVisivel(origem, segmentos, { largura, altura }) {
  const o = { x: Math.min(Math.max(origem.x, 0), largura), y: Math.min(Math.max(origem.y, 0), altura) }
  const borda = [
    { x1: 0, y1: 0, x2: largura, y2: 0 }, { x1: largura, y1: 0, x2: largura, y2: altura },
    { x1: largura, y1: altura, x2: 0, y2: altura }, { x1: 0, y1: altura, x2: 0, y2: 0 },
  ]
  const todos = [...segmentos, ...borda]
  const pontas = [[0, 0], [largura, 0], [largura, altura], [0, altura], ...segmentos.flatMap(s => [[s.x1, s.y1], [s.x2, s.y2]])]
  const angulos = pontas.flatMap(([x, y]) => {
    const a = Math.atan2(y - o.y, x - o.x)
    return [a - EPS, a, a + EPS]
  })
  return angulos
    .map(a => {
      const d = { x: Math.cos(a), y: Math.sin(a) }
      let melhor = Infinity
      for (const s of todos) {
        const t = cruzamento(o, d, s)
        if (t !== null && t < melhor) melhor = t
      }
      return melhor === Infinity ? null : { a, p: [Math.round((o.x + d.x * melhor) * 10) / 10, Math.round((o.y + d.y * melhor) * 10) / 10] }
    })
    .filter(Boolean)
    .sort((m, n) => m.a - n.a)
    .map(r => r.p)
}

/** `true` se o segmento origem–ponto não cruza nenhum bloqueio. */
export function enxerga(origem, ponto, segmentos) {
  const d = { x: ponto.x - origem.x, y: ponto.y - origem.y }
  return !segmentos.some(s => {
    const t = cruzamento(origem, d, s)
    return t !== null && t < 1
  })
}

const distSeg = (p, s) => {
  const sx = s.x2 - s.x1
  const sy = s.y2 - s.y1
  const k = Math.max(0, Math.min(1, ((p.x - s.x1) * sx + (p.y - s.y1) * sy) / (sx * sx + sy * sy || 1)))
  return Math.hypot(p.x - (s.x1 + k * sx), p.y - (s.y1 + k * sy))
}

/** Gruda na ponta de parede mais próxima; senão no canto de célula; senão devolve o ponto. */
export function encaixarPonta(ponto, paredes, grade, tolerancia) {
  let melhor = null
  let dist = tolerancia
  for (const s of normalizarParedes(paredes).segmentos) {
    for (const q of [{ x: s.x1, y: s.y1 }, { x: s.x2, y: s.y2 }]) {
      const dq = Math.hypot(q.x - ponto.x, q.y - ponto.y)
      if (dq <= dist) { melhor = q; dist = dq }
    }
  }
  if (melhor) return melhor
  if (!grade?.ativa) return { x: ponto.x, y: ponto.y }
  const canto = encaixar(ponto, grade, 2) // tamanho par = canto de célula
  return Math.hypot(canto.x - ponto.x, canto.y - ponto.y) <= tolerancia ? canto : { x: ponto.x, y: ponto.y }
}

/** Id do segmento sob o clique (o mais próximo dentro da tolerância), ou null. */
export function segmentoMaisProximo(ponto, paredes, tolerancia) {
  let id = null
  let dist = tolerancia
  for (const s of normalizarParedes(paredes).segmentos) {
    const d = distSeg(ponto, s)
    if (d <= dist) { id = s.id; dist = d }
  }
  return id
}

export const caminhoSvg = pontos => (pontos.length ? `M ${pontos.map(p => `${p[0]} ${p[1]}`).join(' L ')} Z` : '')
