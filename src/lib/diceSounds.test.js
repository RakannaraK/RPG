// F37 — som de dado enviado pelo usuário tem prioridade sobre o sintetizado.
// O AudioContext falso CONTA as construções e estoura: se o contador ficar em
// zero, é prova de que o sintetizador nem foi tentado.
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../audio/somProprio', () => ({ tocarSomProprio: vi.fn(() => true) }))

import { tocarSomProprio } from '../audio/somProprio'
import { definirSomDoDado, tocarSomDado } from './diceSounds'

let contextosCriados = 0
beforeEach(() => {
  contextosCriados = 0
  vi.mocked(tocarSomProprio).mockClear().mockReturnValue(true)
  // a suíte roda em node (sem DOM): basta um `window` de mentira
  globalThis.window = {
    AudioContext: class {
      constructor() { contextosCriados++; throw new Error('sem áudio no teste') }
    },
  }
})

describe('tocarSomDado — som próprio', () => {
  it('sem som próprio, usa o sintetizador', () => {
    definirSomDoDado(null)
    tocarSomDado('padrao', { volume: 0.5 })
    expect(tocarSomProprio).not.toHaveBeenCalled()
    expect(contextosCriados).toBe(1)
  })

  it('com som próprio, toca o arquivo e não sintetiza nada', () => {
    definirSomDoDado('https://exemplo/dado.mp3')
    tocarSomDado('cristal', { volume: 0.4, numDados: 3 })
    expect(tocarSomProprio).toHaveBeenCalledWith('https://exemplo/dado.mp3', { volume: 0.4 })
    expect(contextosCriados).toBe(0)
  })

  it('se o arquivo não toca (bloqueado/404), cai no sintetizador', () => {
    definirSomDoDado('https://exemplo/quebrado.mp3')
    vi.mocked(tocarSomProprio).mockReturnValue(false)
    tocarSomDado('padrao', {})
    expect(contextosCriados).toBe(1)
  })

  it('mudo continua mudo', () => {
    definirSomDoDado('https://exemplo/dado.mp3')
    tocarSomDado('padrao', { ativo: false })
    tocarSomDado('padrao', { volume: 0 })
    expect(tocarSomProprio).not.toHaveBeenCalled()
    expect(contextosCriados).toBe(0)
  })
})
