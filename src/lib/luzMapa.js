import { TIPOS_ATMOSFERA, corValida, limitar } from './efeitosVocabulario'
import { normalizarGrade } from './mapaEngine'

const objeto = v => (v && typeof v === 'object' && !Array.isArray(v) ? v : null)
const num = v => typeof v === 'number' && Number.isFinite(v)

/** Luz carregada por um token: { raio, cor, tremula } ou null. */
export function normalizarLuzToken(raw) {
  const o = objeto(raw)
  if (!o) return null
  return { raio: limitar(o.raio, 0.5, 60, 6), cor: corValida(o.cor) ? o.cor : '#FFE9B8', tremula: o.tremula === true }
}

/** Aura de um token: { raio, cor } ou null. */
export function normalizarAura(raw) {
  const o = objeto(raw)
  if (!o) return null
  return { raio: limitar(o.raio, 0.5, 60, 1), cor: corValida(o.cor) ? o.cor : '#7FA6FF' }
}

export const LUZES_TOKEN = [
  { id: 'tocha', nome: 'Tocha', raio: 6, cor: '#FFB25E', tremula: true },
  { id: 'lanterna', nome: 'Lanterna', raio: 9, cor: '#FFE9B8', tremula: false },
  { id: 'magia', nome: 'Magia', raio: 6, cor: '#7FA6FF', tremula: false },
  { id: 'brasa', nome: 'Brasa', raio: 3, cor: '#FF5468', tremula: true },
]

/** Unidades da grade → px do mapa. */
export function raioParaPx(raio, grade) {
  const g = normalizarGrade(grade)
  const un = Number(g.unidade) > 0 ? Number(g.unidade) : 1
  return (Number(raio) / un) * (Number(g.tamanho) > 0 ? Number(g.tamanho) : 70)
}

/** Fontes fixas + luz de tokens + efeitos LOCAIS que iluminam. Aguenta atmosfera incompleta. */
export function fontesDeLuz({ atmosfera, tokens, grade }) {
  const px = r => raioParaPx(r, grade)
  const fixas = (atmosfera?.luz?.fontes || []).filter(f => num(f?.x) && num(f?.y) && num(f?.raio)).map(f => ({
    id: `fonte-${f.id}`, x: f.x, y: f.y, raioPx: px(f.raio), cor: corValida(f.cor) ? f.cor : '#FFC27A', tremula: f.tremula === true,
  }))
  const deTokens = (tokens || []).flatMap(t => {
    const l = normalizarLuzToken(t?.luz)
    return l && num(t.x) && num(t.y) ? [{ id: `token-${t.id}`, x: t.x, y: t.y, raioPx: px(l.raio), cor: l.cor, tremula: l.tremula }] : []
  })
  const deEfeitos = (atmosfera?.efeitos || []).flatMap(e => {
    const tipo = TIPOS_ATMOSFERA[e?.tipo]
    if (!tipo?.luz || !num(e.x) || !num(e.y) || !num(e.raio)) return []
    return [{ id: `efeito-${e.id}`, x: e.x, y: e.y, raioPx: px(e.raio * 1.5), cor: corValida(e.cor) ? e.cor : tipo.cor, tremula: true }]
  })
  return [...fixas, ...deTokens, ...deEfeitos]
}
