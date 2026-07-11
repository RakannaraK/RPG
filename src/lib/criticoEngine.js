/**
 * Fase 22.3/22.4 — Crítico configurável (função PURA).
 * Não acessa banco nem React.
 *
 * config_layout.critico = {
 *   ativo, aplica_em: 'acerto',
 *   limiar_formula,            -- resolvido com a variável `maestria` do item usado (F22)
 *   multiplicador_padrao,      -- dano crítico = dano × mult
 *   modo_multiplicador,        -- 'total' (dobra tudo) | 'dados' (dobra só os dados)
 * }
 * categorias_item.critico_config = { multiplicador }  -- sobrescreve o padrão
 *
 * CONTRATO (ordem, F22.4): dados+fixos → multiplicador crítico → percentuais (F18) → piso.
 */
import { avaliarFormula } from './formulaEngine.js'

/**
 * Limiar de crítico resolvido agora, com o nível de maestria do item.
 * @returns {number|null} null = sem limiar (crítico desligado ou fórmula inválida)
 */
export function limiarCritico(config, contexto = {}) {
  if (!config?.ativo) return null
  const f = String(config.limiar_formula || '').trim()
  if (!f) return null
  try { return Math.floor(avaliarFormula(f, contexto)) } catch { return null }
}

/**
 * O DADO PURO da rolagem (antes de bônus) — a soma das faces roladas.
 * Para o acerto padrão (1 dado), é o próprio dado.
 */
export function dadoPuro(dados = []) {
  return (dados || []).reduce((s, d) => s + (Number(d?.valor ?? d) || 0), 0)
}

/** É crítico? O dado puro alcança o limiar. */
export function ehCritico(natural, limiar) {
  if (limiar == null) return false
  return Number(natural) >= Number(limiar)
}

/** Multiplicador do crítico: override da categoria, ou o padrão do sistema, ou 2. */
export function multiplicadorCritico(config, categoriaCritico) {
  const m = categoriaCritico?.multiplicador
  if (m != null && Number(m) > 0) return Number(m)
  const p = config?.multiplicador_padrao
  return p != null && Number(p) > 0 ? Number(p) : 2
}

/**
 * Fase 22.4 — aplica o multiplicador crítico sobre os DADOS já rolados, ANTES
 * dos percentuais (F18). Dois modos:
 *   'total'  → resultado final × mult (dobra dados E fixos)
 *   'dados'  → os dados contam × mult; os fixos, uma vez
 * @param {object} p { dadosTotal, fixos, multiplicador, modo }
 * @returns {number} subtotal (dados+fixos com o crítico aplicado), antes de %
 */
export function aplicarCritico({ dadosTotal = 0, fixos = 0, multiplicador = 2, modo = 'total' }) {
  const mult = Number(multiplicador) || 1
  const d = Number(dadosTotal) || 0
  const f = Number(fixos) || 0
  if (modo === 'dados') return d * mult + f
  return (d + f) * mult // 'total'
}
