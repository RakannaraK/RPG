import { describe, it, expect } from 'vitest'
import { normalizarIce, servidoresIce, quemOferece, normalizarSinal, participantesDaPresenca, MAX_PARTICIPANTES } from './chamada'

const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'

describe('servidoresIce', () => {
  it('lê JSON válido', () => {
    const l = [{ urls: 'turn:x', username: 'u', credential: 'c' }]
    expect(servidoresIce(JSON.stringify(l))).toEqual(l)
  })
  it('inválido, vazio ou lista vazia devolve o padrão', () => {
    for (const t of ['{nao', '', undefined, '[]', '{"a":1}']) {
      expect(servidoresIce(t)).toEqual([{ urls: 'stun:stun.l.google.com:19302' }])
    }
  })
})

describe('normalizarIce', () => {
  it('aceita stun e turn, com texto ou lista', () => {
    const l = [{ urls: 'stun:a.com:3478' }, { urls: ['turn:b.com', 'turns:b.com:443'], username: 'u', credential: 'c' }]
    expect(normalizarIce({ iceServers: l })).toEqual(l)
  })
  it('protocolo errado, campo longo ou tipo errado devolve null', () => {
    expect(normalizarIce({ iceServers: [{ urls: 'http://x.com' }] })).toBeNull()
    expect(normalizarIce({ iceServers: [{ urls: ['stun:a', 'javascript:x'] }] })).toBeNull()
    expect(normalizarIce({ iceServers: [{ urls: 'turn:' + 'a'.repeat(300) }] })).toBeNull()
    expect(normalizarIce({ iceServers: [{ urls: 'turn:a', username: 'u'.repeat(501) }] })).toBeNull()
    expect(normalizarIce({ iceServers: [{ urls: 'turn:a', credential: 5 }] })).toBeNull()
  })
  it('lista grande demais ou vazia devolve null', () => {
    expect(normalizarIce({ iceServers: Array(7).fill({ urls: 'stun:a' }) })).toBeNull()
    expect(normalizarIce({ iceServers: Array(6).fill({ urls: 'stun:a' }) })).toHaveLength(6)
    expect(normalizarIce({ iceServers: [] })).toBeNull()
  })
  it('lixo devolve null', () => {
    for (const v of [null, undefined, 5, 'x', [], {}, { iceServers: 'x' }, { iceServers: [null] }, { iceServers: [{}] }]) {
      expect(normalizarIce(v)).toBeNull()
    }
  })
})

describe('quemOferece', () => {
  it('só um lado oferece', () => {
    expect(quemOferece(A, B)).toBe(true)
    expect(quemOferece(B, A)).toBe(false)
  })
})

describe('normalizarSinal', () => {
  it('aceita oferta, resposta e candidato', () => {
    expect(normalizarSinal({ de: A, para: B, tipo: 'oferta', sdp: 'v=0', extra: 1 })).toEqual({ de: A, para: B, tipo: 'oferta', sdp: 'v=0' })
    expect(normalizarSinal({ de: A, para: B, tipo: 'resposta', sdp: 'v=0' })?.tipo).toBe('resposta')
    expect(normalizarSinal({ de: A, para: B, tipo: 'candidato', candidato: { candidate: 'x' } })?.candidato).toEqual({ candidate: 'x' })
  })
  it('recusa o inválido', () => {
    expect(normalizarSinal({ de: A, para: B, tipo: 'hack', sdp: 'v=0' })).toBeNull()
    expect(normalizarSinal({ de: 'abc', para: B, tipo: 'oferta', sdp: 'v=0' })).toBeNull()
    expect(normalizarSinal({ de: A, para: B, tipo: 'oferta', sdp: 'x'.repeat(20001) })).toBeNull()
    expect(normalizarSinal({ de: A, para: B, tipo: 'oferta' })).toBeNull()
    expect(normalizarSinal({ de: A, para: B, tipo: 'candidato', candidato: 'texto' })).toBeNull()
    for (const p of [null, undefined, 'x', 5, [], [A]]) expect(normalizarSinal(p)).toBeNull()
  })
})

describe('participantesDaPresenca', () => {
  it('normaliza e corta texto', () => {
    const l = participantesDaPresenca({ [A]: [{ usuarioId: B, nome: 'n'.repeat(100), avatar: 'https://x/a.png', mic: false, cam: true }] })
    expect(l).toEqual([{ id: A, usuarioId: B, nome: 'n'.repeat(40), avatar: 'https://x/a.png', mic: false, cam: true }])
  })
  it('descarta chave ruim, avatar estranho e meta vazia; sem repetição', () => {
    const l = participantesDaPresenca({ lixo: [{}], [A]: [{ avatar: 'javascript:1' }, { nome: 'outro' }], [B]: [] })
    expect(l).toHaveLength(1)
    expect(l[0]).toMatchObject({ id: A, nome: 'Jogador', avatar: null, mic: true, cam: false })
  })
  it('teto de 8', () => {
    const est = {}
    for (let i = 0; i < 12; i++) est[`00000000-0000-4000-8000-${String(i).padStart(12, '0')}`] = [{ nome: 'p' + i }]
    expect(participantesDaPresenca(est)).toHaveLength(MAX_PARTICIPANTES)
  })
  it('entrada que não é objeto', () => {
    expect(participantesDaPresenca(null)).toEqual([])
  })
})
