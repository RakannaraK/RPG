/**
 * Fase 20.1 — Motor de pools (função PURA).
 * Não acessa banco nem React. Usa o formulaEngine (F17/19) para os máximos.
 *
 * Um pool é um recurso nomeado com máximo derivado de FÓRMULA e valor atual:
 *   - tipo 'pontos': Thariuns 26/26, Pontos de Foco
 *   - tipo 'dados' : reserva de 4d12 — `atual` é quantos DADOS restam; gastar rola
 *
 * Nada aqui é específico de D&D: o mestre nomeia o pool e escreve a fórmula.
 *
 * O MÁXIMO nunca é armazenado — é derivado do contexto atual (nível, atributos).
 * `atual` é o único estado, e nunca excede o máximo (clamp ao recalcular).
 */
import { avaliarFormula } from './formulaEngine.js'

function safeFormula(f, contexto) {
  try { return avaliarFormula(f, contexto || {}) } catch { return 0 }
}

/**
 * Máximo do pool no contexto atual. @throws {FormulaError} se a fórmula for inválida.
 * Frações para baixo; nunca negativo.
 */
export function maximoPool(pool, contexto = {}) {
  const f = String(pool?.maximo_formula ?? '').trim()
  if (!f) return 0
  return Math.max(0, Math.floor(avaliarFormula(f, contexto)))
}

/**
 * Máximos de vários pools de uma vez, isolando fórmulas quebradas.
 * @returns {{ maximos: Record<string,number>, erros: Record<string,string> }}
 */
export function calcularMaximos(pools, contexto = {}) {
  const maximos = {}
  const erros = {}
  for (const p of pools || []) {
    try {
      maximos[p.id] = maximoPool(p, contexto)
    } catch (e) {
      maximos[p.id] = 0
      erros[p.id] = e.message || 'Fórmula inválida'
    }
  }
  return { maximos, erros }
}

/**
 * Valor atual efetivo. Pool sem linha na ficha (novo, ou ficha nova) começa CHEIO.
 * Se o máximo caiu (perdeu nível), o atual acompanha.
 */
export function atualDePool(linhaFicha, maximo) {
  if (!linhaFicha) return maximo
  return Math.max(0, Math.min(maximo, Number(linhaFicha.atual) || 0))
}

/**
 * Debita `quantidade` do pool. Custos falham ANTES do efeito, com motivo claro.
 * @returns {{ ok: boolean, novo: number, motivo?: string }}
 */
export function gastarPool(atual, quantidade) {
  const q = Math.floor(Number(quantidade) || 0)
  if (q <= 0) return { ok: false, novo: atual, motivo: 'Quantidade inválida.' }
  if (q > atual) return { ok: false, novo: atual, motivo: `Insuficiente: tem ${atual}, precisa de ${q}.` }
  return { ok: true, novo: atual - q }
}

/** Devolve `quantidade` ao pool, sem passar do máximo. */
export function recuperarQuantidade(atual, maximo, quantidade) {
  const q = Math.floor(Number(quantidade) || 0)
  return Math.max(0, Math.min(maximo, atual + q))
}

/**
 * Novo valor após um descanso (Fase 15). A regra vive em `pool.recuperacao`,
 * indexada pelo id do tipo de descanso — mesmos modos dos recursos de habilidade.
 *   total   → enche
 *   parcial → + piso(máximo × valor)   (valor = fração, ex: 0.5)
 *   fixo    → + valor (aceita fórmula se valor_e_formula)
 *   nada    → mantém (só aplica o clamp)
 */
export function recuperarPool(pool, atual, maximo, descansoId, contexto = {}) {
  const regra = pool?.recuperacao?.[descansoId] || { modo: 'nada' }
  switch (regra.modo) {
    case 'total':
      return maximo
    case 'parcial':
      return Math.min(maximo, atual + Math.floor(maximo * (Number(regra.valor) || 0)))
    case 'fixo': {
      const v = regra.valor_e_formula ? safeFormula(regra.valor, contexto) : (Number(regra.valor) || 0)
      return Math.min(maximo, atual + Math.floor(v))
    }
    case 'nada':
    default:
      return Math.min(maximo, atual)
  }
}

/** Notação da rolagem ao gastar N dados de um pool tipo 'dados'. Ex: 2 + "d12" → "2d12". */
export function notacaoGasto(pool, quantidade) {
  const q = Math.max(1, Math.floor(Number(quantidade) || 0))
  const bruto = String(pool?.dado ?? '').trim()
  if (!bruto) return ''
  const dado = /^d/i.test(bruto) ? bruto.toLowerCase() : `d${bruto}`
  return `${q}${dado}`
}

/**
 * Mapa para a variável `pool(nome)` do formulaEngine: id E nome → valor ATUAL.
 * (mesma semântica de `recurso()`, que também devolve o atual)
 */
export function mapaPools(pools, linhasFicha, maximos) {
  const mapa = {}
  for (const p of pools || []) {
    const linha = (linhasFicha || []).find(l => l.pool_id === p.id)
    const atual = atualDePool(linha, maximos?.[p.id] ?? 0)
    mapa[p.id] = atual
    if (p.nome) mapa[p.nome] = atual
  }
  return mapa
}
