/**
 * Fase 34 — barra de vida com pedaço de escudo (puro). Usada no overlay do OBS
 * e no escudo do mestre, para as duas contarem a mesma história.
 *
 * `temp` é a vida temporária (F12): aparece como um pedaço a mais na barra,
 * sem passar de 100% no total.
 */
export function faixasDaBarra({ atual, maximo, temp = 0 } = {}) {
  const max = Math.max(0, Number(maximo) || 0)
  const hp = Math.max(0, Number(atual) || 0)
  const t = Math.max(0, Number(temp) || 0)
  const pct = max > 0 ? Math.min(100, (hp / max) * 100) : 0
  const pctTemp = max > 0 ? Math.max(0, Math.min(100 - pct, (t / max) * 100)) : 0
  return { pct, pctTemp, nivel: nivelDeVida(pct, max) }
}

/** 'cheia' | 'media' | 'baixa' | 'vazia' — é o que decide a cor. */
export function nivelDeVida(pct, max = 1) {
  if (max <= 0) return 'cheia'
  if (pct <= 0) return 'vazia'
  if (pct > 50) return 'cheia'
  if (pct > 25) return 'media'
  return 'baixa'
}

/** "12/20 (+4)" · "12" quando não há máximo. */
export function textoVida({ atual, maximo, temp = 0 } = {}) {
  const hp = Math.max(0, Number(atual) || 0)
  const max = Number(maximo) || 0
  const t = Math.max(0, Number(temp) || 0)
  return `${hp}${max ? `/${max}` : ''}${t > 0 ? ` (+${t})` : ''}`
}
