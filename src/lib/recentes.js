/** Fase 55 — "continuar de onde parou": últimas telas visitadas, só no navegador. */
const CHAVE = 'dp-recentes'
const MAXIMO = 10

/** Visita correspondente à rota, ou null se a rota não conta. */
export function tipoDaRota(pathname) {
  const p = String(pathname || '').replace(/\/+$/, '')
  let m
  if ((m = p.match(/^\/mesa\/([^/]+)$/))) return { tipo: 'mesa', mesaId: m[1], rota: p }
  if ((m = p.match(/^\/mesa\/([^/]+)\/ficha\/([^/]+)$/))) return { tipo: 'ficha', mesaId: m[1], fichaId: m[2], rota: p }
  if ((m = p.match(/^\/mesa\/([^/]+)\/sessao\/([^/]+)$/))) return { tipo: 'sessao', mesaId: m[1], sessaoId: m[2], rota: p }
  if ((m = p.match(/^\/mesa\/([^/]+)\/mapa$/))) return { tipo: 'mapa', mesaId: m[1], rota: p }
  return null
}

/** Põe a visita no topo, sem repetir a rota, no máximo 10. */
export function registrarVisita(lista, visita) {
  return [{ ...visita, em: visita.em ?? Date.now() }, ...(lista || []).filter(v => v.rota !== visita.rota)].slice(0, MAXIMO)
}

export function lerRecentes() {
  try {
    const l = JSON.parse(localStorage.getItem(CHAVE))
    return Array.isArray(l) ? l : []
  } catch { return [] }
}

export function gravarRecentes(lista) {
  try { localStorage.setItem(CHAVE, JSON.stringify(lista)) } catch { /* navegador privado */ }
}
