import { describe, it, expect } from 'vitest'
import { bonusDeTipo, calcularValoresFinais } from './modifierEngine'

describe('bonusDeTipo — pipeline reaproveitada para alvos fora do cálculo principal', () => {
  it('soma modificadores de perícia no alvo certo', () => {
    const mods = [
      { tipo: 'pericia', alvo: 'p1', operacao: 'somar', valor: 2, _fonte: 'Elfo' },
      { tipo: 'pericia', alvo: 'p2', operacao: 'somar', valor: 5, _fonte: 'Outro' },
    ]
    expect(bonusDeTipo({ tipo: 'pericia', alvo: 'p1', base: 3, modificadores: mods }).final).toBe(5)
  })

  it('ignora modificadores de outro tipo', () => {
    const mods = [{ tipo: 'atributo', alvo: 'p1', operacao: 'somar', valor: 99, _fonte: 'X' }]
    expect(bonusDeTipo({ tipo: 'pericia', alvo: 'p1', base: 3, modificadores: mods }).final).toBe(3)
  })

  it('sem modificadores, devolve a base intacta', () => {
    expect(bonusDeTipo({ tipo: 'pericia', alvo: 'p1', base: 4, modificadores: [] }).final).toBe(4)
  })

  it('respeita a ordem oficial: somas antes de percentuais', () => {
    const mods = [
      { tipo: 'pericia', alvo: 'p1', operacao: 'somar', valor: 5, _fonte: 'A' },
      { tipo: 'pericia', alvo: 'p1', operacao: 'percentual', valor: 100, _fonte: 'B' },
    ]
    // base 5 + 5 = 10, +100% = 20
    expect(bonusDeTipo({ tipo: 'pericia', alvo: 'p1', base: 5, modificadores: mods }).final).toBe(20)
  })

  it('traz as fontes para rastreabilidade', () => {
    const mods = [{ tipo: 'pericia', alvo: 'p1', operacao: 'somar', valor: 2, _fonte: 'Elfo' }]
    const r = bonusDeTipo({ tipo: 'pericia', alvo: 'p1', base: 0, modificadores: mods })
    expect(r.fontes).toEqual([{ fonte: 'Elfo', operacao: 'somar', valor: 2 }])
  })
})

describe('calcularValoresFinais — perícias', () => {
  it('calcula perícias quando a base traz o mapa', () => {
    const base = { atributos: {}, vida_max: 0, combate: {}, pericias: { furtividade: 3 } }
    const mods = [{ tipo: 'pericia', alvo: 'furtividade', operacao: 'somar', valor: 2, _fonte: 'Elfo' }]
    const r = calcularValoresFinais(base, mods)
    expect(r.pericias.furtividade).toBe(5)
    expect(r.detalhamento.pericias.furtividade.base).toBe(3)
  })

  it('sem base.pericias, o resultado é um mapa vazio (retrocompat)', () => {
    const r = calcularValoresFinais({ atributos: {}, vida_max: 0, combate: {} }, [])
    expect(r.pericias).toEqual({})
  })

  it('não altera atributos/vida/combate (retrocompat da pipeline existente)', () => {
    const base = { atributos: { forca: 10 }, vida_max: 20, combate: { ca: 12 } }
    const mods = [{ tipo: 'atributo', alvo: 'forca', operacao: 'somar', valor: 2, _fonte: 'X' }]
    const r = calcularValoresFinais(base, mods)
    expect(r.atributos.forca).toBe(12)
    expect(r.vida_max).toBe(20)
    expect(r.combate.ca).toBe(12)
  })
})
