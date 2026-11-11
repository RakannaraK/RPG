/**
 * Fase 59 — efeitos de ação no mapa (projétil, explosão, raio, cura, corte, onda).
 * Puro: normaliza o preset e resolve o evento (que pode vir de broadcast, ou seja, não confiável)
 * para pontos em px do mapa. O desenho fica em CamadaVfx.
 */
import { FORMAS_VFX, SONS_VFX, LIMITES, ID_VALIDO, corValida, limitar, textoCurto } from './efeitosVocabulario'
import { normalizarGrade } from './mapaEngine'

/** Duração (ms) de um alvo por forma; cada alvo extra entra com ATRASO_ALVO_MS de diferença. */
export const DURACAO_MS = { projetil: 800, explosao: 600, raio: 280, cura: 900, corte: 300, onda: 500 }
export const ATRASO_ALVO_MS = 60

const COR_1 = '#FFC27A'
const COR_2 = '#FFFFFF'
const PRECISA_ORIGEM = ['projetil', 'raio']
const ehObjeto = v => !!v && typeof v === 'object' && !Array.isArray(v)

/** Preset válido ou `null` (forma fora da lista). */
export function normalizarEfeitoVfx(raw) {
  if (!ehObjeto(raw) || !Object.hasOwn(FORMAS_VFX, raw.forma)) return null
  const cores = Array.isArray(raw.cores) ? raw.cores : []
  return {
    id: typeof raw.id === 'string' && ID_VALIDO.test(raw.id) ? raw.id : 'efeito',
    nome: textoCurto(raw.nome) || FORMAS_VFX[raw.forma],
    forma: raw.forma,
    cores: [corValida(cores[0]) ? cores[0] : COR_1, corValida(cores[1]) ? cores[1] : COR_2],
    som: SONS_VFX.includes(raw.som) ? raw.som : null,
  }
}

const numero = v => typeof v === 'number' && Number.isFinite(v)

/** Alvo → ponto (px do mapa) ou null. Token por `combatente_id`; se não achar, por `ficha_id`. */
function pontoDoAlvo(alvo, tokens) {
  if (!ehObjeto(alvo)) return null
  if (numero(alvo.x) && numero(alvo.y)) return { x: alvo.x, y: alvo.y }
  const lista = Array.isArray(tokens) ? tokens : []
  const t = (alvo.comb != null && lista.find(k => k?.combatente_id === alvo.comb))
    || (alvo.ficha != null && lista.find(k => k?.ficha_id === alvo.ficha))
  return t && numero(t.x) && numero(t.y) ? { x: t.x, y: t.y } : null
}

/**
 * Evento → `{ efeito, de, para: [{ x, y, de }], raioPx }` ou `null`.
 * `de` (topo) = origem resolvida ou null; `para[i].de` = origem a usar naquele alvo
 * (a resolvida, ou 3 quadrados acima dele quando a forma precisa de origem e ela faltou).
 */
export function resolverVfx(evento, { tokens, efeitos, grade } = {}) {
  if (!ehObjeto(evento)) return null
  const instalado = Array.isArray(efeitos) && typeof evento.efeitoId === 'string'
    ? efeitos.find(e => e?.id === evento.efeitoId) : null
  const efeito = normalizarEfeitoVfx(evento.efeito ?? instalado)
  if (!efeito || !Array.isArray(evento.para)) return null

  const { tamanho, unidade } = normalizarGrade(grade)
  const quadrado = limitar(tamanho, 1, 1000, 70)
  const de = pontoDoAlvo(evento.de, tokens)
  const precisa = PRECISA_ORIGEM.includes(efeito.forma)
  const para = evento.para.slice(0, LIMITES.alvosVfx)
    .map(a => pontoDoAlvo(a, tokens))
    .filter(Boolean)
    .map(p => ({ ...p, de: de || (precisa ? { x: p.x, y: p.y - 3 * quadrado } : null) }))
  if (!para.length) return null

  const raio = limitar(evento.raio, 0, 1000, 0)
  const padrao = { explosao: 1.2, onda: 2 }[efeito.forma]
  const raioPx = raio > 0 ? (raio / limitar(unidade, 0.01, 1e6, 1)) * quadrado : padrao ? padrao * quadrado : null
  return { efeito, de, para, raioPx }
}
