/**
 * Resumo de sessão — função PURA. Não acessa banco nem React.
 *
 * Lê as rolagens já gravadas no feed e devolve um retrato do que aconteceu.
 * Pensado para cadência mensal: um mês depois, ninguém lembra da sessão.
 *
 * Uma linha de `rolagens` tem { autor_nome, rotulo, notacao, resultados,
 * total, created_at }. Entradas SEM dados são eventos narrados pelo app
 * (cura, subida de nível, descanso, crítico anunciado) — valem tanto quanto.
 */

function temDados(r) {
  return Array.isArray(r?.resultados?.dados) && r.resultados.dados.length > 0
}

/**
 * @param {Array} rolagens — linhas da tabela `rolagens`
 * @returns {{ total, periodo, participantes, criticos, eventos, maiores, comDados }}
 */
export function resumirSessao(rolagens = []) {
  const lista = (Array.isArray(rolagens) ? rolagens : [])
    .slice()
    .sort((a, b) => new Date(a?.created_at || 0) - new Date(b?.created_at || 0))

  const comDados = lista.filter(temDados)
  const eventos = lista.filter(r => !temDados(r))

  const mapaAutores = new Map()
  for (const r of lista) {
    const nome = r?.autor_nome || 'Alguém'
    const atual = mapaAutores.get(nome) || { nome, total: 0, criticos: 0 }
    atual.total += 1
    if (r?.resultados?.critico) atual.criticos += 1
    mapaAutores.set(nome, atual)
  }

  const criticos = lista.filter(r => !!r?.resultados?.critico)

  const maiores = comDados
    .slice()
    .sort((a, b) => (Number(b?.total) || 0) - (Number(a?.total) || 0))
    .slice(0, 3)

  return {
    total: lista.length,
    comDados: comDados.length,
    periodo: lista.length
      ? { de: lista[0]?.created_at ?? null, ate: lista[lista.length - 1]?.created_at ?? null }
      : null,
    participantes: [...mapaAutores.values()].sort((a, b) => b.total - a.total),
    criticos,
    eventos,
    maiores,
  }
}
