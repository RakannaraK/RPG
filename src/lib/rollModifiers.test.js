import { describe, it, expect } from 'vitest'
import { montarNotacaoComModificadores } from './rollModifiers'

describe('18.3 — percentual em rolagens (agregação)', () => {
  it('agrega percentual_rolagem dos modificadores de dano aplicáveis', () => {
    const mods = [
      { tipo: 'dano', percentual_rolagem: 20, _fonte: 'Maestria' },
      { tipo: 'dano', valor: 2, _fonte: 'Fúria' },
      { tipo: 'acerto', percentual_rolagem: 50 }, // tipo diferente — ignorado
    ]
    const r = montarNotacaoComModificadores({ tipo: 'dano', notacaoBase: '2d6+4', modificadoresAtivos: mods })
    expect(r.percentual).toBe(20)
    expect(r.notacaoFinal).toBe('2d6+6') // +2 fixo somado
  })

  it('percentuais múltiplos são somados (aditivos)', () => {
    const mods = [
      { tipo: 'dano', percentual_rolagem: 10, _fonte: 'A' },
      { tipo: 'dano', percentual_rolagem: 15, _fonte: 'B' },
    ]
    const r = montarNotacaoComModificadores({ tipo: 'dano', notacaoBase: '1d8', modificadoresAtivos: mods })
    expect(r.percentual).toBe(25)
  })

  it('respeita escopo (categoria da arma)', () => {
    const mods = [
      { tipo: 'dano', percentual_rolagem: 30, escopo_categoria: 'corpo-a-corpo', _fonte: 'X' },
    ]
    expect(montarNotacaoComModificadores({ tipo: 'dano', notacaoBase: '1d6', categoria: 'corpo-a-corpo', modificadoresAtivos: mods }).percentual).toBe(30)
    expect(montarNotacaoComModificadores({ tipo: 'dano', notacaoBase: '1d6', categoria: 'à distância', modificadoresAtivos: mods }).percentual).toBe(0)
  })

  it('sem percentual → 0 (retrocompat)', () => {
    const r = montarNotacaoComModificadores({ tipo: 'dano', notacaoBase: '2d6+4', modificadoresAtivos: [{ tipo: 'dano', valor: 3 }] })
    expect(r.percentual).toBe(0)
  })

  it('a matemática do total: piso(total × (1 + %/100))', () => {
    // documenta a regra aplicada em useRolagem: 42 com +20% → 50
    expect(Math.floor(42 * 1.20)).toBe(50)
    expect(Math.floor(17 * 1.10)).toBe(18)
  })
})
