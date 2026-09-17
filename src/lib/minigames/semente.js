/**
 * Fase 28 — aleatoriedade com semente (mulberry32). Mesma semente → mesma
 * sequência em qualquer navegador: é o que deixa um desafio justo.
 * `proximo` é puro (estado entra e sai); os motores guardam `s` no estado.
 */
export function proximo(s) {
  const a = (s + 0x6d2b79f5) | 0
  let t = Math.imul(a ^ (a >>> 15), 1 | a)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return { valor: ((t ^ (t >>> 14)) >>> 0) / 4294967296, s: a }
}

/** Única função impura: sorteia uma semente nova para uma partida/desafio. */
export function novaSemente() {
  return Math.floor(Math.random() * 2147483647)
}

/** Embaralha (Fisher–Yates) devolvendo a lista nova e o estado da semente. */
export function embaralhar(lista, s) {
  const saida = [...lista]
  let estado = s
  for (let i = saida.length - 1; i > 0; i--) {
    const p = proximo(estado)
    estado = p.s
    const j = Math.floor(p.valor * (i + 1))
    ;[saida[i], saida[j]] = [saida[j], saida[i]]
  }
  return { lista: saida, s: estado }
}
