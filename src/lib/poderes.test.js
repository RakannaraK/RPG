import { describe, it, expect } from 'vitest'
import {
  custosDePool, custoDeSlot, descreverCusto, validarCusto,
  circulosAcima, descreverEscala, validarEscala,
  validarPoder, filtrarPoderes, opcoesDeFiltro, ordenarPoderes,
} from './poderes'

const THARIUNS = { id: 'p-thar', nome: 'Thariuns' }
const POOLS = [THARIUNS]
const POOLS_POR_ID = { 'p-thar': THARIUNS }

// ─── Os três poderes que a spec manda criar ─────────────────────────────────
const GOLPE = {
  nome: 'Golpe Estrondoso',
  categoria: 'Magia',
  circulo: 1,
  custo: [{ tipo: 'slot', circulo_minimo: 1 }],
  acao: 'ação bônus',
  efeito_tipo: 'dano',
  efeito_notacao: '2d6',
  escala_circulo: { faixas: [{ de: 2, ate: null, valor_extra_por_circulo: '1d6' }] },
}

const CURAR = {
  nome: 'Curar Feridas',
  categoria: 'Magia',
  circulo: 1,
  custo: [{ tipo: 'slot', circulo_minimo: 1 }],
  efeito_tipo: 'cura',
  efeito_notacao: '1d8 + mod(carisma)',
  escala_circulo: { faixas: [{ de: 2, ate: null, valor_extra_por_circulo: '1d8' }] },
  cd_formula: '8 + proficiencia + mod(carisma)',
}

const PODER_IC = {
  nome: 'Lâmina de Foco',
  categoria: 'Técnica',
  circulo: null,
  custo: [{ tipo: 'pool', pool_id: 'p-thar', quantidade: '3' }],
  efeito_tipo: 'dano',
  efeito_notacao: '2d10',
}

describe('20.2 — custo: leitura e descrição', () => {
  it('separa débitos de pool e de slot', () => {
    expect(custosDePool(PODER_IC.custo)).toHaveLength(1)
    expect(custoDeSlot(PODER_IC.custo)).toBeNull()
    expect(custoDeSlot(GOLPE.custo)).toEqual({ tipo: 'slot', circulo_minimo: 1 })
  })
  it('descreve custo de pool com o nome do recurso', () => {
    expect(descreverCusto(PODER_IC.custo, POOLS_POR_ID)).toBe('3 Thariuns')
  })
  it('descreve custo de slot', () => {
    expect(descreverCusto(GOLPE.custo, POOLS_POR_ID)).toBe('slot de círculo 1+')
  })
  it('combina custos', () => {
    const custo = [...GOLPE.custo, { tipo: 'pool', pool_id: 'p-thar', quantidade: '2' }]
    expect(descreverCusto(custo, POOLS_POR_ID)).toBe('slot de círculo 1+ + 2 Thariuns')
  })
  it('sem custo', () => {
    expect(descreverCusto([], POOLS_POR_ID)).toBe('Sem custo')
    expect(descreverCusto(null)).toBe('Sem custo')
  })
})

describe('20.2 — validação de custo', () => {
  it('custo é opcional', () => {
    expect(validarCusto(null, POOLS).valida).toBe(true)
    expect(validarCusto([], POOLS).valida).toBe(true)
  })
  it('quantidade aceita número e fórmula', () => {
    expect(validarCusto([{ tipo: 'pool', pool_id: 'p-thar', quantidade: '3' }], POOLS).valida).toBe(true)
    expect(validarCusto([{ tipo: 'pool', pool_id: 'p-thar', quantidade: 'piso(nivel / 2)' }], POOLS).valida).toBe(true)
  })
  it('quantidade com sintaxe quebrada é rejeitada', () => {
    const r = validarCusto([{ tipo: 'pool', pool_id: 'p-thar', quantidade: 'nivel +' }], POOLS)
    expect(r.valida).toBe(false)
    expect(r.erro).toMatch(/quantidade/i)
  })
  it('pool inexistente é rejeitado', () => {
    expect(validarCusto([{ tipo: 'pool', pool_id: 'sumiu', quantidade: '1' }], POOLS).valida).toBe(false)
  })
  it('quantidade vazia é rejeitada', () => {
    expect(validarCusto([{ tipo: 'pool', pool_id: 'p-thar', quantidade: '' }], POOLS).valida).toBe(false)
  })
  it('só um custo de slot por poder', () => {
    const custo = [{ tipo: 'slot', circulo_minimo: 1 }, { tipo: 'slot', circulo_minimo: 2 }]
    expect(validarCusto(custo, POOLS).valida).toBe(false)
  })
  it('tipo desconhecido é rejeitado', () => {
    expect(validarCusto([{ tipo: 'xp', quantidade: '1' }], POOLS).valida).toBe(false)
  })
})

describe('20.2 — escala por círculo (a taxa acumula)', () => {
  it('círculos acima do mínimo, nunca negativo', () => {
    expect(circulosAcima(1, 1)).toBe(0)
    expect(circulosAcima(2, 1)).toBe(1)
    expect(circulosAcima(3, 1)).toBe(2) // 3º círculo num poder de 1º → +2×taxa
    expect(circulosAcima(1, 3)).toBe(0)
  })
  it('descreve a escala', () => {
    expect(descreverEscala(CURAR.escala_circulo)).toBe('2+: +1d8/círculo')
    expect(descreverEscala(null)).toBeNull()
    expect(descreverEscala({ faixas: [] })).toBeNull()
  })
  it('escala é opcional e valida contiguidade como as faixas da F19', () => {
    expect(validarEscala(null).valida).toBe(true)
    expect(validarEscala(CURAR.escala_circulo).valida).toBe(true)
    const sobreposta = { faixas: [
      { de: 2, ate: 5, valor_extra_por_circulo: '1d6' },
      { de: 4, ate: null, valor_extra_por_circulo: '2d6' },
    ] }
    expect(validarEscala(sobreposta).valida).toBe(false)
  })
})

describe('20.2 — validarPoder com os poderes da spec', () => {
  it('Golpe Estrondoso é válido', () => {
    expect(validarPoder(GOLPE, { pools: POOLS }).valida).toBe(true)
  })
  it('Curar Feridas é válido (notação com fórmula e CD)', () => {
    expect(validarPoder(CURAR, { pools: POOLS }).valida).toBe(true)
  })
  it('poder do IC custando 3 Thariuns é válido', () => {
    expect(validarPoder(PODER_IC, { pools: POOLS }).valida).toBe(true)
  })
  it('nome é obrigatório', () => {
    expect(validarPoder({ nome: '  ' }, { pools: POOLS }).valida).toBe(false)
  })
  it('notação de efeito inválida é rejeitada', () => {
    const r = validarPoder({ nome: 'X', efeito_notacao: '2dd6' }, { pools: POOLS })
    expect(r.valida).toBe(false)
    expect(r.erro).toMatch(/nota[çc]/i)
  })
  it('CD com fórmula quebrada é rejeitada', () => {
    const r = validarPoder({ nome: 'X', cd_formula: '8 + proficiencia +' }, { pools: POOLS })
    expect(r.valida).toBe(false)
    expect(r.erro).toMatch(/CD/)
  })
  it('efeito e círculo são opcionais (poder só de texto)', () => {
    expect(validarPoder({ nome: 'Ritual', descricao: 'Narrativo' }, { pools: POOLS }).valida).toBe(true)
  })
})

describe('20.2 — busca e filtros do catálogo', () => {
  const CATALOGO = [
    { id: '1', nome: 'Curar Feridas', categoria: 'Magia', circulo: 1, classe_id: 'pal', tags: ['cura'] },
    { id: '2', nome: 'Golpe Estrondoso', categoria: 'Magia', circulo: 1, classe_id: 'pal', tags: ['dano'] },
    { id: '3', nome: 'Bola de Fogo', categoria: 'Magia', circulo: 3, classe_id: 'mag', tags: ['dano', 'área'] },
    { id: '4', nome: 'Lâmina de Foco', categoria: 'Técnica', circulo: null, classe_id: null, tags: [] },
  ]
  const ids = lista => lista.map(p => p.id)

  it('sem filtro devolve tudo', () => {
    expect(ids(filtrarPoderes(CATALOGO, {}))).toEqual(['1', '2', '3', '4'])
  })
  it('busca por nome, insensível a caixa e acento', () => {
    expect(ids(filtrarPoderes(CATALOGO, { busca: 'lamina' }))).toEqual(['4'])
    expect(ids(filtrarPoderes(CATALOGO, { busca: 'GOLPE' }))).toEqual(['2'])
  })
  it('filtra por círculo; -1 = sem círculo', () => {
    expect(ids(filtrarPoderes(CATALOGO, { circulo: 1 }))).toEqual(['1', '2'])
    expect(ids(filtrarPoderes(CATALOGO, { circulo: -1 }))).toEqual(['4'])
  })
  it('filtra por categoria, classe e tag', () => {
    expect(ids(filtrarPoderes(CATALOGO, { categoria: 'Técnica' }))).toEqual(['4'])
    expect(ids(filtrarPoderes(CATALOGO, { classeId: 'mag' }))).toEqual(['3'])
    expect(ids(filtrarPoderes(CATALOGO, { tag: 'dano' }))).toEqual(['2', '3'])
  })
  it('combina filtros', () => {
    expect(ids(filtrarPoderes(CATALOGO, { circulo: 1, tag: 'cura' }))).toEqual(['1'])
  })
  it('opcoesDeFiltro junta os valores distintos', () => {
    const o = opcoesDeFiltro(CATALOGO)
    expect(o.categorias).toEqual(['Magia', 'Técnica'])
    expect(o.circulos).toEqual([1, 3])
    expect(o.tags).toEqual(['área', 'cura', 'dano']) // localeCompare: acento antes de 'c'
  })
  it('ordena por círculo (sem círculo primeiro) e depois por nome', () => {
    expect(ids(ordenarPoderes(CATALOGO))).toEqual(['4', '1', '2', '3'])
  })
})

// ═══════════════════════════════════ Fase 20.4 — usar um poder
import {
  circuloBaseDoPoder, extraDaEscala, montarNotacaoUso,
  custoResolvido, podeUsarPoder, cdDoPoder,
} from './poderes'

describe('20.4 — círculo base e escala acumulada', () => {
  it('círculo base vem do custo de slot; senão do círculo do poder', () => {
    expect(circuloBaseDoPoder(CURAR)).toBe(1)
    expect(circuloBaseDoPoder({ circulo: 3, custo: [] })).toBe(3)
    expect(circuloBaseDoPoder(PODER_IC)).toBe(0)
  })

  it('no círculo mínimo não há extra', () => {
    expect(extraDaEscala(CURAR, 1)).toBeNull()
  })

  it('1 círculo acima → 1× a taxa; 2 acima → 2× (acumula)', () => {
    expect(extraDaEscala(CURAR, 2)).toEqual({ taxa: '1d8', vezes: 1, termos: ['1d8'] })
    expect(extraDaEscala(CURAR, 3)).toEqual({ taxa: '1d8', vezes: 2, termos: ['1d8', '1d8'] })
  })

  it('poder sem escala nunca ganha extra', () => {
    expect(extraDaEscala(PODER_IC, 5)).toBeNull()
  })
})

describe('20.4 — notação final do efeito', () => {
  it('Curar Feridas no 1º círculo', () => {
    expect(montarNotacaoUso(CURAR, 1)).toBe('1d8 + mod(carisma)')
  })
  it('Curar Feridas no 2º círculo escala +1d8', () => {
    expect(montarNotacaoUso(CURAR, 2)).toBe('1d8 + mod(carisma) + 1d8')
  })
  it('Curar Feridas no 3º círculo escala +2d8', () => {
    expect(montarNotacaoUso(CURAR, 3)).toBe('1d8 + mod(carisma) + 1d8 + 1d8')
  })
  it('Golpe Estrondoso no 3º círculo escala +2d6', () => {
    expect(montarNotacaoUso(GOLPE, 3)).toBe('2d6 + 1d6 + 1d6')
  })
  it('poder sem efeito continua sem notação', () => {
    expect(montarNotacaoUso({ nome: 'Ritual' }, 1)).toBe('')
  })
})

describe('20.4 — custo resolvido (quantidade pode ser fórmula)', () => {
  it('número puro', () => {
    expect(custoResolvido(PODER_IC.custo, {})).toEqual([{ pool_id: 'p-thar', quantidade: 3 }])
  })
  it('fórmula é avaliada com o contexto', () => {
    const custo = [{ tipo: 'pool', pool_id: 'p-thar', quantidade: 'piso(nivel / 2)' }]
    expect(custoResolvido(custo, { nivel: 13 })).toEqual([{ pool_id: 'p-thar', quantidade: 6 }])
  })
  it('custo de slot não entra na lista de pools', () => {
    expect(custoResolvido(GOLPE.custo, {})).toEqual([])
  })
})

describe('20.4 — podeUsarPoder: falha antes do efeito, com motivo', () => {
  const poolsPorId = { 'p-thar': { id: 'p-thar', nome: 'Thariuns' } }

  it('poder de slot: lista os círculos gastáveis a partir do mínimo', () => {
    const r = podeUsarPoder(CURAR, { totaisSlots: { 1: 3, 2: 2 }, usadosSlots: {} })
    expect(r.ok).toBe(true)
    expect(r.circulos).toEqual([1, 2])
  })

  it('slot esgotado bloqueia com aviso claro', () => {
    const r = podeUsarPoder(CURAR, { totaisSlots: { 1: 3 }, usadosSlots: { 1: 3 } })
    expect(r.ok).toBe(false)
    expect(r.motivo).toMatch(/sem slots/i)
  })

  it('pool insuficiente bloqueia dizendo quanto falta', () => {
    const r = podeUsarPoder(PODER_IC, { atualDoPool: () => 2, poolsPorId })
    expect(r.ok).toBe(false)
    expect(r.motivo).toBe('Thariuns insuficiente: tem 2, precisa de 3.')
  })

  it('pool suficiente libera', () => {
    const r = podeUsarPoder(PODER_IC, { atualDoPool: () => 5, poolsPorId })
    expect(r.ok).toBe(true)
    expect(r.custos).toEqual([{ pool_id: 'p-thar', quantidade: 3 }])
  })

  it('poder sem custo sempre pode', () => {
    expect(podeUsarPoder({ nome: 'Truque' }, {}).ok).toBe(true)
  })

  it('quantidade com fórmula quebrada vira motivo, não exceção', () => {
    const ruim = { custo: [{ tipo: 'pool', pool_id: 'p-thar', quantidade: 'nivel +' }] }
    const r = podeUsarPoder(ruim, { atualDoPool: () => 99, poolsPorId })
    expect(r.ok).toBe(false)
    expect(r.motivo).toMatch(/custo inválido/i)
  })
})

describe('20.4 — CD do poder', () => {
  const ctx = { nivel: 13, formula_proficiencia: '2 + teto(nivel / 4) - 1', formulaModificador: 'piso((x-10)/2)', atributos: { carisma: 16 } }
  it('usa a fórmula do poder, não a do sistema', () => {
    // 8 + proficiencia(5) + mod(carisma 16 → 3) = 16
    expect(cdDoPoder(CURAR, '999', ctx)).toBe(16)
  })
  it('herda a do sistema quando o poder não tem', () => {
    expect(cdDoPoder({ nome: 'X' }, '8 + proficiencia', ctx)).toBe(13)
  })
  it('sem fórmula nenhuma → null', () => {
    expect(cdDoPoder({ nome: 'X' }, null, ctx)).toBeNull()
  })
  it('fórmula quebrada → null (não derruba a ficha)', () => {
    expect(cdDoPoder({ nome: 'X', cd_formula: 'nivel +' }, null, ctx)).toBeNull()
  })
})
