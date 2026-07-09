/**
 * Fase 19.3 — Motor de progressão por XP (função PURA).
 * Não acessa banco nem React. Usa o formulaEngine (F17) no modo "formula".
 *
 * config_layout.progressao_xp = {
 *   modo: 'nenhum' | 'tabela' | 'formula',
 *   tabela: [0, 300, 900, 2700, ...],   // XP ACUMULADO para estar em cada nível
 *   formula: '100 + (nivel-1) * 200',   // XP do nível N para o N+1
 * }
 *
 * 'nenhum' = sistema sem XP (o mestre sobe o nível na mão) — retrocompatível.
 */
import { avaliarFormula } from './formulaEngine.js'

// Teto de segurança: impede laço infinito em fórmulas que crescem devagar demais.
const MAX_NIVEL = 500

export function modoProgressao(prog) {
  const m = prog?.modo
  return m === 'tabela' || m === 'formula' ? m : 'nenhum'
}

/**
 * XP acumulado necessário para ESTAR no nível dado (nível 1 = 0).
 * @returns {number|null} null = sem definição (modo nenhum, ou além da tabela)
 */
export function limiarNivel(nivel, prog) {
  const modo = modoProgressao(prog)
  if (modo === 'nenhum') return null
  if (nivel <= 1) return 0
  if (nivel > MAX_NIVEL) return null

  if (modo === 'tabela') {
    const v = (prog.tabela || [])[nivel - 1]
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }

  // formula: o valor é o custo do nível n → n+1; o limiar é a soma de 1..nivel-1
  let total = 0
  for (let n = 1; n < nivel; n++) {
    total += custoDoNivel(n, prog)
  }
  return total
}

/** Custo em XP para sair do nível n e chegar no n+1 (só no modo fórmula). */
function custoDoNivel(n, prog) {
  const passo = avaliarFormula(prog.formula, { nivel: n })
  return Math.max(0, passo)
}

/**
 * Maior nível cujo limiar já foi alcançado pelo XP dado.
 * @returns {number|null} null no modo 'nenhum'
 */
export function nivelPorXp(xp, prog) {
  const modo = modoProgressao(prog)
  if (modo === 'nenhum') return null
  const total = Number(xp) || 0

  if (modo === 'tabela') {
    const t = prog.tabela || []
    let nivel = 1
    for (let i = 1; i < t.length; i++) {
      const l = Number(t[i])
      if (!Number.isFinite(l) || total < l) break
      nivel = i + 1
    }
    return nivel
  }

  let nivel = 1
  let acumulado = 0
  for (let n = 1; n < MAX_NIVEL; n++) {
    acumulado += custoDoNivel(n, prog)
    if (total < acumulado) break
    nivel = n + 1
  }
  return nivel
}

/**
 * Progresso do XP dentro do nível atual, para a barra e o aviso de level-up.
 * @returns {{ modo, base, prox, faltam, pct, podeSubir, noMaximo }}
 *   modo 'nenhum'  → podeSubir false (o botão de subir fica livre na UI)
 *   noMaximo true  → não há próximo nível definido (fim da tabela)
 */
export function progressoXp(xp, nivelAtual, prog) {
  const modo = modoProgressao(prog)
  const total = Number(xp) || 0
  if (modo === 'nenhum') {
    return { modo, base: 0, prox: null, faltam: null, pct: 0, podeSubir: false, noMaximo: false }
  }

  const base = limiarNivel(nivelAtual, prog) ?? 0
  const prox = limiarNivel(nivelAtual + 1, prog)

  if (prox == null) {
    return { modo, base, prox: null, faltam: null, pct: 100, podeSubir: false, noMaximo: true }
  }

  const intervalo = Math.max(1, prox - base)
  const dentro = Math.max(0, total - base)
  const pct = Math.max(0, Math.min(100, (dentro / intervalo) * 100))
  return {
    modo,
    base,
    prox,
    faltam: Math.max(0, prox - total),
    pct,
    podeSubir: total >= prox,
    noMaximo: false,
  }
}
