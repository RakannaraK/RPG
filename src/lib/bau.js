/**
 * Fase 49 — baú do grupo (puro): para onde um item pode ir.
 */

/** Fichas em que eu posso guardar coisas: as minhas e as que eu edito. */
export const fichasQueUso = (fichas = [], meuId) =>
  fichas.filter(f => f.dono_id === meuId || (f.editores || []).includes(meuId))

/** A quem dá para entregar um item: outros personagens da mesa. */
export const destinosParaDar = (fichas = [], fichaAtualId) =>
  fichas.filter(f => f.id !== fichaAtualId && (f.tipo_ficha ?? 'personagem') === 'personagem')

export function validarItemBau({ nome, descricao } = {}) {
  const n = String(nome || '').trim()
  if (!n) return { ok: false, erro: 'Dê um nome ao item.' }
  if (n.length > 120) return { ok: false, erro: 'Nome com até 120 letras.' }
  return { ok: true, linha: { nome: n, descricao: String(descricao || '').trim() || null } }
}
