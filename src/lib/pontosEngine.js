/**
 * Fase 22.1 — Distribuição de pontos de status (função PURA).
 * Não acessa banco nem React.
 *
 * config_layout.pontos_status = {
 *   ativo, rotulo,
 *   inicial_por_raca, inicial,        -- número, fórmula (F17) ou notação rolada
 *   ganho_por_nivel,                  -- idem; tipicamente rolado ("1d6 + 10")
 *   custo_por_ponto,                  -- pontos gastos por +1 no atributo
 *   maximo_por_atributo               -- teto opcional
 * }
 *
 * O ganho pode ser um valor FIXO (número/fórmula) ou ROLADO (contém dados). A
 * parte aleatória (rolagem) fica na UI; aqui só decidimos o tipo e resolvemos o
 * lado determinístico (fórmulas/notação).
 */
import { avaliarFormula } from './formulaEngine.js'
import { resolverNotacaoFormula } from './diceNotation.js'

/** A expressão contém dados (é rolada)? Ex: "1d6 + 10". */
export function ehRolado(expr) {
  return /\d*d\d+/i.test(String(expr || ''))
}

/**
 * Notação pronta para rolar, com as variáveis já resolvidas (F17.2).
 * Use quando ehRolado(expr) — a UI então rola o retorno.
 */
export function notacaoDoGanho(expr, contexto = {}) {
  const s = String(expr || '').trim()
  if (!s) return ''
  try { return resolverNotacaoFormula(s, contexto).notacao } catch { return s }
}

/**
 * Valor determinístico de um ganho fixo (número/fórmula). Frações para baixo,
 * nunca negativo. Para ganhos rolados, use notacaoDoGanho + rolagem na UI.
 * @throws {FormulaError} fórmula inválida
 */
export function avaliarGanho(expr, contexto = {}) {
  const s = String(expr || '').trim()
  if (s === '') return 0
  return Math.max(0, Math.floor(avaliarFormula(s, contexto)))
}

/** A expressão do INICIAL, considerando raça (sobrescreve o padrão do sistema). */
export function inicialDaRaca(config, raca) {
  if (config?.inicial_por_raca && raca?.pontos_config?.inicial != null && String(raca.pontos_config.inicial).trim() !== '') {
    return String(raca.pontos_config.inicial)
  }
  return String(config?.inicial ?? '')
}

/** A expressão do GANHO POR NÍVEL, considerando raça. */
export function ganhoPorNivelDaRaca(config, raca) {
  const r = raca?.pontos_config?.ganho_por_nivel
  if (r != null && String(r).trim() !== '') return String(r)
  return String(config?.ganho_por_nivel ?? '')
}

// ─────────────────────────────────────────────── distribuição

/**
 * Custo em pontos de uma distribuição (mapa atributoId → quantos + no atributo).
 * custo_por_ponto = pontos gastos por +1.
 */
export function custoDistribuicao(distribuicao = {}, custoPorPonto = 1) {
  const c = Number(custoPorPonto) || 1
  let total = 0
  for (const k of Object.keys(distribuicao)) total += Math.max(0, Math.floor(Number(distribuicao[k]) || 0)) * c
  return total
}

/**
 * Valida uma distribuição contra o saldo e o teto.
 * @param {object} params
 *   distribuicao      — { [atributoId]: delta }  (delta >= 0)
 *   disponiveis       — pontos no pool
 *   custo_por_ponto
 *   valoresBase       — { [atributoId]: valor atual } (para o teto)
 *   maximo_por_atributo — teto ou null
 * @returns {{ valido, custo, restante, erro? }}
 */
export function validarDistribuicao({ distribuicao = {}, disponiveis = 0, custo_por_ponto = 1, valoresBase = {}, maximo_por_atributo = null }) {
  for (const k of Object.keys(distribuicao)) {
    const d = Math.floor(Number(distribuicao[k]) || 0)
    if (d < 0) return { valido: false, custo: 0, restante: disponiveis, erro: 'Não é possível remover pontos já distribuídos.' }
    if (maximo_por_atributo != null) {
      const novo = (Number(valoresBase[k]) || 0) + d
      if (novo > Number(maximo_por_atributo)) {
        return { valido: false, custo: 0, restante: disponiveis, erro: `Teto de ${maximo_por_atributo} por atributo excedido.` }
      }
    }
  }
  const custo = custoDistribuicao(distribuicao, custo_por_ponto)
  if (custo > Number(disponiveis)) {
    return { valido: false, custo, restante: Number(disponiveis) - custo, erro: 'Pontos insuficientes.' }
  }
  return { valido: true, custo, restante: Number(disponiveis) - custo }
}

/**
 * Saldo derivado do log: soma de ganhos (+) e gastos (−). Deve bater com
 * `disponiveis`. Serve para conferir a integridade do histórico.
 */
export function saldoDoLog(log = []) {
  return (log || []).reduce((s, l) => s + (Math.trunc(Number(l.quantidade) || 0)), 0)
}
