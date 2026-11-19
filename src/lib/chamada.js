// Fase 65 — peças puras da chamada de voz e vídeo (WebRTC em malha).

import { t } from '../i18n'

export const MAX_PARTICIPANTES = 8
const ICE_PADRAO = [{ urls: 'stun:stun.l.google.com:19302' }]
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const TIPOS = ['oferta', 'resposta', 'candidato']
const MAX_SDP = 20000
const MAX_CANDIDATO = 2000

/** Lê `VITE_ICE_SERVERS` (JSON); inválido ou vazio devolve só o STUN padrão. */
export function servidoresIce(texto) {
  if (!texto) return ICE_PADRAO
  try {
    const v = JSON.parse(texto)
    return Array.isArray(v) && v.length ? v : ICE_PADRAO
  } catch {
    return ICE_PADRAO
  }
}

/** Só um dos dois lados cria a oferta, então não há colisão. */
export function quemOferece(meuId, outroId) {
  return meuId < outroId
}

/** Broadcast é dado não confiável: devolve o sinal limpo ou `null`. */
export function normalizarSinal(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null
  const { de, para, tipo, sdp, candidato } = payload
  if (!UUID.test(de) || !UUID.test(para) || !TIPOS.includes(tipo)) return null
  if (tipo === 'candidato') {
    if (!candidato || typeof candidato !== 'object' || Array.isArray(candidato)) return null
    if (JSON.stringify(candidato).length > MAX_CANDIDATO) return null
    return { de, para, tipo, candidato }
  }
  if (typeof sdp !== 'string' || !sdp || sdp.length > MAX_SDP) return null
  return { de, para, tipo, sdp }
}

const texto = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '')

/** Presence -> lista `{ id, usuarioId, nome, avatar, mic, cam }` sem repetição, até o teto. */
export function participantesDaPresenca(estado) {
  const lista = []
  if (!estado || typeof estado !== 'object') return lista
  for (const [chave, metas] of Object.entries(estado)) {
    const m = Array.isArray(metas) ? metas[0] : null
    if (!m || typeof m !== 'object' || !UUID.test(chave) || lista.some(p => p.id === chave)) continue
    const avatar = texto(m.avatar, 500)
    lista.push({
      id: chave,
      usuarioId: UUID.test(m.usuarioId) ? m.usuarioId : null,
      nome: texto(m.nome, 40) || t('Jogador'),
      avatar: /^https?:\/\//.test(avatar) ? avatar : null,
      mic: m.mic !== false,
      cam: m.cam === true,
    })
    if (lista.length >= MAX_PARTICIPANTES) break
  }
  return lista
}
