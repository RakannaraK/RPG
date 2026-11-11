// AudioContext falso: conta os nós criados e os desconectados.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const ctx = { state: 'running', currentTime: 0, sampleRate: 100, destination: {}, nos: [] }
const param = () => ({
  value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, cancelScheduledValues() {},
})
function no() {
  const n = {
    frequency: param(), gain: param(), Q: param(), buffer: null, disconnected: false,
    connect: x => x, start() {}, stop() {}, disconnect() { n.disconnected = true },
  }
  ctx.nos.push(n)
  return n
}
Object.assign(ctx, {
  createGain: no, createBufferSource: no, createBiquadFilter: no, createOscillator: no,
  createBuffer: () => ({ getChannelData: () => new Float32Array(200) }),
})

vi.mock('../lib/diceSounds', () => ({ getAudioContext: () => ctx }))
vi.mock('./actionSynth', () => ({ tocarPresetAcao: vi.fn() }))

import { tocarPresetAcao } from './actionSynth'
import { criarSomAmbiente } from './somAmbiente'

beforeEach(() => { ctx.nos.length = 0; vi.useFakeTimers() })
afterEach(() => vi.useRealTimers())

describe('criarSomAmbiente', () => {
  it('volume 0 não cria nada; volume > 0 cria o laço', () => {
    const som = criarSomAmbiente()
    som.atualizar({ chuva: 0 })
    expect(ctx.nos).toHaveLength(0)
    som.atualizar({ chuva: 0.8 })
    expect(ctx.nos.length).toBeGreaterThan(0)
    som.parar()
  })

  it('não recria o laço que já existe', () => {
    const som = criarSomAmbiente()
    som.atualizar({ chuva: 0.5 })
    const n = ctx.nos.length
    som.atualizar({ chuva: 0.9 })
    expect(ctx.nos).toHaveLength(n)
    som.parar()
  })

  it('volume 0 para e desconecta o laço depois da rampa', () => {
    const som = criarSomAmbiente()
    som.atualizar({ chuva: 0.8 })
    const antes = ctx.nos.filter(n => n.disconnected).length
    som.atualizar({ chuva: 0 })
    vi.advanceTimersByTime(600)
    expect(ctx.nos.filter(n => n.disconnected).length).toBeGreaterThan(antes)
    som.atualizar({ chuva: 0.5 }) // volta: cria de novo
    expect(ctx.nos.length).toBeGreaterThan(0)
    som.parar()
  })

  it('todas as receitas sobem e descem sem erro, e parar() limpa os timers', () => {
    const som = criarSomAmbiente()
    const todos = { fogo: 1, chuva: 1, vento: 1, noite: 1, agua: 1, infernal: 1, arcano: 1 }
    som.atualizar(todos)
    vi.advanceTimersByTime(1000)
    som.parar()
    expect(vi.getTimerCount()).toBe(0)
    expect(ctx.nos.some(n => n.disconnected)).toBe(true)
  })

  it('trovão usa o preset trovao', () => {
    criarSomAmbiente().trovao(0.5)
    expect(tocarPresetAcao).toHaveBeenCalledWith('trovao', { ativo: true, volume: 0.5 })
  })
})
