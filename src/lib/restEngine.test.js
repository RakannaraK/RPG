import { describe, it, expect } from 'vitest'
import { calcularDescanso } from './restEngine'
import { resolverValoresFormula } from './modifierEngine'

describe('17.5 — resolverValoresFormula (modificadores com fórmula)', () => {
  const ctx = { nivel: 7, vida_atual: 10, vida_max: 30, recursos: { furia: 3 }, pericias: {} }
  it('resolve valor_e_formula com o contexto', () => {
    const mods = [
      { tipo: 'dano', valor: 'piso(nivel/2)', valor_e_formula: true, _fonte: 'Fúria' },
      { tipo: 'combate', alvo: 'ca', valor: '2', _fonte: 'Item' }, // não-fórmula intacto
    ]
    const r = resolverValoresFormula(mods, ctx)
    expect(r[0].valor).toBe(3) // piso(7/2)=3
    expect(r[0]._valorFormula).toBe('piso(nivel/2)')
    expect(r[1].valor).toBe('2') // inalterado
  })
  it('fórmula inválida vira 0 (falha segura), guardando a original', () => {
    const r = resolverValoresFormula([{ valor: 'atributo(forca)', valor_e_formula: true }], ctx)
    expect(r[0].valor).toBe(0)
    expect(r[0]._valorErro).toBe(true)
  })
})

describe('17.5 — descanso com fórmula/notação variável', () => {
  const ficha = { hp_atual: 5, hp_maximo: 50 }
  const valoresFinais = { vida_max: 50 }
  const contexto = { nivel: 7, atributos: {}, recursos: {} }

  it("modo 'fixo' com fórmula (5*nivel)", () => {
    const tipo = { id: 'x', vida: { modo: 'fixo', valor: '5*nivel', valor_e_formula: true }, vida_temp: { modo: 'manter' }, recursos_habilidade: { modo: 'nada' } }
    const r = calcularDescanso({ tipoDescanso: tipo, ficha, valoresFinais, contexto })
    expect(r.vida.para).toBe(40) // 5 + 5*7 = 40 (≤ 50)
  })

  it("modo 'dado' com variável (1d8+nivel) resolve e cura", () => {
    const tipo = { id: 'y', vida: { modo: 'dado', valor: '1d8+nivel' }, vida_temp: { modo: 'manter' }, recursos_habilidade: { modo: 'nada' } }
    const r = calcularDescanso({ tipoDescanso: tipo, ficha, valoresFinais, contexto })
    // 5 + (1d8 [1..8] + 7) = entre 13 e 20, sem passar de 50
    expect(r.vida.para).toBeGreaterThanOrEqual(13)
    expect(r.vida.para).toBeLessThanOrEqual(20)
  })

  it("modo 'fixo' sem fórmula segue numérico", () => {
    const tipo = { id: 'z', vida: { modo: 'fixo', valor: 10 }, vida_temp: { modo: 'manter' }, recursos_habilidade: { modo: 'nada' } }
    const r = calcularDescanso({ tipoDescanso: tipo, ficha, valoresFinais })
    expect(r.vida.para).toBe(15)
  })
})
