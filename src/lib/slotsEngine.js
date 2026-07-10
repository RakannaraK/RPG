/**
 * Fase 20.3 — Slots (função PURA). MODO OPCIONAL por sistema.
 * Não acessa banco nem React. Nada de D&D embutido: a grade é digitada pelo mestre.
 *
 * Slot = pool indexado por círculo. O TOTAL por círculo é DERIVADO da grade
 * (linha do nível da classe) somada entre as classes da ficha. `usados` é o
 * único estado armazenado. Disponível = total − usados.
 *
 * config_layout.slots = {
 *   ativo: true,
 *   rotulo: "Espaços de Magia",
 *   circulo_max: 9,
 *   preparacao: true,
 *   cd_formula: "8 + proficiencia + mod(carisma)",
 *   grades: { "<classe_id>": { "1": [2], "2": [3], "3": [3,2] } },   // nível → slots por círculo
 *   recuperacao: { "<id_descanso>": { modo: "total" | "nada" } },
 * }
 */

export function slotsAtivos(config) {
  return config?.slots?.ativo === true
}

export function configSlots(config) {
  return config?.slots || {}
}

/**
 * Linha da grade que vale para um nível: a MAIOR linha definida que não passa
 * do nível. Assim o mestre pode preencher só os níveis em que a grade muda.
 * @returns {number[]|null}
 */
export function linhaDaGrade(grade, nivel) {
  if (!grade || typeof grade !== 'object') return null
  const n = Number(nivel) || 0
  let melhor = null
  let melhorNivel = -1
  for (const chave of Object.keys(grade)) {
    const k = Number(chave)
    if (Number.isFinite(k) && k <= n && k > melhorNivel && Array.isArray(grade[chave])) {
      melhorNivel = k
      melhor = grade[chave]
    }
  }
  return melhor
}

/**
 * Totais por círculo, somando as grades de TODAS as classes da ficha.
 * (multiclasse: soma simples — regras especiais ficam a cargo da grade do mestre)
 * @param {Array} classesFicha — [{ classe_id, nivel }]
 * @returns {Record<number, number>} { 1: 3, 2: 2 }
 */
export function slotsTotais(config, classesFicha = []) {
  const totais = {}
  if (!slotsAtivos(config)) return totais
  const grades = configSlots(config).grades || {}

  for (const cf of classesFicha) {
    const linha = linhaDaGrade(grades[cf.classe_id], cf.nivel)
    if (!linha) continue
    linha.forEach((qtd, i) => {
      const circulo = i + 1
      const n = Math.max(0, Math.floor(Number(qtd) || 0))
      if (n > 0) totais[circulo] = (totais[circulo] || 0) + n
    })
  }
  return totais
}

/** { [circulo]: usados } a partir das linhas de slots_ficha. */
export function usadosPorCirculo(linhas = []) {
  const mapa = {}
  for (const l of linhas) {
    const c = Number(l.circulo)
    if (Number.isFinite(c)) mapa[c] = Math.max(0, Number(l.usados) || 0)
  }
  return mapa
}

/** Disponível por círculo = total − usados (nunca negativo). */
export function slotsDisponiveis(totais, usados = {}) {
  const disp = {}
  for (const [c, total] of Object.entries(totais || {})) {
    disp[c] = Math.max(0, Number(total) - (Number(usados[c]) || 0))
  }
  return disp
}

/**
 * Círculos em que dá para gastar um slot, do mínimo para cima.
 * Alimenta a escolha do círculo ao usar um poder (20.4).
 */
export function circulosGastaveis(totais, usados = {}, circuloMinimo = 1) {
  const disp = slotsDisponiveis(totais, usados)
  return Object.keys(disp)
    .map(Number)
    .filter(c => c >= Number(circuloMinimo) && disp[c] > 0)
    .sort((a, b) => a - b)
}

/**
 * Gasta um slot do círculo dado. Custo falha ANTES do efeito, com motivo claro.
 * @returns {{ ok: boolean, usados: number, motivo?: string }}
 */
export function gastarSlot(circulo, totais, usados = {}) {
  const c = Number(circulo)
  const total = Number(totais?.[c]) || 0
  const jaUsados = Number(usados[c]) || 0
  if (total <= 0) return { ok: false, usados: jaUsados, motivo: `Sem slots de ${c}º círculo.` }
  if (jaUsados >= total) return { ok: false, usados: jaUsados, motivo: `Slots de ${c}º círculo esgotados (${total}/${total}).` }
  return { ok: true, usados: jaUsados + 1 }
}

/** Devolve um slot (o mestre corrigindo um engano). Nunca abaixo de 0. */
export function devolverSlot(circulo, usados = {}) {
  const c = Number(circulo)
  return Math.max(0, (Number(usados[c]) || 0) - 1)
}

/**
 * Novo mapa de `usados` após um descanso. Mesma estrutura de recuperação dos
 * pools, indexada pelo id do descanso.
 *   total → zera os usados (todos os slots voltam)
 *   nada  → mantém
 * @returns {Record<number, number>} novo mapa de usados
 */
export function recuperarSlots(config, descansoId, usados = {}) {
  const regra = configSlots(config).recuperacao?.[descansoId] || { modo: 'nada' }
  if (regra.modo !== 'total') return { ...usados }
  const zerado = {}
  for (const c of Object.keys(usados)) zerado[c] = 0
  return zerado
}

/**
 * O que o descanso muda nos slots, para o preview do DescansoBar.
 * @returns {Array<{ circulo, de, para }>}
 */
export function diffRecuperacaoSlots(config, descansoId, usados = {}) {
  const novo = recuperarSlots(config, descansoId, usados)
  const lista = []
  for (const c of Object.keys(usados)) {
    const de = Number(usados[c]) || 0
    const para = Number(novo[c]) || 0
    if (de !== para) lista.push({ circulo: Number(c), de, para })
  }
  return lista.sort((a, b) => a.circulo - b.circulo)
}
