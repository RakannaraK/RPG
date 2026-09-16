/**
 * Fase 26 — motor PURO da mesa virtual (mapa).
 *
 * Contrato (docs/FASE26_MESA_VIRTUAL.md):
 *  - tudo gravado em PIXELS DA IMAGEM do mapa;
 *  - visão local { x, y, zoom }: tela = mapa × zoom + (x, y) — nunca vai ao banco;
 *  - grade/névoa são JSONB com defaults aplicados aqui (colunas antigas/vazias funcionam).
 */

export const ZOOM_MIN = 0.05
export const ZOOM_MAX = 8

export const GRADE_PADRAO = {
  ativa: true,
  tamanho: 70,
  offset_x: 0,
  offset_y: 0,
  cor: '#ffffff',
  opacidade: 0.25,
  unidade: 1.5,
  unidade_nome: 'm',
  diagonal: 'chebyshev', // 'chebyshev' | 'alternada' (5-10-5) | 'euclidiana'
}

const limitarZoom = z => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z))

export function normalizarGrade(grade) {
  return { ...GRADE_PADRAO, ...(grade || {}) }
}

// ─── Visão (pan/zoom) ────────────────────────────────────────────────────────

export function telaParaMapa(p, vista) {
  return { x: (p.x - vista.x) / vista.zoom, y: (p.y - vista.y) / vista.zoom }
}

export function mapaParaTela(p, vista) {
  return { x: p.x * vista.zoom + vista.x, y: p.y * vista.zoom + vista.y }
}

/** Zoom mantendo fixo o ponto de TELA `p` (roda do mouse). */
export function zoomNoPonto(vista, fator, p) {
  const zoom = limitarZoom(vista.zoom * fator)
  const m = telaParaMapa(p, vista)
  return { zoom, x: p.x - m.x * zoom, y: p.y - m.y * zoom }
}

/**
 * Pinça com dois dedos: o ponto do mapa que estava sob o centro inicial `c0`
 * acompanha o centro atual `c`; o zoom escala pela razão das distâncias.
 */
export function pinca(vista0, c0, d0, c, d) {
  if (!(d0 > 0)) return vista0
  const zoom = limitarZoom(vista0.zoom * (d / d0))
  const m = telaParaMapa(c0, vista0)
  return { zoom, x: c.x - m.x * zoom, y: c.y - m.y * zoom }
}

/** Visão que cabe o mapa inteiro, centralizado, na área `vw × vh`. */
export function enquadrar(largura, altura, vw, vh, margem = 0.95) {
  if (!(largura > 0) || !(altura > 0) || !(vw > 0) || !(vh > 0)) return { x: 0, y: 0, zoom: 1 }
  const zoom = limitarZoom(Math.min(vw / largura, vh / altura) * margem)
  return { zoom, x: (vw - largura * zoom) / 2, y: (vh - altura * zoom) / 2 }
}

// ─── Grade ───────────────────────────────────────────────────────────────────

/**
 * Centro encaixado de um token de `tamanho` células: ímpar → centro da célula,
 * par → cruzamento das linhas. Grade com tamanho inválido não encaixa.
 */
export function encaixar(p, grade, tamanho = 1) {
  const g = normalizarGrade(grade)
  const t = Number(g.tamanho)
  if (!(t > 0)) return { x: p.x, y: p.y }
  const eixo = (v, off) => off + (Math.round((v - off - (tamanho * t) / 2) / t) + tamanho / 2) * t
  return { x: eixo(p.x, Number(g.offset_x) || 0), y: eixo(p.y, Number(g.offset_y) || 0) }
}

export function celula(p, grade) {
  const g = normalizarGrade(grade)
  const t = Number(g.tamanho)
  return {
    i: Math.floor((p.x - (Number(g.offset_x) || 0)) / t),
    j: Math.floor((p.y - (Number(g.offset_y) || 0)) / t),
  }
}

/** Distância em células entre dois pontos do mapa, pela regra de diagonal da grade. */
export function distanciaCelulas(a, b, grade) {
  const g = normalizarGrade(grade)
  if (!(Number(g.tamanho) > 0)) return 0
  const ca = celula(a, g)
  const cb = celula(b, g)
  const di = Math.abs(ca.i - cb.i)
  const dj = Math.abs(ca.j - cb.j)
  if (g.diagonal === 'alternada') return Math.max(di, dj) + Math.floor(Math.min(di, dj) / 2)
  if (g.diagonal === 'euclidiana') return Math.round(Math.sqrt(di * di + dj * dj) * 10) / 10
  return Math.max(di, dj)
}

const fmtNumero = n => String(Math.round(n * 100) / 100).replace('.', ',')

/** Rótulo da régua: "3 quadrados · 4,5 m". */
export function medir(a, b, grade) {
  const g = normalizarGrade(grade)
  const celulas = distanciaCelulas(a, b, g)
  const valor = celulas * (Number(g.unidade) || 0)
  const nome = celulas === 1 ? 'quadrado' : 'quadrados'
  return {
    celulas,
    valor,
    rotulo: `${fmtNumero(celulas)} ${nome} · ${fmtNumero(valor)} ${g.unidade_nome || ''}`.trim(),
  }
}

// ─── Névoa de guerra ─────────────────────────────────────────────────────────

export function normalizarNevoa(nevoa) {
  return { ativa: false, ops: [], ...(nevoa || {}) }
}

/** Retângulo com largura/altura positivas a partir de dois cantos quaisquer. */
export function normalizarRet(a, b) {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    w: Math.abs(a.x - b.x),
    h: Math.abs(a.y - b.y),
  }
}

/**
 * Acrescenta uma operação à névoa (ordem importa). `forma:'tudo'` descarta as
 * anteriores: revelar tudo → [op]; cobrir tudo → [] (vazia = tudo coberto).
 * Operações degeneradas (retângulo sem área, traço sem pontos) são ignoradas.
 */
export function adicionarOpNevoa(nevoa, op) {
  const n = normalizarNevoa(nevoa)
  if (op.forma === 'tudo') return { ...n, ops: op.modo === 'cobrir' ? [] : [op] }
  if (op.forma === 'ret' && (!(op.w > 0) || !(op.h > 0))) return n
  if (op.forma === 'traco' && !(op.pontos?.length > 0)) return n
  return { ...n, ops: [...n.ops, op] }
}
