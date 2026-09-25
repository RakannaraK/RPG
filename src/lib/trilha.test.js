import { describe, it, expect } from 'vitest'
import { efeitoParaTocar, extrairVideo, posicaoAgora, precisaAjustar } from './trilha'

describe('F43 — trilha sincronizada', () => {
  it('lê os formatos de link do YouTube', () => {
    const id = 'dQw4w9WgXcQ'
    expect(extrairVideo(`https://www.youtube.com/watch?v=${id}&list=PL1`)).toEqual({ id, inicio: 0 })
    expect(extrairVideo(`https://youtu.be/${id}?t=90`)).toEqual({ id, inicio: 90 })
    expect(extrairVideo(`youtube.com/watch?v=${id}&t=1m30s`)).toEqual({ id, inicio: 90 })
    expect(extrairVideo(`https://m.youtube.com/shorts/${id}`)?.id).toBe(id)
    expect(extrairVideo(`https://music.youtube.com/watch?v=${id}`)?.id).toBe(id)
    expect(extrairVideo(`https://www.youtube.com/embed/${id}?start=5`)).toEqual({ id, inicio: 5 })
    expect(extrairVideo(id)).toEqual({ id, inicio: 0 })
  })

  it('recusa o que não é vídeo do YouTube', () => {
    expect(extrairVideo('https://vimeo.com/123')).toBeNull()
    expect(extrairVideo('https://youtube.com/watch?v=curto')).toBeNull()
    expect(extrairVideo('https://www.youtube.com/@canal')).toBeNull()
    expect(extrairVideo('')).toBeNull()
    expect(extrairVideo('não é link')).toBeNull()
  })

  it('posição de agora: parada fica, tocando anda, repetir dá a volta', () => {
    const t0 = Date.parse('2026-09-25T20:00:00Z')
    const estado = { posicao_s: 10, marcado_em: new Date(t0).toISOString(), tocando: true, repetir: true }
    expect(posicaoAgora({ ...estado, tocando: false }, t0 + 60000)).toBe(10)
    expect(posicaoAgora(estado, t0 + 30000)).toBe(40)
    expect(posicaoAgora(estado, t0 + 100000, 100)).toBe(10) // 110 s num vídeo de 100
    expect(posicaoAgora({ ...estado, repetir: false }, t0 + 100000, 100)).toBe(100)
    // relógio de quem vê um pouco atrás: nunca volta antes do ponto marcado
    expect(posicaoAgora(estado, t0 - 5000)).toBe(10)
  })

  it('só ajusta o tocador se escorregou além da tolerância', () => {
    expect(precisaAjustar(40.5, 40)).toBe(false)
    expect(precisaAjustar(35, 40)).toBe(true)
  })

  it('efeito: toca só o novo e recente', () => {
    const agora = Date.parse('2026-09-25T20:00:03Z')
    const novo = { efeito: 'trovao', efeito_em: '2026-09-25T20:00:02Z' }
    expect(efeitoParaTocar({ efeito_em: null }, novo, agora)).toBe('trovao')
    expect(efeitoParaTocar(novo, novo, agora)).toBeNull() // mesma atualização (ex.: só pausou a música)
    expect(efeitoParaTocar({ efeito_em: '2026-09-25T20:00:02.000+00:00' }, novo, agora)).toBeNull() // mesmo instante, outro formato
    expect(efeitoParaTocar(null, novo, agora + 60000)).toBeNull() // velho: quem chegou agora não ouve
  })
})
