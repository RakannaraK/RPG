/**
 * Fase 32 — combate avançado (puro, sem banco nem React):
 * recarga em turnos, carga de ultimate, efeitos por rodada e troca de reserva.
 */

const inteiro = v => {
  const n = Number(v)
  return Number.isFinite(n) ? Math.trunc(n) : null
}

/**
 * Situação de uma habilidade da ficha agora.
 * @param hf  linha de habilidades_ficha { recarga_restante, carga_atual }
 * @param hab habilidade do sistema { recarga_turnos, carga_max, carga_por_rodada }
 * @returns {{ ehUltimate, carga, cargaMax, cheia, emRecarga, recargaRestante, pronta, motivo }}
 */
export function estadoDaHabilidade(hf = {}, hab = {}) {
  const cargaMax = inteiro(hab.carga_max)
  const ehUltimate = cargaMax != null && cargaMax > 0
  const carga = Math.max(0, inteiro(hf.carga_atual) ?? 0)
  const cheia = !ehUltimate || carga >= cargaMax
  const recargaRestante = inteiro(hf.recarga_restante)
  const emRecarga = recargaRestante != null && recargaRestante > 0
  let motivo = null
  if (emRecarga) motivo = `Em recarga: falta${recargaRestante === 1 ? '' : 'm'} ${recargaRestante} turno${recargaRestante === 1 ? '' : 's'}`
  else if (!cheia) motivo = `Carga ${carga}/${cargaMax}`
  return { ehUltimate, carga, cargaMax, cheia, emRecarga, recargaRestante, pronta: !motivo, motivo }
}

/** O que gravar em habilidades_ficha ao USAR a habilidade (recarga entra, ultimate zera). */
export function aoUsarHabilidade(hf = {}, hab = {}) {
  const { ehUltimate } = estadoDaHabilidade(hf, hab)
  const recarga = inteiro(hab.recarga_turnos)
  const patch = {}
  if (recarga != null && recarga > 0) patch.recarga_restante = recarga
  if (ehUltimate) patch.carga_atual = 0
  return patch
}

/** Carga na mão (o mestre premia um feito). Fica entre 0 e a carga máxima. */
export function ajustarCarga(hf = {}, hab = {}, delta = 0) {
  const { cargaMax, carga, ehUltimate } = estadoDaHabilidade(hf, hab)
  if (!ehUltimate) return { carga_atual: 0 }
  return { carga_atual: Math.max(0, Math.min(cargaMax, carga + (inteiro(delta) ?? 0))) }
}

/** Zera a recarga na mão (fora de combate, ou o mestre libera). */
export const liberarRecarga = () => ({ recarga_restante: null })

/**
 * Efeitos por rodada das condições de um combatente (veneno, regeneração…).
 * `valor` é fixo; `notacao` precisa ser rolada por quem chamar.
 * @returns [{ condicaoId, nome, tipo: 'dano'|'cura', valor|null, notacao|null }]
 */
export function efeitosDoTurno(condicoes = [], combatenteId) {
  return (condicoes || [])
    .filter(c => c.combatente_id === combatenteId && c.efeito_turno)
    .map(c => {
      const e = c.efeito_turno || {}
      const tipo = e.tipo === 'cura' ? 'cura' : 'dano'
      const notacao = typeof e.notacao === 'string' && e.notacao.trim() ? e.notacao.trim() : null
      const valor = notacao ? null : inteiro(e.valor)
      return { condicaoId: c.id, nome: c.nome || (tipo === 'cura' ? 'Regeneração' : 'Dano contínuo'), tipo, valor, notacao }
    })
    .filter(e => e.notacao || (e.valor != null && e.valor !== 0))
}

/** "Veneno: −3 de vida" / "Regeneração: +2 de vida" */
export const textoEfeitoTurno = (efeito, total) =>
  `${efeito.nome}: ${efeito.tipo === 'cura' ? '+' : '−'}${Math.abs(Number(total) || 0)} de vida`

/**
 * Troca de reserva: o suplente entra no lugar do titular, herdando a posição na
 * iniciativa; o titular vai para o banco (nada é apagado).
 * @returns {{ patches: [{ id, ...campos }], narracao }}
 * @throws se a escolha não faz sentido (quem entra tem de estar na reserva)
 */
export function planejarTroca(combatentes = [], saiId, entraId) {
  const sai = combatentes.find(c => c.id === saiId)
  const entra = combatentes.find(c => c.id === entraId)
  if (!sai || !entra) throw new Error('Escolha quem sai e quem entra.')
  if (sai.id === entra.id) throw new Error('Escolha dois combatentes diferentes.')
  if (!entra.reserva) throw new Error(`${entra.nome} já está em jogo.`)
  if (sai.reserva) throw new Error(`${sai.nome} já está na reserva.`)
  return {
    patches: [
      { id: sai.id, reserva: true },
      { id: entra.id, reserva: false, ordem: sai.ordem ?? null, iniciativa: sai.iniciativa ?? null },
    ],
    narracao: `${entra.nome} entra no lugar de ${sai.nome}`,
  }
}

/** Em jogo = fora da reserva (a ordem de iniciativa só conta quem está em jogo). */
export const emJogo = (combatentes = []) => combatentes.filter(c => !c.reserva)
export const naReserva = (combatentes = []) => combatentes.filter(c => c.reserva)
