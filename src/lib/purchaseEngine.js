/**
 * Fase 25.1 — Motor de COMPRA por XP direto (função PURA).
 * Não acessa banco nem React.
 *
 * No modo de progressão 'xp_direto' (config_layout.progressao), o XP compra
 * melhorias diretamente, por categoria:
 *
 *   categoria = { id, nome, alvo, custo_formula, maximo, custo_formula_fora? }
 *
 * CONTRATO (os exemplos da spec são testes literais):
 *   1. Compra sobe o alvo em EXATAMENTE +1 por transação.
 *   2. Custo = custo_formula avaliada com `novo_valor` = valor APÓS a compra
 *      (variável canônica; as demais variáveis F17 do contexto também valem).
 *      `custo_formula_fora` substitui quando opts.fora (linha não-nativa).
 *   3. Só compra se XP disponível ≥ custo e novo_valor ≤ máximo da categoria.
 *   4. Débito/crédito SEMPRE logados (xp_log, padrão F22) — o chamador persiste.
 *   5. Compra definitiva; correção via ajuste do mestre.
 */
import { avaliarFormula } from './formulaEngine.js'

/**
 * Custo de subir de valorAtual para valorAtual+1.
 * @param {object} categoria
 * @param {number} valorAtual
 * @param {object} contexto — contexto F17 (nivel, atributos, ... se o mestre usar)
 * @param {object} [opts] — { fora: true } usa custo_formula_fora (linha não-nativa)
 * @returns {number} custo inteiro (piso), nunca negativo
 * @throws {FormulaError} fórmula inválida (validarCompra trata sem lançar)
 */
export function custoCompra(categoria, valorAtual, contexto = {}, opts = {}) {
  const fora = !!opts.fora && String(categoria?.custo_formula_fora || '').trim() !== ''
  const formula = String((fora ? categoria.custo_formula_fora : categoria?.custo_formula) || '').trim()
  if (!formula) return 0
  const novoValor = Math.floor(Number(valorAtual) || 0) + 1
  const v = avaliarFormula(formula, { ...contexto, novo_valor: novoValor })
  return Math.max(0, Math.floor(v))
}

/**
 * Valida e descreve a compra.
 * @returns {{ permitida: boolean, custo: number|null, novoValor: number, motivoBloqueio?: string }}
 */
export function validarCompra(categoria, valorAtual, xpDisponivel, contexto = {}, opts = {}) {
  const atual = Math.floor(Number(valorAtual) || 0)
  const novoValor = atual + 1

  const maximo = categoria?.maximo
  if (maximo != null && maximo !== '' && novoValor > Number(maximo)) {
    return { permitida: false, custo: null, novoValor, motivoBloqueio: `Já está no máximo (${maximo}).` }
  }

  let custo
  try {
    custo = custoCompra(categoria, atual, contexto, opts)
  } catch (e) {
    return { permitida: false, custo: null, novoValor, motivoBloqueio: `Fórmula de custo inválida: ${e.message}` }
  }

  const saldo = Math.floor(Number(xpDisponivel) || 0)
  if (saldo < custo) {
    return { permitida: false, custo, novoValor, motivoBloqueio: `XP insuficiente: tem ${saldo}, precisa de ${custo}.` }
  }
  return { permitida: true, custo, novoValor }
}

/**
 * Linha do log de uma compra (padrão F22: quantidade negativa = gasto).
 * O chamador insere em xp_log e aplica o +1 no alvo.
 */
export function registroDeCompra(categoria, alvoId, valorAtual, custo) {
  const de = Math.floor(Number(valorAtual) || 0)
  return {
    tipo: 'gasto',
    quantidade: -Math.abs(Math.floor(Number(custo) || 0)),
    detalhe: { categoria: categoria?.id || null, alvo_id: alvoId ?? null, de, para: de + 1, custo: Math.abs(Math.floor(Number(custo) || 0)) },
  }
}

/** Saldo derivado do log (Σ quantidades; ganhos +, gastos −) — padrão F22. */
export function saldoDoLog(log = []) {
  return (log || []).reduce((s, l) => s + Math.trunc(Number(l.quantidade) || 0), 0)
}
