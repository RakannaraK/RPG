/**
 * Fase 52 — "quão perigosa é" uma criatura, a partir do texto livre de ameaça
 * ("Mortal", "ND 1/4", "ND 12"). Serve para ordenar o filtro e desenhar o
 * medidor de 1 a 5 no selo — o texto continua sendo o que a pessoa escreveu.
 */
const PALAVRAS = { trivial: 1, facil: 1, normal: 2, dificil: 3, mortal: 4, lendaria: 5 }

const semAcento = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

/** Valor do ND ("ND 1/4" -> 0.25, "nd 12" -> 12); null quando não é ND. */
export function valorND(texto) {
  const m = semAcento(texto).match(/^(?:nd|cr)\s*(\d+)(?:\s*\/\s*(\d+))?$/)
  if (!m) return null
  return m[2] ? Number(m[1]) / Number(m[2]) : Number(m[1])
}

/** 1..5 (0 = não sei dizer). */
export function nivelAmeaca(texto) {
  const p = PALAVRAS[semAcento(texto)]
  if (p) return p
  const nd = valorND(texto)
  if (nd === null) return 0
  if (nd < 1) return 1
  if (nd <= 4) return 2
  if (nd <= 10) return 3
  if (nd <= 16) return 4
  return 5
}

/** Para ordenar: ND pelo valor, palavras pela escala, o resto no fim. */
export function ordemAmeaca(texto) {
  const nd = valorND(texto)
  if (nd !== null) return nd
  const p = PALAVRAS[semAcento(texto)]
  return p ? (p - 1) * 5 : 1000
}
