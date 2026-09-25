/**
 * Fase 43 — trilha sonora sincronizada e mesa de efeitos (puro).
 *
 * A música é um vídeo do YouTube. O banco guarda "estava no segundo X no
 * instante T"; cada navegador calcula onde deveria estar agora e só corrige o
 * próprio tocador se escorregou mais que a tolerância (corrigir sempre dá soluço).
 */

/** Efeitos da mesa: presets do sintetizador (F11/FV.4) + três de ambiente. */
export const EFEITOS_MESA = [
  { id: 'trovao', nome: 'Trovão' },
  { id: 'sino', nome: 'Sino' },
  { id: 'porta', nome: 'Porta' },
  { id: 'lamina', nome: 'Lâmina' },
  { id: 'impacto', nome: 'Impacto' },
  { id: 'disparo', nome: 'Disparo' },
  { id: 'projetil', nome: 'Flecha' },
  { id: 'arcano', nome: 'Magia' },
  { id: 'cura', nome: 'Cura' },
  { id: 'escudo', nome: 'Escudo' },
  { id: 'critico', nome: 'Crítico' },
  { id: 'falha', nome: 'Falha' },
]

const ID = /^[A-Za-z0-9_-]{11}$/

/** "1h2m3s", "90", "1m30" -> segundos. */
function lerTempo(t) {
  if (!t) return 0
  if (/^\d+$/.test(t)) return Number(t)
  const m = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/.exec(t)
  return m ? (Number(m[1] || 0) * 3600 + Number(m[2] || 0) * 60 + Number(m[3] || 0)) : 0
}

/**
 * Link do YouTube (watch, youtu.be, shorts, embed, music, ou o id puro) ->
 * `{ id, inicio }`, ou null se não for um vídeo.
 */
export function extrairVideo(texto) {
  const bruto = String(texto || '').trim()
  if (ID.test(bruto)) return { id: bruto, inicio: 0 }
  let url
  try { url = new URL(/^https?:\/\//i.test(bruto) ? bruto : `https://${bruto}`) } catch { return null }
  const host = url.hostname.replace(/^(www|m|music)\./, '')
  let id = null
  if (host === 'youtu.be') id = url.pathname.slice(1).split('/')[0]
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    id = url.searchParams.get('v') || (/^\/(?:shorts|embed|live)\/([^/?]+)/.exec(url.pathname) || [])[1]
  }
  if (!id || !ID.test(id)) return null
  return { id, inicio: lerTempo(url.searchParams.get('t') || url.searchParams.get('start')) }
}

/**
 * Onde a música deveria estar agora (segundos). Com `duracao` e `repetir`,
 * dá a volta; sem repetir, para no fim.
 */
export function posicaoAgora(estado, agora = Date.now(), duracao = 0) {
  if (!estado) return 0
  const base = Number(estado.posicao_s) || 0
  if (!estado.tocando) return base
  const passou = Math.max(0, (agora - new Date(estado.marcado_em).getTime()) / 1000)
  const pos = base + passou
  if (!duracao) return pos
  return estado.repetir ? pos % duracao : Math.min(pos, duracao)
}

/** Diferença que justifica pular o tocador (a de ida e volta na rede fica abaixo disto). */
export const TOLERANCIA_S = 2

export function precisaAjustar(atual, alvo, tolerancia = TOLERANCIA_S) {
  return Math.abs((Number(atual) || 0) - alvo) > tolerancia
}

/**
 * Chegou um efeito novo para tocar? Só se o instante mudou e é recente —
 * quem abre a página depois não ouve o trovão de 10 minutos atrás.
 */
export function efeitoParaTocar(antes, depois, agora = Date.now(), janelaMs = 5000) {
  if (!depois?.efeito || !depois.efeito_em) return null
  // compara como instante: o banco devolve "+00:00", o navegador manda "Z"
  if (antes?.efeito_em && Date.parse(antes.efeito_em) === Date.parse(depois.efeito_em)) return null
  const idade = agora - new Date(depois.efeito_em).getTime()
  return idade >= -janelaMs && idade <= janelaMs ? depois.efeito : null
}
