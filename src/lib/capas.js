/**
 * Fase 37.4 — capas de mesa (puro).
 *
 * Cada capa é um motivo da biblioteca de arte repetido numa faixa, na cor do
 * tema de quem está olhando. O banco guarda só o `id` (mesas.capa); o desenho
 * nunca viaja. Nenhuma imagem: a mesa "ilustrada" não pesa nada.
 */

import { t } from '../i18n'

export const CAPAS = [
  { id: 'torneio',    nome: t('Torneio'),    arte: 'espadas',    inclinacao: -8 },
  { id: 'masmorra',   nome: t('Masmorra'),   arte: 'lanterna',   inclinacao: 0 },
  { id: 'arcano',     nome: t('Arcano'),     arte: 'tomo',       inclinacao: 6 },
  { id: 'selvagem',   nome: t('Selvagem'),   arte: 'garra',      inclinacao: -12 },
  { id: 'expedicao',  nome: t('Expedição'),  arte: 'mapa',       inclinacao: 4 },
  { id: 'alquimia',   nome: t('Alquimia'),   arte: 'pocao',      inclinacao: -5 },
  { id: 'guarda',     nome: t('Guarda'),     arte: 'escudo',     inclinacao: 0 },
  { id: 'sorte',      nome: t('Sorte'),      arte: 'd20',        inclinacao: 10 },
]

/** A capa escolhida, ou null quando a mesa não tem (ou o id não existe mais). */
export function acharCapa(id) {
  if (!id) return null
  return CAPAS.find(c => c.id === id) || null
}

/**
 * F52 — capa que a mesa MOSTRA: a escolhida pelo dono ou, sem escolha, uma
 * derivada do id (sempre a mesma para a mesma mesa). Assim todo cartão tem
 * identidade própria sem ninguém precisar configurar nada.
 */
export function capaDaMesa(mesa) {
  const escolhida = acharCapa(mesa?.capa)
  if (escolhida) return escolhida.id
  const id = String(mesa?.id || '')
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return CAPAS[h % CAPAS.length].id
}
