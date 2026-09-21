/**
 * Fase 35.3 — toca um som enviado pelo usuário (ex.: crítico próprio).
 * Reaproveita o mesmo objeto por URL: evita baixar de novo a cada rolagem.
 */
const cache = new Map()

export function tocarSomProprio(url, { volume = 0.6 } = {}) {
  if (!url) return false
  try {
    let audio = cache.get(url)
    if (!audio) {
      audio = new Audio(url)
      audio.preload = 'auto'
      cache.set(url, audio)
    }
    audio.volume = Math.max(0, Math.min(1, Number(volume) || 0))
    audio.currentTime = 0
    const p = audio.play()
    if (p?.catch) p.catch(() => {}) // navegador pode exigir um clique antes
    return true
  } catch {
    return false // sem áudio disponível: segue sem som, nunca quebra a tela
  }
}
