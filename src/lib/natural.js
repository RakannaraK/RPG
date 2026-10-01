/**
 * Fase 52 — 20 natural / 1 natural no d20 (puro). É o momento mais
 * reconhecível de uma rolagem; vale para os dados MANTIDOS (vantagem e
 * desvantagem continuam certas). Os modos de resolução (sucessos, faixas…)
 * têm o próprio "crítico" e não passam por aqui.
 */
export function naturalD20(dados = []) {
  const d20 = (dados || []).filter(d => Number(d.lados) === 20 && !d.descartado)
  if (!d20.length) return null
  if (d20.some(d => Number(d.valor) === 20)) return 'critico'
  if (d20.every(d => Number(d.valor) === 1)) return 'falha'
  return null
}

/** Monta "2d6+3" a partir de quantidade, lados e modificador. */
export function montarNotacao(qtd, lados, mod = 0) {
  const q = Math.max(1, Math.min(100, Math.round(Number(qtd) || 1)))
  const m = Math.round(Number(mod) || 0)
  return `${q}d${lados}${m > 0 ? `+${m}` : m < 0 ? `${m}` : ''}`
}
