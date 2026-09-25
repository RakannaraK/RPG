/**
 * Fase 47 — convite por link e jogador convidado (puro).
 */

export const LIMITE_NOME_CONVIDADO = 30

/** Aceita o código puro ou o link inteiro colado (".../convite/abc123"). */
export function codigoDoConvite(texto) {
  const t = String(texto || '').trim()
  const m = /\/convite\/([^/?#\s]+)/.exec(t)
  return (m ? decodeURIComponent(m[1]) : t).toLowerCase()
}

export const linkDeConvite = (origem, codigo) => `${origem}/convite/${encodeURIComponent(codigo)}`

export function validarNomeConvidado(nome) {
  const n = String(nome || '').trim().replace(/\s+/g, ' ')
  if (!n) return { ok: false, erro: 'Diga como quer ser chamado na mesa.' }
  if (n.length > LIMITE_NOME_CONVIDADO) return { ok: false, erro: `Até ${LIMITE_NOME_CONVIDADO} letras.` }
  return { ok: true, nome: n }
}

/** Convidado = login anônimo do Supabase (a sessão diz). */
export const souConvidado = session => !!session?.user?.is_anonymous

/**
 * Para onde ir depois de entrar pela tela de login. Só volta para um convite:
 * qualquer outro valor (inclusive um link de fora) cai no painel.
 */
export function destinoDepoisDoLogin(state) {
  const d = state?.depois
  return typeof d === 'string' && /^\/convite\/[^/]+$/.test(d) ? d : '/dashboard'
}
