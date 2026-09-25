/**
 * Fase 44 — ferramentas de segurança da mesa (puro).
 * Nada aqui sabe quem escreveu: linhas, véus, combinados e o X-Card são anônimos.
 */

export const TIPOS_LIMITE = [
  { id: 'linha', nome: 'Linhas', explica: 'Não aparecem no jogo, nem de passagem.' },
  { id: 'veu', nome: 'Véus', explica: 'Podem acontecer, mas fora de cena — corta para depois.' },
  { id: 'combinado', nome: 'Combinados', explica: 'Como a mesa funciona: horário, celular, spoilers…' },
]

export const LIMITE_TEXTO = 200

/** Por quanto tempo o aviso do X-Card fica na tela de quem chega depois. */
export const JANELA_XCARD_MS = 10 * 60 * 1000

export function validarLimite(tipo, texto) {
  const t = String(texto || '').trim()
  if (!TIPOS_LIMITE.some(x => x.id === tipo)) return { ok: false, erro: 'Tipo inválido.' }
  if (!t) return { ok: false, erro: 'Escreva algo.' }
  if (t.length > LIMITE_TEXTO) return { ok: false, erro: `Até ${LIMITE_TEXTO} letras.` }
  return { ok: true, texto: t }
}

/** { linha: [...], veu: [...], combinado: [...] }, cada lista em ordem de chegada. */
export function agruparLimites(limites = []) {
  const grupos = Object.fromEntries(TIPOS_LIMITE.map(t => [t.id, []]))
  for (const l of [...limites].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at))) {
    grupos[l.tipo]?.push(l)
  }
  return grupos
}

/**
 * O toque de X-Card que ainda deve aparecer para esta pessoa: o mais recente
 * dentro da janela e que ela ainda não dispensou.
 */
export function xcardAtivo(toques = [], dispensadoAte = 0, agora = Date.now(), janela = JANELA_XCARD_MS) {
  let ultimo = null
  for (const t of toques) {
    const em = Date.parse(t.created_at)
    if (agora - em <= janela && em > dispensadoAte && (!ultimo || em > Date.parse(ultimo.created_at))) ultimo = t
  }
  return ultimo
}
