/**
 * Fase 37.4 — capas de mesa (puro).
 *
 * Cada capa é um motivo da biblioteca de arte repetido numa faixa, na cor do
 * tema de quem está olhando. O banco guarda só o `id` (mesas.capa); o desenho
 * nunca viaja. Nenhuma imagem: a mesa "ilustrada" não pesa nada.
 */

export const CAPAS = [
  { id: 'torneio',    nome: 'Torneio',    arte: 'espadas',    inclinacao: -8 },
  { id: 'masmorra',   nome: 'Masmorra',   arte: 'lanterna',   inclinacao: 0 },
  { id: 'arcano',     nome: 'Arcano',     arte: 'tomo',       inclinacao: 6 },
  { id: 'selvagem',   nome: 'Selvagem',   arte: 'garra',      inclinacao: -12 },
  { id: 'expedicao',  nome: 'Expedição',  arte: 'mapa',       inclinacao: 4 },
  { id: 'alquimia',   nome: 'Alquimia',   arte: 'pocao',      inclinacao: -5 },
  { id: 'guarda',     nome: 'Guarda',     arte: 'escudo',     inclinacao: 0 },
  { id: 'sorte',      nome: 'Sorte',      arte: 'd20',        inclinacao: 10 },
]

/** A capa escolhida, ou null quando a mesa não tem (ou o id não existe mais). */
export function acharCapa(id) {
  if (!id) return null
  return CAPAS.find(c => c.id === id) || null
}
