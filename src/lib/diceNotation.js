import { rolarDados } from './dice.js'

// Valida a notação completa: um token inicial + zero ou mais tokens com sinal
// Token: grupo de dados (ex: 2d6kh3) ou número plano (ex: 3)
const NOTATION_RE =
  /^[+-]?(\d+d\d+(?:(?:kh|kl)\d+)?|\d+)([+-](\d+d\d+(?:(?:kh|kl)\d+)?|\d+))*$/i

/**
 * Valida se uma string é uma notação de dados reconhecida.
 * Case-insensitive. Retorna true/false.
 */
export function validarNotacao(notacao) {
  if (!notacao || typeof notacao !== 'string') return false
  return NOTATION_RE.test(notacao.trim())
}

/**
 * Interpreta uma notação e retorna a estrutura parseada (sem rolar).
 * Ex: "2d6+3"  → { grupos: [{qtd:2, lados:6, keep:null}], modificador:3 }
 * Ex: "4d6kh3" → { grupos: [{qtd:4, lados:6, keep:{tipo:'kh',n:3}}], modificador:0 }
 * Lança Error se a notação for inválida.
 */
export function parseNotacao(notacao) {
  if (!validarNotacao(notacao)) {
    throw new Error(`Notação inválida: "${notacao}"`)
  }

  const n = notacao.trim().toLowerCase()
  const grupos = []
  let modificador = 0

  // Extrai tokens assinados um a um
  const tokenRe = /([+-]?)(\d+d\d+(?:(?:kh|kl)\d+)?|\d+)/gi
  let match
  while ((match = tokenRe.exec(n)) !== null) {
    const sign = match[1] === '-' ? -1 : 1
    const token = match[2]

    if (token.includes('d')) {
      // Grupo de dados: Xd Y[khZ|klZ]
      const m = token.match(/^(\d+)d(\d+)(?:(kh|kl)(\d+))?$/)
      const qtd = parseInt(m[1])
      const lados = parseInt(m[2])
      const keepTipo = m[3] || null
      const keepN = m[4] ? parseInt(m[4]) : null

      if (qtd < 1) throw new Error(`Quantidade de dados inválida: ${qtd}`)
      if (lados < 2) throw new Error(`Número de lados inválido: ${lados}`)
      if (keepN !== null) {
        if (keepN <= 0 || keepN > qtd)
          throw new Error(`kh/kl inválido: não é possível manter ${keepN} de ${qtd} dados`)
      }

      grupos.push({
        qtd,
        lados,
        keep: keepTipo ? { tipo: keepTipo, n: keepN } : null,
      })
    } else {
      // Modificador plano
      modificador += sign * parseInt(token)
    }
  }

  if (grupos.length === 0) {
    throw new Error('A notação deve conter pelo menos um grupo de dados')
  }

  return { grupos, modificador, notacaoNormalizada: n }
}

/**
 * Rola uma notação e retorna o resultado completo.
 * Retorna:
 * {
 *   notacao: "2d6+3",
 *   individuais: [4, 6],   // cada dado rolado (antes de kh/kl)
 *   mantidos: [4, 6],      // após aplicar kh/kl
 *   descartados: [],        // dados removidos por kh/kl
 *   modificador: 3,
 *   total: 13
 * }
 */
export function rolarNotacao(notacao) {
  const { grupos, modificador, notacaoNormalizada } = parseNotacao(notacao)

  const individuais = []
  const mantidos = []
  const descartados = []
  // {lados, valor, descartado} por dado — usado pelo Dice3D
  const dados = []

  for (const grupo of grupos) {
    const rolls = rolarDados(grupo.qtd, grupo.lados)
    individuais.push(...rolls)

    if (grupo.keep) {
      // Rastreia por índice para lidar corretamente com valores duplicados
      const indexed = rolls.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v)
      const n = grupo.keep.n
      const mantidosIdx = new Set()

      if (grupo.keep.tipo === 'kh') {
        indexed.slice(indexed.length - n).forEach(x => { mantidosIdx.add(x.i); mantidos.push(x.v) })
        indexed.slice(0, indexed.length - n).forEach(x => descartados.push(x.v))
      } else {
        indexed.slice(0, n).forEach(x => { mantidosIdx.add(x.i); mantidos.push(x.v) })
        indexed.slice(n).forEach(x => descartados.push(x.v))
      }

      rolls.forEach((v, i) => dados.push({ lados: grupo.lados, valor: v, descartado: !mantidosIdx.has(i) }))
    } else {
      mantidos.push(...rolls)
      rolls.forEach(v => dados.push({ lados: grupo.lados, valor: v, descartado: false }))
    }
  }

  const soma = mantidos.reduce((s, v) => s + v, 0)
  const total = soma + modificador

  return {
    notacao: notacaoNormalizada,
    individuais,
    mantidos,
    descartados,
    modificador,
    total,
    dados, // [{lados, valor, descartado}] — um objeto por dado rolado
  }
}
