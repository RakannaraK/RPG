/**
 * Fase 19.6 — Recompensas por nível (função PURA).
 *
 * Recompensas são TEXTO-GUIA ("Criar uma habilidade própria", "+2 pontos de
 * atributo"). O app não aplica nada mecanicamente: vira um checklist que o
 * jogador marca depois de aplicar nas telas normais.
 *
 * Uma recompensa é de uma CLASSE (dispara no nível daquela classe) ou do SISTEMA
 * (classe_id NULL — dispara no nível TOTAL da ficha).
 */

/**
 * Recompensas destravadas ao chegar num nível.
 * @param {Array} recompensas — linhas de recompensas_nivel do sistema
 * @param {object} ctx
 * @param {string|null} ctx.classeId    — classe que recebeu o nível (null se a ficha não tem classes)
 * @param {number} ctx.nivelClasse      — nível novo NAQUELA classe
 * @param {number} ctx.nivelTotal       — nível total novo da ficha
 * @returns {Array} recompensas a virar pendência
 */
export function recompensasAoSubir(recompensas, { classeId = null, nivelClasse = 0, nivelTotal = 0 } = {}) {
  return (recompensas || []).filter(r => {
    const n = Number(r.nivel)
    if (r.classe_id) {
      return classeId != null && r.classe_id === classeId && n === Number(nivelClasse)
    }
    return n === Number(nivelTotal)
  })
}

/**
 * Junta as recompensas do sistema com o estado na ficha (concluída ou não).
 * @param {Array} recompensasFicha — linhas de recompensas_ficha (com recompensa_id)
 * @param {Array} recompensas      — linhas de recompensas_nivel
 * @returns {Array} { id, recompensa, concluida }
 */
export function juntarRecompensas(recompensasFicha, recompensas) {
  return (recompensasFicha || [])
    .map(rf => ({
      ...rf,
      recompensa: (recompensas || []).find(r => r.id === rf.recompensa_id) || null,
    }))
    .filter(rf => rf.recompensa)
    .sort((a, b) => {
      if (a.concluida !== b.concluida) return a.concluida ? 1 : -1 // pendentes primeiro
      return Number(a.recompensa.nivel) - Number(b.recompensa.nivel)
    })
}

/** Quantas ainda faltam aplicar. */
export function contarPendentes(recompensasFicha) {
  return (recompensasFicha || []).filter(rf => !rf.concluida).length
}
