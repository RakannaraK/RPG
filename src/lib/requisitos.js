/**
 * Fase 19.5 — Requisito de nível mínimo (função PURA).
 *
 * `nivel_minimo` de uma habilidade ou modificador é comparado com o nível da
 * CLASSE de origem quando existe (Voo Dracônico exige nv 5 *de Dragão*, não
 * nível total). Raça e itens avulsos usam o NÍVEL TOTAL.
 *
 * Sem `nivel_minimo` → sempre atende (retrocompatibilidade: tudo que já existe
 * continua entrando).
 */
import { normalizar } from './formulaEngine.js'

/** Nível contra o qual o requisito é medido. */
export function nivelDeReferencia(item, contexto = {}) {
  // `classe_id` numa habilidade; `_origemClasseId` num modificador (carimbado na coleta)
  const classeId = item?.classe_id ?? item?._origemClasseId ?? null
  if (!classeId) return Number(contexto.nivel) || 0

  const mapa = contexto.niveisClasse || {}
  if (classeId in mapa) return Number(mapa[classeId]) || 0
  const alvo = normalizar(classeId)
  for (const k of Object.keys(mapa)) {
    if (normalizar(k) === alvo) return Number(mapa[k]) || 0
  }
  return 0 // a ficha não tem essa classe
}

/** @returns {boolean} true se o item pode entrar em jogo agora. */
export function atendeNivelMinimo(item, contexto = {}) {
  const min = item?.nivel_minimo
  if (min == null || min === '') return true
  const n = Number(min)
  if (!Number.isFinite(n)) return true
  return nivelDeReferencia(item, contexto) >= n
}

export function filtrarPorNivelMinimo(itens, contexto = {}) {
  return (itens || []).filter(i => atendeNivelMinimo(i, contexto))
}

/** Itens que ainda não atingiram o requisito — exibidos como "bloqueados (nv X)". */
export function bloqueadosPorNivel(itens, contexto = {}) {
  return (itens || []).filter(i => !atendeNivelMinimo(i, contexto))
}
