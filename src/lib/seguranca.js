import { t } from '../i18n'
/**
 * Fase 44 — ferramentas de segurança da mesa (puro).
 * Nada aqui sabe quem escreveu: linhas, véus, combinados e o X-Card são anônimos.
 */

export const TIPOS_LIMITE = [
  { id: 'linha', nome: t('Linhas'), explica: t('Não aparecem no jogo, nem de passagem.') },
  { id: 'veu', nome: t('Véus'), explica: t('Podem acontecer, mas fora de cena — corta para depois.') },
  { id: 'combinado', nome: t('Combinados'), explica: t('Como a mesa funciona: horário, celular, spoilers…') },
]

export const LIMITE_TEXTO = 200

/** Por quanto tempo o aviso do X-Card fica na tela de quem chega depois. */
export const JANELA_XCARD_MS = 10 * 60 * 1000

export function validarLimite(tipo, texto) {
  const txt = String(texto || '').trim()
  if (!TIPOS_LIMITE.some(x => x.id === tipo)) return { ok: false, erro: t('Tipo inválido.') }
  if (!txt) return { ok: false, erro: t('Escreva algo.') }
  if (txt.length > LIMITE_TEXTO) return { ok: false, erro: t('Até {max} letras.', { max: LIMITE_TEXTO }) }
  return { ok: true, texto: txt }
}

/** { linha: [...], veu: [...], combinado: [...] }, cada lista em ordem de chegada. */
export function agruparLimites(limites = []) {
  const grupos = Object.fromEntries(TIPOS_LIMITE.map(tp => [tp.id, []]))
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
  for (const toque of toques) {
    const em = Date.parse(toque.created_at)
    if (agora - em <= janela && em > dispensadoAte && (!ultimo || em > Date.parse(ultimo.created_at))) ultimo = toque
  }
  return ultimo
}
