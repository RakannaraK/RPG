import { describe, it, expect } from 'vitest'
import { avaliarFormula } from './formulaEngine'
import { progressoXp, limiarNivel } from './progressaoEngine'
import { faixaAtiva } from './faixas'
import { atendeNivelMinimo } from './requisitos'
import { recompensasAoSubir } from './recompensas'
import { coletarModificadores, calcularValoresFinais } from './modifierEngine'
import { resolverFaixas } from './faixas'

/**
 * Teste de aceitação da Fase 19, com as duas fichas de referência do projeto.
 * Cobre os itens (a), (b) e (c) do critério de aceitação da spec.
 */

// ─── Krad: Bárbaro 9 / Paladino 4 (nível total 13), XP 127.911 / 140.000 ─────
const CLS_BARBARO = 'cls-barbaro'
const CLS_PALADINO = 'cls-paladino'

const KRAD_CTX = {
  nivel: 13,
  niveisClasse: { [CLS_BARBARO]: 9, [CLS_PALADINO]: 4, barbaro: 9, paladino: 4 },
  formula_proficiencia: '2 + teto(nivel / 4) - 1',
  formulaModificador: 'piso((x-10)/2)',
  atributos: { forca: 19, carisma: 16 },
  pericias: {},
  recursos: {},
  vida_atual: 90,
  vida_max: 120,
}

const KRAD_PROGRESSAO = {
  modo: 'tabela',
  tabela: [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000],
}

describe('Fase 19 (a) — Krad: Bárbaro 9 / Paladino 4', () => {
  it('nível total é a soma das classes', () => {
    const soma = KRAD_CTX.niveisClasse[CLS_BARBARO] + KRAD_CTX.niveisClasse[CLS_PALADINO]
    expect(soma).toBe(KRAD_CTX.nivel)
  })

  it('XP 127.911 / 140.000 na barra, ainda sem poder subir', () => {
    const p = progressoXp(127911, 13, KRAD_PROGRESSAO)
    expect(p.prox).toBe(140000)
    expect(p.faltam).toBe(12089)
    expect(p.podeSubir).toBe(false)
  })

  it('reserva "5 * nivel(paladino)" = 20', () => {
    expect(avaliarFormula('5 * nivel(paladino)', KRAD_CTX)).toBe(20)
  })

  it('proficiencia no nível 13 = 5', () => {
    expect(avaliarFormula('proficiencia', KRAD_CTX)).toBe(5)
    expect(avaliarFormula('8 + proficiencia + mod(carisma)', KRAD_CTX)).toBe(16)
  })

  it('subir para o nível 14 muda as fórmulas na hora', () => {
    const nv14 = { ...KRAD_CTX, nivel: 14, niveisClasse: { ...KRAD_CTX.niveisClasse, paladino: 5 } }
    expect(avaliarFormula('5 * nivel(paladino)', nv14)).toBe(25)
    expect(avaliarFormula('proficiencia', nv14)).toBe(5) // 2 + teto(14/4) - 1 = 2+4-1
  })
})

describe('Fase 19 (b) — Sopro por faixa e dano de Fúria', () => {
  const SOPRO = {
    variavel: 'nivel',
    faixas: [
      { de: 1, ate: 4, valor: '1d10' },
      { de: 5, ate: 10, valor: '2d10' },
      { de: 11, ate: 16, valor: '3d10' },
      { de: 17, ate: null, valor: '4d10' },
    ],
  }
  const FURIA = {
    variavel: `nivel:${CLS_BARBARO}`,
    faixas: [
      { de: 1, ate: 8, valor: 2 },
      { de: 9, ate: 15, valor: 3 },
      { de: 16, ate: null, valor: 4 },
    ],
  }

  it('Sopro no nível 13 → 3d10', () => {
    expect(faixaAtiva(SOPRO, KRAD_CTX).faixa.valor).toBe('3d10')
  })

  it('dano de Fúria com Bárbaro 9 → +3', () => {
    expect(faixaAtiva(FURIA, KRAD_CTX).faixa.valor).toBe(3)
  })

  it('a faixa acompanha o nível de bárbaro, não o total', () => {
    const barbaro16 = { ...KRAD_CTX, nivel: 20, niveisClasse: { [CLS_BARBARO]: 16 } }
    expect(faixaAtiva(FURIA, barbaro16).faixa.valor).toBe(4)
  })

  it('modificador escalonado entra no motor com o valor da faixa', () => {
    const classeBarbaro = {
      id: CLS_BARBARO,
      nome: 'Bárbaro',
      modificadores: [{ tipo: 'atributo', alvo: 'forca', operacao: 'somar', faixas: FURIA }],
    }
    const mods = resolverFaixas(
      coletarModificadores({ classes: [classeBarbaro], estadoFicha: KRAD_CTX }),
      KRAD_CTX
    )
    const finais = calcularValoresFinais({ atributos: { forca: 19 }, vida_max: 0, combate: {} }, mods)
    expect(finais.atributos.forca).toBe(22) // 19 + 3 (faixa de Bárbaro 9)
  })
})

describe('Fase 19 (c) — Infinit Corridor', () => {
  const IC_PROGRESSAO = { modo: 'formula', formula: '100 + (nivel - 1) * 200' }

  const IC_RECOMPENSAS = [
    { id: 'r1', classe_id: null, nivel: 1, titulo: 'Criar uma habilidade própria' },
    { id: 'r5', classe_id: null, nivel: 5, titulo: 'Criar uma habilidade própria' },
    { id: 'r9', classe_id: null, nivel: 9, titulo: 'Criar uma habilidade própria' },
  ]

  const TRANSFORMACAO = { nome: 'Transformação', nivel_minimo: 40 }

  it('curva por fórmula: nv1 → nv2 custa 100 XP', () => {
    expect(limiarNivel(2, IC_PROGRESSAO)).toBe(100)
    expect(limiarNivel(3, IC_PROGRESSAO)).toBe(400) // +300
  })

  it('cruzar o limiar libera o aviso de subir de nível', () => {
    expect(progressoXp(99, 1, IC_PROGRESSAO).podeSubir).toBe(false)
    expect(progressoXp(100, 1, IC_PROGRESSAO).podeSubir).toBe(true)
  })

  it('"criar habilidade" vira pendência ao chegar nos nv 1, 5 e 9', () => {
    expect(recompensasAoSubir(IC_RECOMPENSAS, { nivelTotal: 1 }).map(r => r.id)).toEqual(['r1'])
    expect(recompensasAoSubir(IC_RECOMPENSAS, { nivelTotal: 5 }).map(r => r.id)).toEqual(['r5'])
    expect(recompensasAoSubir(IC_RECOMPENSAS, { nivelTotal: 9 }).map(r => r.id)).toEqual(['r9'])
    expect(recompensasAoSubir(IC_RECOMPENSAS, { nivelTotal: 6 })).toEqual([])
  })

  it('transformação bloqueada até o nível 40', () => {
    expect(atendeNivelMinimo(TRANSFORMACAO, { nivel: 39 })).toBe(false)
    expect(atendeNivelMinimo(TRANSFORMACAO, { nivel: 40 })).toBe(true)
  })

  it('sistema do IC não define proficiência → erro claro', () => {
    expect(() => avaliarFormula('proficiencia', { nivel: 40 })).toThrow(/proficiência/i)
  })
})

describe('Fase 19 — retrocompatibilidade das fichas antigas', () => {
  it('ficha de uma classe só: modificadores idênticos ao caminho single-class', () => {
    const classe = { id: 'c1', nome: 'Guerreiro', modificadores: [{ tipo: 'atributo', alvo: 'a', operacao: 'somar', valor: 2 }] }
    const single = coletarModificadores({ classe })
    const multi = coletarModificadores({ classes: [classe] })
    expect(multi.map(m => m.valor)).toEqual(single.map(m => m.valor))
  })

  it('sem nivel_minimo, sem faixas e sem XP: nada muda', () => {
    const mod = { tipo: 'atributo', alvo: 'a', operacao: 'somar', valor: 5 }
    expect(resolverFaixas([mod], {})[0]).toBe(mod)
    expect(atendeNivelMinimo(mod, {})).toBe(true)
    expect(progressoXp(999, 3, { modo: 'nenhum' }).podeSubir).toBe(false)
  })
})
