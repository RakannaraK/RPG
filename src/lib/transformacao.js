/**
 * Fase 33 — transformações (puro). Uma FORMA é uma ficha pendurada na ficha
 * dona (`forma_de_id`); a dona guarda qual está ativa (`forma_ativa_id`).
 * Enquanto transformado, quem vale — atributos, vida, habilidades — é a forma.
 */

/** Formas de uma ficha, em ordem de criação. */
export const formasDaFicha = (fichas = [], baseId) =>
  fichas.filter(f => f.forma_de_id === baseId)
    .sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0))

/**
 * A ficha que está valendo agora: a forma ativa, se houver (e se ela existir de
 * verdade na lista). Sem forma ativa, é a própria base.
 */
export function fichaValendo(base, fichas = []) {
  if (!base?.forma_ativa_id) return base
  return fichas.find(f => f.id === base.forma_ativa_id && f.forma_de_id === base.id) || base
}

export const estaTransformado = (base, fichas = []) => fichaValendo(base, fichas)?.id !== base?.id

/** "Aria (Lobo)" quando transformado; só "Aria" quando não. */
export function rotuloDaForma(base, fichas = []) {
  const atual = fichaValendo(base, fichas)
  if (!base) return ''
  if (!atual || atual.id === base.id) return base.nome_personagem || ''
  return `${base.nome_personagem || ''} (${atual.nome_personagem || 'forma'})`.trim()
}

/**
 * Patch para transformar (ou voltar, com formaId null/igual à ativa).
 * @throws se a forma não pertence a esta ficha
 */
export function planejarTransformacao(base, formaId, fichas = []) {
  if (!base) throw new Error('Ficha não encontrada.')
  if (!formaId || formaId === base.forma_ativa_id) return { forma_ativa_id: null }
  const forma = fichas.find(f => f.id === formaId)
  if (!forma || forma.forma_de_id !== base.id) throw new Error('Esta forma não é desta ficha.')
  return { forma_ativa_id: formaId }
}

/** Formas e cópias em jogo não entram na lista de personagens da mesa. */
export const ehFichaDeJogador = f => f?.tipo_ficha === 'personagem' && !f?.forma_de_id
