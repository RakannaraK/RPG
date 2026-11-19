/**
 * Fase 64 — cinemática (puro, sem DOM). Tudo que vem do banco ou de
 * `cinematica_ao_vivo` é dado não confiável e passa por `normalizarQuadro`.
 */
import { SONS_AMBIENTE } from './efeitosVocabulario'
import { t } from '../i18n'

export const LIMITES_CINEMATICA = { quadros: 12, titulo: 80, texto: 600, url: 500 }

const texto = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '')

/** Quadro válido ou null (lixo). `segundos`: 0 = manual, senão 3 a 120. */
export function normalizarQuadro(json) {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return null
  const url = typeof json.imagem_url === 'string' ? json.imagem_url.trim() : ''
  const s = Math.round(Number(json.segundos))
  return {
    id: texto(json.id, 64) || crypto.randomUUID(),
    imagem_url: url.startsWith('https://') ? url.slice(0, LIMITES_CINEMATICA.url) : '',
    titulo: texto(json.titulo, LIMITES_CINEMATICA.titulo),
    texto: texto(json.texto, LIMITES_CINEMATICA.texto),
    som: typeof json.som === 'string' && Object.hasOwn(SONS_AMBIENTE, json.som) ? json.som : null,
    segundos: Number.isFinite(s) && s >= 3 ? Math.min(s, 120) : 0,
  }
}

export function normalizarQuadros(json) {
  if (!Array.isArray(json)) return []
  return json.slice(0, LIMITES_CINEMATICA.quadros).map(normalizarQuadro).filter(Boolean)
}

export const novoQuadro = () => ({ id: crypto.randomUUID(), imagem_url: '', titulo: '', texto: '', som: null, segundos: 0 })

/** Sobe (-1) ou desce (+1) o quadro; devolve nova lista (a mesma se não der). */
export function moverQuadro(quadros, id, direcao) {
  const i = quadros.findIndex(q => q.id === id)
  const j = i + direcao
  if (i < 0 || j < 0 || j >= quadros.length) return quadros
  const nova = [...quadros]
  ;[nova[i], nova[j]] = [nova[j], nova[i]]
  return nova
}

export function validarCinematica({ titulo, quadros } = {}) {
  if (!String(titulo || '').trim()) return { ok: false, erro: t('Dê um título à cinemática.') }
  if (!Array.isArray(quadros) || quadros.length === 0) return { ok: false, erro: t('Adicione pelo menos um quadro.') }
  if (quadros.length > LIMITES_CINEMATICA.quadros) return { ok: false, erro: t('No máximo {max} quadros.', { max: LIMITES_CINEMATICA.quadros }) }
  const vazio = quadros.findIndex(q => !q?.imagem_url && !String(q?.titulo || '').trim() && !String(q?.texto || '').trim())
  if (vazio >= 0) return { ok: false, erro: t('O quadro {n} está vazio: ponha imagem, título ou texto.', { n: vazio + 1 }) }
  return { ok: true, erro: '' }
}

/** Pedaço do texto já "digitado" após `msDecorridos`. */
export function trechoDigitado(textoCompleto, msDecorridos, caracteresPorSegundo = 40) {
  const txt = String(textoCompleto ?? '')
  const n = Math.floor((Math.max(0, msDecorridos) / 1000) * caracteresPorSegundo)
  return txt.slice(0, n)
}
