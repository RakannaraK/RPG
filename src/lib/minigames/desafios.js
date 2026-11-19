import { NOMES_DIFICULDADE, JOGOS, classificar, textoClassificacao } from './resultado'
import { t } from '../../i18n'

/**
 * Fase 28.5 — regras puras dos desafios (o mestre põe vários jogadores na
 * mesma partida: mesma semente, mesma configuração).
 */

export const tituloDesafio = d =>
  `${JOGOS[d.tipo]?.nome || d.tipo} (${NOMES_DIFICULDADE[d.dificuldade] || d.dificuldade})`

/** Desafios abertos em que eu participo e ainda não joguei. */
export function pendentesDoJogador(desafios, respondidos, meuId) {
  const jaJoguei = new Set(respondidos)
  return desafios.filter(d => d.status === 'aberto' && d.participantes?.includes(meuId) && !jaJoguei.has(d.id))
}

/**
 * Situação de um desafio a partir dos resultados da mesa: classificação de
 * quem já jogou (com meta) e quem ainda falta.
 */
export function situacaoDesafio(desafio, resultados, nomeDe = id => id) {
  const doDesafio = resultados.filter(r => r.desafio_id === desafio.id && desafio.participantes.includes(r.usuario_id))
  const jogaram = new Set(doDesafio.map(r => r.usuario_id))
  return {
    classificados: classificar(doDesafio.map(r => ({ ...r, nome: nomeDe(r.usuario_id) })), desafio.meta ?? null),
    faltam: desafio.participantes.filter(id => !jogaram.has(id)),
    completo: desafio.participantes.every(id => jogaram.has(id)),
  }
}

/** Texto do feed ao encerrar: classificação, meta e quem não jogou. */
export function textoEncerramento(desafio, situacao, nomeDe = id => id) {
  const partes = [t('🏆 Desafio encerrado: {titulo}', { titulo: tituloDesafio(desafio) })]
  if (desafio.motivo) partes.push(desafio.motivo)
  partes.push(situacao.classificados.length ? textoClassificacao(situacao.classificados) : t('ninguém jogou'))
  if (desafio.meta != null) partes.push(t('meta {meta}', { meta: desafio.meta }))
  if (situacao.faltam.length) partes.push(t('não jogou: {nomes}', { nomes: situacao.faltam.map(nomeDe).join(', ') }))
  return partes.join(' — ')
}

export function textoLancamento(desafio, nomeDe = id => id) {
  const partes = [t('📣 Desafio: {titulo}', { titulo: tituloDesafio(desafio) })]
  if (desafio.motivo) partes.push(desafio.motivo)
  partes.push(t('participantes: {nomes}', { nomes: desafio.participantes.map(nomeDe).join(', ') }))
  if (desafio.meta != null) partes.push(t('meta {meta}', { meta: desafio.meta }))
  return partes.join(' — ')
}
