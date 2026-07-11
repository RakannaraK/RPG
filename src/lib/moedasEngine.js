/**
 * Fase 21.6 — Moedas / economia (função PURA).
 * Não acessa banco nem React.
 *
 * config_layout.moedas = { ativo, denominacoes: [{ id, nome, sigla, valor }] }
 *   `valor` = quanto vale, na unidade-base (a menor). Ex: PC=1, PP=10, PO=100, PL=1000.
 * carteira (fichas.carteira JSONB) = { "<denom_id>": quantidade }
 *
 * Regra de projeto: moedas NÃO travam transações — o saldo pode ficar como o
 * jogador puser; a UI só avisa saldo insuficiente. O engine é aritmética pura.
 */

/** A denominação de menor valor (a base do sistema). */
export function denominacaoBase(denominacoes = []) {
  let base = null
  for (const d of denominacoes) {
    const v = Number(d.valor) || 0
    if (v > 0 && (base === null || v < Number(base.valor))) base = d
  }
  return base
}

/** Total consolidado da carteira, na unidade-base. */
export function totalConsolidado(carteira = {}, denominacoes = []) {
  let total = 0
  for (const d of denominacoes) {
    total += (Number(carteira?.[d.id]) || 0) * (Number(d.valor) || 0)
  }
  return total
}

/** Quantidade de uma denominação (0 se ausente). */
export function saldoDe(carteira = {}, id) {
  return Number(carteira?.[id]) || 0
}

/**
 * Ajusta a quantidade de uma denominação (delta pode ser negativo).
 * Não trava: pode ir a negativo (a UI avisa). @returns nova carteira.
 */
export function ajustar(carteira = {}, id, delta) {
  const atual = Number(carteira?.[id]) || 0
  return { ...carteira, [id]: atual + Math.trunc(Number(delta) || 0) }
}

/**
 * Converte `quantidade` da denominação `deId` para `paraId`, preservando o valor.
 * Sobra que não fecha uma unidade de `para` vai para a denominação-base
 * (mantém o total consolidado exato). @returns { carteira, recebido, sobra }
 */
export function converter(carteira = {}, deId, paraId, quantidade, denominacoes = []) {
  const de = denominacoes.find(d => d.id === deId)
  const para = denominacoes.find(d => d.id === paraId)
  const q = Math.max(0, Math.floor(Number(quantidade) || 0))
  if (!de || !para || q <= 0 || deId === paraId) {
    return { carteira, recebido: 0, sobra: 0 }
  }

  const valorDe = Number(de.valor) || 0
  const valorPara = Number(para.valor) || 0
  if (valorDe <= 0 || valorPara <= 0) return { carteira, recebido: 0, sobra: 0 }

  const base = q * valorDe
  const recebido = Math.floor(base / valorPara)
  const sobra = base - recebido * valorPara // em unidades-base

  let nova = { ...carteira }
  nova[deId] = (Number(nova[deId]) || 0) - q
  nova[paraId] = (Number(nova[paraId]) || 0) + recebido

  if (sobra > 0) {
    const bd = denominacaoBase(denominacoes)
    if (bd) nova[bd.id] = (Number(nova[bd.id]) || 0) + sobra
  }
  return { carteira: nova, recebido, sobra }
}
