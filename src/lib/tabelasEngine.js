/**
 * Tabelas do mestre (rumores, loot, encontros, oráculos) — funções PURAS.
 * Não acessam banco nem React.
 *
 * Uma tabela tem uma notação de dado e entradas por FAIXA de resultado:
 *   { id, nome, notacao: '1d6', entradas: [{ de, ate, texto }] }
 * `ate` vazio/null = faixa aberta (pega tudo dali para cima).
 */

/** Entrada cuja faixa contém o valor rolado, ou null. */
export function entradaPara(tabela, valor) {
  const n = Number(valor)
  if (!tabela || !Array.isArray(tabela.entradas) || !Number.isFinite(n)) return null
  for (const e of tabela.entradas) {
    const de = Number(e.de)
    const ate = e.ate == null || e.ate === '' ? Infinity : Number(e.ate)
    if (Number.isFinite(de) && n >= de && n <= ate) return e
  }
  return null
}

/** Faixa possível de uma notação simples NdX(+/-K). null se não reconhecer. */
export function faixaDaNotacao(notacao) {
  const m = String(notacao || '').replace(/\s/g, '').match(/^(\d*)d(\d+)([+-]\d+)?$/i)
  if (!m) return null
  const qtd = m[1] === '' ? 1 : parseInt(m[1], 10)
  const lados = parseInt(m[2], 10)
  const bonus = m[3] ? parseInt(m[3], 10) : 0
  if (!qtd || !lados) return null
  return { min: qtd + bonus, max: qtd * lados + bonus }
}

/** Resultados possíveis da notação que NENHUMA entrada cobre (buracos). */
export function resultadosSemEntrada(tabela) {
  const faixa = faixaDaNotacao(tabela?.notacao)
  if (!faixa) return []
  const faltando = []
  for (let v = faixa.min; v <= faixa.max; v++) {
    if (!entradaPara(tabela, v)) faltando.push(v)
  }
  return faltando
}

/** Valida a tabela para o editor. @returns {{ valida: boolean, erros: string[] }} */
export function validarTabela(tabela) {
  const erros = []
  if (!String(tabela?.nome ?? '').trim()) erros.push('A tabela precisa de um nome.')
  if (!String(tabela?.notacao ?? '').trim()) erros.push('Informe a notação (ex: 1d6).')
  const entradas = Array.isArray(tabela?.entradas) ? tabela.entradas : []
  if (entradas.length === 0) erros.push('Adicione ao menos uma entrada.')
  entradas.forEach((e, i) => {
    const de = Number(e.de)
    const ate = e.ate == null || e.ate === '' ? null : Number(e.ate)
    if (!Number.isFinite(de)) erros.push(`Entrada ${i + 1}: o "de" precisa ser um número.`)
    if (ate != null && Number.isFinite(ate) && Number.isFinite(de) && ate < de) {
      erros.push(`Entrada ${i + 1}: o "até" é menor que o "de".`)
    }
    if (!String(e.texto ?? '').trim()) erros.push(`Entrada ${i + 1}: escreva o resultado.`)
  })
  const ordenadas = entradas
    .filter(e => Number.isFinite(Number(e.de)))
    .slice()
    .sort((a, b) => Number(a.de) - Number(b.de))
  for (let i = 1; i < ordenadas.length; i++) {
    const ant = ordenadas[i - 1]
    const antAte = ant.ate == null || ant.ate === '' ? Infinity : Number(ant.ate)
    if (Number(ordenadas[i].de) <= antAte) {
      erros.push(`As faixas se sobrepõem em ${ordenadas[i].de}.`)
    }
  }
  return { valida: erros.length === 0, erros }
}
