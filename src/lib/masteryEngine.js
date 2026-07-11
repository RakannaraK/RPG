/**
 * Fase 21.2 — Motor de maestria por uso (função PURA).
 * Não acessa banco nem React. Orquestra apenas XP → nível → desbloqueios;
 * a curva usa o formulaEngine (F17), os bônus percentuais entram via F18 e os
 * efeitos de propriedade são modificadores (F12). O motor não recalcula nada
 * disso — só decide nível e o que está desbloqueado.
 *
 * curva = { modo: 'formula'|'tabela', formula: '100 * proximo_nivel', tabela: [...] }
 *   - fórmula: custo do nível n = f(proximo_nivel = n). Ex: "100 * proximo_nivel"
 *     → nv1 custa 100, nv2 custa 200, nv3 custa 300.
 *   - tabela: custo de CADA nível em ordem (tabela[n-1]).
 * Níveis "infinitos" no modo fórmula; no modo tabela, até o fim da tabela.
 */
import { avaliarFormula } from './formulaEngine.js'

const MAX_NIVEL = 1000

function modoCurva(curva) {
  return curva?.modo === 'tabela' ? 'tabela' : 'formula'
}

/**
 * Custo em XP para ADQUIRIR o nível n (n = 1, 2, 3…).
 * 0 = não há mais nível definido (fim da tabela, ou fórmula não-positiva).
 * @throws {FormulaError} se a fórmula for inválida (modo fórmula)
 */
export function custoDoNivel(n, curva) {
  if (n < 1) return 0
  if (modoCurva(curva) === 'tabela') {
    const v = Number((curva?.tabela || [])[n - 1])
    return Number.isFinite(v) && v > 0 ? Math.floor(v) : 0
  }
  const f = String(curva?.formula ?? '').trim()
  if (!f) return 0
  const v = avaliarFormula(f, { proximo_nivel: n })
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : 0
}

/**
 * Nível de maestria e progresso a partir do XP acumulado.
 * @returns {{ nivel, xpNoNivel, xpParaProximo, faltam }}
 *   xpParaProximo = tamanho (custo) do próximo nível; 0 se não houver próximo.
 *   faltam = quanto falta para o próximo nível.
 * Fórmula quebrada não derruba a ficha: para no melhor nível apurado.
 */
export function calcularMaestria(xp, curva) {
  const total = Math.max(0, Number(xp) || 0)
  let nivel = 0
  let cumulativo = 0 // XP necessário para ESTAR em `nivel`
  let custoProx = 0

  for (let n = 1; n <= MAX_NIVEL; n++) {
    let custo
    try { custo = custoDoNivel(n, curva) } catch { custo = 0 }
    if (custo <= 0) { custoProx = 0; break }
    if (total >= cumulativo + custo) {
      cumulativo += custo
      nivel = n
    } else {
      custoProx = custo
      break
    }
  }

  const xpNoNivel = total - cumulativo
  return {
    nivel,
    xpNoNivel,
    xpParaProximo: custoProx,
    faltam: custoProx > 0 ? Math.max(0, custoProx - xpNoNivel) : 0,
  }
}

/**
 * Bônus da maestria num uso do item.
 * @param {number} nivel
 * @param {object} config — config_layout.maestria (usa bonus_por_nivel)
 * @param {Array} propriedades — propriedades_item aplicáveis ({ maestria_minima, ... })
 * @returns {{ acerto_percentual, efeito_percentual, desbloqueadas, bloqueadas }}
 *   percentuais = bônus por nível × nível (somados como percentual, F18)
 */
export function bonusMaestria(nivel, config, propriedades = []) {
  const b = config?.bonus_por_nivel || {}
  const n = Math.max(0, Number(nivel) || 0)
  const desbloqueadas = []
  const bloqueadas = []
  for (const p of propriedades || []) {
    const min = Number(p.maestria_minima) || 0
    ;(min <= n ? desbloqueadas : bloqueadas).push(p)
  }
  return {
    acerto_percentual: (Number(b.acerto_percentual) || 0) * n,
    efeito_percentual: (Number(b.efeito_percentual) || 0) * n,
    desbloqueadas,
    bloqueadas,
  }
}

/** XP acumulado necessário para ESTAR num nível (soma dos custos 1..nivel). */
export function xpParaNivel(nivel, curva) {
  let total = 0
  for (let n = 1; n <= Math.min(MAX_NIVEL, Math.max(0, Math.floor(Number(nivel) || 0))); n++) {
    let custo
    try { custo = custoDoNivel(n, curva) } catch { custo = 0 }
    if (custo <= 0) break
    total += custo
  }
  return total
}

/** Próxima propriedade a desbloquear (a de menor requisito ainda bloqueada). */
export function proximaPropriedade(nivel, propriedades = []) {
  const n = Math.max(0, Number(nivel) || 0)
  return (propriedades || [])
    .filter(p => (Number(p.maestria_minima) || 0) > n)
    .sort((a, b) => (Number(a.maestria_minima) || 0) - (Number(b.maestria_minima) || 0))[0] || null
}
