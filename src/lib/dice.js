export function rolarDados(quantidade, lados) {
  return Array.from({ length: quantidade }, () =>
    Math.ceil(Math.random() * lados)
  )
}

export function aplicarRegra(regra) {
  if (regra.tipo === 'fixo') {
    return {
      valor: regra.valor,
      resultados: [],
      mantidos: [],
      descartados: [],
      bonus: 0,
      formula: `Valor fixo: ${regra.valor}`
    }
  }

  if (regra.tipo === 'dados') {
    const { quantidade, lados, descartar_menores = 0, descartar_maiores = 0, bonus_fixo = 0 } = regra
    const resultados = rolarDados(quantidade, lados)
    const ordenados = [...resultados].sort((a, b) => a - b)

    const descartados_idx_menores = ordenados.slice(0, descartar_menores)
    const descartados_idx_maiores = ordenados.slice(ordenados.length - descartar_maiores)
    const mantidos = ordenados.slice(descartar_menores, ordenados.length - descartar_maiores || undefined)

    const soma = mantidos.reduce((s, v) => s + v, 0)
    const valor = soma + bonus_fixo

    const partes = []
    if (descartar_menores > 0) partes.push(`descarte ${descartar_menores} menor${descartar_menores > 1 ? 'es' : ''}`)
    if (descartar_maiores > 0) partes.push(`descarte ${descartar_maiores} maior${descartar_maiores > 1 ? 'es' : ''}`)
    const formula = `${quantidade}d${lados}${partes.length ? ' (' + partes.join(', ') + ')' : ''}${bonus_fixo !== 0 ? (bonus_fixo > 0 ? ' +' : ' ') + bonus_fixo : ''}`

    return {
      valor,
      resultados,
      mantidos,
      descartados: [...descartados_idx_menores, ...descartados_idx_maiores],
      bonus: bonus_fixo,
      formula
    }
  }

  throw new Error(`Tipo de regra desconhecido: ${regra.tipo}`)
}

export function calcularEstatisticas(regra) {
  if (regra.tipo === 'fixo') {
    return { min: regra.valor, max: regra.valor, media: regra.valor }
  }
  if (regra.tipo === 'dados') {
    const { quantidade, lados, descartar_menores = 0, descartar_maiores = 0, bonus_fixo = 0 } = regra
    const mantidos = quantidade - descartar_menores - descartar_maiores
    const min = mantidos * 1 + bonus_fixo
    const max = mantidos * lados + bonus_fixo
    const media = Math.round(mantidos * (lados + 1) / 2) + bonus_fixo
    return { min, max, media }
  }
  return { min: 0, max: 0, media: 0 }
}
