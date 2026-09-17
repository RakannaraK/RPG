/**
 * Fase 27 — regras PURAS da bandeja de dados (sem three.js/cannon-es).
 * Contrato em docs/FASE27_DADOS_NA_MESA.md.
 */

export const LIMITE_DADOS_FISICOS = 40
export const MAX_LANCAMENTOS_SIMULTANEOS = 6

/**
 * Até `limite` dados rolam; o resto vira um selo com quantidade e soma
 * (dados descartados por kh/kl não entram na soma, como no total da rolagem).
 */
export function separarExcedente(dados, limite = LIMITE_DADOS_FISICOS) {
  const lista = Array.isArray(dados) ? dados : []
  const rolam = lista.slice(0, limite)
  const resto = lista.slice(limite)
  return {
    rolam,
    excedente: resto.length
      ? { qtd: resto.length, soma: resto.filter(d => !d.descartado).reduce((s, d) => s + (Number(d.valor) || 0), 0) }
      : null,
  }
}

/**
 * Fila da bandeja: entra o novo lançamento; se passar do teto, saem os mais
 * antigos. Rajadas (reconexão, "rolar iniciativa de todos") não viram chuva de
 * dados — e sem comparar relógios (o do navegador pode estar errado).
 * Mesmo id não entra duas vezes.
 */
export function enfileirarLancamento(fila, novo, max = MAX_LANCAMENTOS_SIMULTANEOS) {
  if (fila.some(l => l.id === novo.id)) return fila
  return [...fila, novo].slice(-max)
}

/**
 * Uma rolagem recebida (linha de `rolagens`) vira lançamento na bandeja?
 * null se a preferência esconde ou se é evento sem dados (cura fixa, aviso).
 * Rolagem antiga sem `resultados.skin` usa a padrão.
 */
export function lancamentoDeRolagem(r, { meuId, preferencia }) {
  if (!deveMostrar(preferencia, r.autor_id === meuId)) return null
  const { rolam, excedente } = separarExcedente(r.resultados?.dados)
  if (!rolam.length) return null
  return { id: r.id, dados: rolam, excedente, skin: r.resultados?.skin || 'padrao', autor: r.autor_nome }
}

/** Preferência `dados_mesa`: 'todos' (padrão) | 'meus' | 'nenhum'. */
export function deveMostrar(preferencia, ehMinha) {
  if (preferencia === 'nenhum') return false
  if (preferencia === 'meus') return !!ehMinha
  return true
}

/**
 * Posições e impulsos iniciais para N dados arremessados da borda de baixo da
 * bandeja (chão no plano XZ, y para cima), espalhados na largura, girando.
 * `rng` injetável (testes). Tudo dentro das paredes.
 */
export function planejarLancamento(n, { largura, profundidade }, rng = Math.random) {
  const faixa = (a, b) => a + rng() * (b - a)
  const margem = 1
  const meiaL = Math.max(0, largura / 2 - margem)
  const meiaP = Math.max(0, profundidade / 2 - margem)
  return Array.from({ length: n }, (_, i) => {
    // Espalha pela largura em faixas, com jitter, para não nascerem sobrepostos
    const fatia = n > 1 ? -meiaL + ((i + 0.5) / n) * 2 * meiaL : 0
    const x = Math.max(-meiaL, Math.min(meiaL, fatia + faixa(-0.4, 0.4)))
    return {
      posicao: { x, y: faixa(2.5, 4.5) + (i % 3) * 1.2, z: meiaP * faixa(0.55, 0.9) },
      velocidade: { x: faixa(-2, 2) - x * 0.25, y: faixa(1, 3), z: -faixa(6, 10) },
      giro: { x: faixa(-18, 18), y: faixa(-18, 18), z: faixa(-18, 18) },
      rotacao: { x: faixa(0, Math.PI * 2), y: faixa(0, Math.PI * 2), z: faixa(0, Math.PI * 2) },
    }
  })
}
