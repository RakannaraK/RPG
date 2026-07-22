/**
 * Fase 25.4 — Motor de distribuição por PRIORIDADES (função PURA).
 * Não acessa banco nem React.
 *
 * Etapa 'prioridade_grupos': o jogador ORDENA os grupos — o grupo na posição i
 * da ordem recebe valores_prioridade[i]. Depois distribui ESSE valor entre os
 * membros do grupo (pontos ADICIONAIS sobre base_por_membro), respeitando
 * maximo_por_membro. Contrato: gastar EXATAMENTE o valor da prioridade.
 *
 * Etapa 'pontos_livres': distribuir N pontos entre itens de um alvo (ex:
 * linhas de poder nativas), respeitando maximo_por_item. Mesmo contrato: gasto
 * EXATO.
 */

/** Valor de prioridade do grupo pela posição em ordemGrupos (null se ausente/incompleta). */
export function prioridadeDoGrupo(ordemGrupos, valoresPrioridade, grupoId) {
  const i = (ordemGrupos || []).indexOf(grupoId)
  if (i === -1 || i >= (valoresPrioridade || []).length) return null
  return Number(valoresPrioridade[i])
}

/**
 * Valida que ordemGrupos é uma ordenação completa dos grupos (mesma
 * quantidade, sem repetição, todos presentes).
 */
export function validarOrdemGrupos(grupos = [], ordemGrupos = []) {
  const ids = grupos.map(g => g.id)
  if (ordemGrupos.length !== ids.length) {
    return { valido: false, erro: `Ordene todos os ${ids.length} grupos.` }
  }
  const vistos = new Set()
  for (const id of ordemGrupos) {
    if (!ids.includes(id)) return { valido: false, erro: `Grupo desconhecido: ${id}.` }
    if (vistos.has(id)) return { valido: false, erro: 'Grupo repetido na ordem.' }
    vistos.add(id)
  }
  return { valido: true }
}

/** Valor final de um membro: base + o que foi alocado a ele. */
export function valorFinalMembro(basePorMembro, alocado) {
  return (Number(basePorMembro) || 0) + Math.max(0, Math.floor(Number(alocado) || 0))
}

/**
 * Valida a distribuição de UM grupo: soma da alocação == prioridade
 * (exatamente, nem sobra nem falta) e nenhum membro passa do máximo.
 * @param {object} p { membros, prioridade, alocacao, basePorMembro, maximoPorMembro }
 *   membros: array de ids; alocacao: { [membroId]: pontosAdicionais }
 * @returns {{ valido, gasto, restante, erro? }}
 */
export function validarDistribuicaoGrupo({ membros = [], prioridade = 0, alocacao = {}, basePorMembro = 0, maximoPorMembro = null }) {
  let gasto = 0
  for (const m of membros) {
    const a = Math.max(0, Math.floor(Number(alocacao[m]) || 0))
    gasto += a
    if (maximoPorMembro != null) {
      const final = valorFinalMembro(basePorMembro, a)
      if (final > Number(maximoPorMembro)) {
        return { valido: false, gasto, restante: prioridade - gasto, erro: `Excede o máximo (${maximoPorMembro}).` }
      }
    }
  }
  const restante = prioridade - gasto
  if (restante !== 0) {
    return { valido: false, gasto, restante, erro: restante > 0 ? `Falta distribuir ${restante} ponto(s).` : `Excedeu em ${-restante} ponto(s).` }
  }
  return { valido: true, gasto, restante: 0 }
}

/**
 * Valida a distribuição de pontos livres entre itens (ex: linhas nativas):
 * mesmo contrato — soma EXATA, respeita o máximo por item.
 * @param {object} p { itens, pontos, alocacao, maximoPorItem }
 * @returns {{ valido, gasto, restante, erro? }}
 */
export function validarPontosLivres({ itens = [], pontos = 0, alocacao = {}, maximoPorItem = null }) {
  let gasto = 0
  for (const id of itens) {
    const a = Math.max(0, Math.floor(Number(alocacao[id]) || 0))
    gasto += a
    if (maximoPorItem != null && a > Number(maximoPorItem)) {
      return { valido: false, gasto, restante: pontos - gasto, erro: `Excede o máximo por item (${maximoPorItem}).` }
    }
  }
  const restante = pontos - gasto
  if (restante !== 0) {
    return { valido: false, gasto, restante, erro: restante > 0 ? `Falta distribuir ${restante} ponto(s).` : `Excedeu em ${-restante} ponto(s).` }
  }
  return { valido: true, gasto, restante: 0 }
}
