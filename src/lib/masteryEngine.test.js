import { describe, it, expect } from 'vitest'
import { custoDoNivel, calcularMaestria, bonusMaestria, proximaPropriedade } from './masteryEngine'

// Curva do IC: "100 * proximo_nivel" → nv1 100, nv2 200, nv3 300...
const CURVA_FORMULA = { modo: 'formula', formula: '100 * proximo_nivel' }
// Tabela equivalente (custo de cada nível)
const CURVA_TABELA = { modo: 'tabela', tabela: [100, 200, 300, 400] }

describe('21.2 — custo de cada nível', () => {
  it('fórmula: custo cresce por nível', () => {
    expect(custoDoNivel(1, CURVA_FORMULA)).toBe(100)
    expect(custoDoNivel(2, CURVA_FORMULA)).toBe(200)
    expect(custoDoNivel(3, CURVA_FORMULA)).toBe(300)
  })
  it('tabela: lê o custo em ordem; além do fim → 0', () => {
    expect(custoDoNivel(1, CURVA_TABELA)).toBe(100)
    expect(custoDoNivel(4, CURVA_TABELA)).toBe(400)
    expect(custoDoNivel(5, CURVA_TABELA)).toBe(0)
  })
  it('nível < 1 ou fórmula vazia → 0', () => {
    expect(custoDoNivel(0, CURVA_FORMULA)).toBe(0)
    expect(custoDoNivel(1, { modo: 'formula', formula: '' })).toBe(0)
  })
})

describe('21.2 — calcularMaestria (os limiares canônicos do IC)', () => {
  const nv = xp => calcularMaestria(xp, CURVA_FORMULA).nivel
  it('0 XP → nível 0', () => expect(nv(0)).toBe(0))
  it('100 → nível 1', () => expect(nv(100)).toBe(1))
  it('299 → nível 1 (ainda não somou 300)', () => expect(nv(299)).toBe(1))
  it('300 → nível 2 (100+200)', () => expect(nv(300)).toBe(2))
  it('599 → nível 2', () => expect(nv(599)).toBe(2))
  it('600 → nível 3 (100+200+300)', () => expect(nv(600)).toBe(3))

  it('a tabela equivalente dá os mesmos níveis', () => {
    for (const xp of [0, 100, 299, 300, 599, 600]) {
      expect(calcularMaestria(xp, CURVA_TABELA).nivel).toBe(nv(xp))
    }
  })

  it('progresso dentro do nível', () => {
    const r = calcularMaestria(450, CURVA_FORMULA) // nível 2 (cumul 300), próximo custa 300
    expect(r.nivel).toBe(2)
    expect(r.xpNoNivel).toBe(150)      // 450 - 300
    expect(r.xpParaProximo).toBe(300)  // custo do nv3
    expect(r.faltam).toBe(150)         // 300 - 150
  })

  it('no nível 0, a barra é para o nv1', () => {
    const r = calcularMaestria(40, CURVA_FORMULA)
    expect(r.nivel).toBe(0)
    expect(r.xpNoNivel).toBe(40)
    expect(r.xpParaProximo).toBe(100)
    expect(r.faltam).toBe(60)
  })

  it('fim da tabela: sem próximo nível', () => {
    const r = calcularMaestria(99999, CURVA_TABELA) // além de [100,200,300,400] = 1000 acumulado
    expect(r.nivel).toBe(4)
    expect(r.xpParaProximo).toBe(0)
    expect(r.faltam).toBe(0)
  })

  it('fórmula quebrada não derruba: nível 0', () => {
    expect(calcularMaestria(500, { modo: 'formula', formula: 'proximo_nivel +' }).nivel).toBe(0)
  })
})

describe('21.2 — bonusMaestria: percentuais e propriedades', () => {
  const config = { bonus_por_nivel: { acerto_percentual: 10, efeito_percentual: 10 } }
  // Propriedades do IC: Crítico req 2, Dupla req 4, Disparo req 6
  const props = [
    { nome: 'Crítico', sigla: 'Crt', maestria_minima: 2 },
    { nome: 'Dupla', sigla: 'Dp', maestria_minima: 4 },
    { nome: 'Disparo', sigla: 'Ds', maestria_minima: 6 },
  ]

  it('bônus 10% por nível', () => {
    expect(bonusMaestria(0, config).acerto_percentual).toBe(0)
    const b4 = bonusMaestria(4, config)
    expect(b4.acerto_percentual).toBe(40)
    expect(b4.efeito_percentual).toBe(40)
  })

  it('desbloqueia exatamente no limiar (maestria 4 → Crítico e Dupla; Disparo bloqueada)', () => {
    const b = bonusMaestria(4, config, props)
    expect(b.desbloqueadas.map(p => p.nome)).toEqual(['Crítico', 'Dupla'])
    expect(b.bloqueadas.map(p => p.nome)).toEqual(['Disparo'])
  })

  it('maestria 2 → só Crítico; maestria 6 → todas', () => {
    expect(bonusMaestria(2, config, props).desbloqueadas.map(p => p.nome)).toEqual(['Crítico'])
    expect(bonusMaestria(6, config, props).bloqueadas).toEqual([])
  })

  it('sem bônus configurado → 0', () => {
    expect(bonusMaestria(5, {}).acerto_percentual).toBe(0)
  })

  it('próxima propriedade a desbloquear', () => {
    expect(proximaPropriedade(1, props).nome).toBe('Crítico')
    expect(proximaPropriedade(2, props).nome).toBe('Dupla')
    expect(proximaPropriedade(6, props)).toBeNull()
  })
})
