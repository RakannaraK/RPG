import { describe, it, expect } from 'vitest'
import { valorVariavelFaixa, faixaAtiva, validarFaixas, resolverFaixas } from './faixas'

// Sopro Dracônico — escala pelo nível TOTAL
const SOPRO = {
  variavel: 'nivel',
  faixas: [
    { de: 1, ate: 4, valor: '1d10' },
    { de: 5, ate: 10, valor: '2d10' },
    { de: 11, ate: 16, valor: '3d10' },
    { de: 17, ate: null, valor: '4d10' },
  ],
}

// Dano de Fúria — escala pelo nível de BÁRBARO
const FURIA = {
  variavel: 'nivel:barbaro',
  faixas: [
    { de: 1, ate: 8, valor: 2 },
    { de: 9, ate: 15, valor: 3 },
    { de: 16, ate: null, valor: 4 },
  ],
}

// Krad: Bárbaro 9 / Paladino 4 → nível total 13
const KRAD = { nivel: 13, niveisClasse: { barbaro: 9, paladino: 4 } }

describe('19.4 — valor da variável observada', () => {
  it('nivel = nível total', () => {
    expect(valorVariavelFaixa('nivel', KRAD)).toBe(13)
  })
  it('nivel:<classe> = nível naquela classe (por nome, acento/caixa)', () => {
    expect(valorVariavelFaixa('nivel:barbaro', KRAD)).toBe(9)
    expect(valorVariavelFaixa('nivel:BÁRBARO', KRAD)).toBe(9)
    expect(valorVariavelFaixa('nivel:paladino', KRAD)).toBe(4)
  })
  it('classe que a ficha não tem → 0', () => {
    expect(valorVariavelFaixa('nivel:mago', KRAD)).toBe(0)
  })
  it('resolve por id da classe', () => {
    expect(valorVariavelFaixa('nivel:a1b2-uuid', { niveisClasse: { 'a1b2-uuid': 7 } })).toBe(7)
  })
})

describe('19.4 — faixa ativa', () => {
  it('Sopro no nível 13 → 3d10', () => {
    expect(faixaAtiva(SOPRO, KRAD).faixa.valor).toBe('3d10')
  })
  it('Fúria com Bárbaro 9 → +3', () => {
    expect(faixaAtiva(FURIA, KRAD).faixa.valor).toBe(3)
  })
  it('mudar de nível move a faixa na hora', () => {
    expect(faixaAtiva(SOPRO, { nivel: 4 }).faixa.valor).toBe('1d10')
    expect(faixaAtiva(SOPRO, { nivel: 5 }).faixa.valor).toBe('2d10')
    expect(faixaAtiva(SOPRO, { nivel: 10 }).faixa.valor).toBe('2d10')
    expect(faixaAtiva(SOPRO, { nivel: 11 }).faixa.valor).toBe('3d10')
  })
  it('a última faixa é aberta: nível muito alto ainda cai nela', () => {
    expect(faixaAtiva(SOPRO, { nivel: 40 }).faixa.valor).toBe('4d10')
  })
  it('valor fora de todas as faixas → null', () => {
    expect(faixaAtiva(SOPRO, { nivel: 0 })).toBeNull()
  })
})

describe('19.4 — validação das faixas (editor)', () => {
  it('aceita faixas contíguas com última aberta', () => {
    expect(validarFaixas(SOPRO).valida).toBe(true)
    expect(validarFaixas(FURIA).valida).toBe(true)
  })
  it('rejeita sobreposição', () => {
    const spec = { faixas: [{ de: 1, ate: 5, valor: 1 }, { de: 4, ate: 9, valor: 2 }] }
    const r = validarFaixas(spec)
    expect(r.valida).toBe(false)
    expect(r.erro).toMatch(/sobrep/i)
  })
  it('rejeita buraco entre faixas', () => {
    const spec = { faixas: [{ de: 1, ate: 4, valor: 1 }, { de: 7, ate: 9, valor: 2 }] }
    const r = validarFaixas(spec)
    expect(r.valida).toBe(false)
    expect(r.erro).toMatch(/buraco/i)
  })
  it('rejeita faixa aberta no meio', () => {
    const spec = { faixas: [{ de: 1, ate: null, valor: 1 }, { de: 5, ate: 9, valor: 2 }] }
    expect(validarFaixas(spec).valida).toBe(false)
  })
  it('rejeita "até" menor que "de", valor vazio e lista vazia', () => {
    expect(validarFaixas({ faixas: [{ de: 5, ate: 2, valor: 1 }] }).valida).toBe(false)
    expect(validarFaixas({ faixas: [{ de: 1, ate: 4, valor: '' }] }).valida).toBe(false)
    expect(validarFaixas({ faixas: [] }).valida).toBe(false)
    expect(validarFaixas(null).valida).toBe(false)
  })
})

describe('19.4 — resolverFaixas sobre a lista de modificadores', () => {
  it('troca o valor pelo da faixa ativa e anota a rastreabilidade', () => {
    const mods = [{ tipo: 'dano', faixas: SOPRO, _fonte: 'Sopro' }]
    const [m] = resolverFaixas(mods, KRAD)
    expect(m.valor).toBe('3d10')
    expect(m._faixaAtiva).toEqual({ de: 11, ate: 16, campo: 'valor', variavel: 'nivel', valorVariavel: 13 })
  })
  it('escala por nível de classe (Fúria, Bárbaro 9 → +3)', () => {
    const [m] = resolverFaixas([{ tipo: 'dano', faixas: FURIA }], KRAD)
    expect(m.valor).toBe(3)
    expect(m._faixaAtiva.valorVariavel).toBe(9)
  })
  it('campo "dados_extras": o Sopro escala os DADOS, não o bônus fixo', () => {
    const soproDados = { ...SOPRO, campo: 'dados_extras' }
    const [m] = resolverFaixas([{ tipo: 'dano', valor: 2, faixas: soproDados }], KRAD)
    expect(m.dados_extras).toBe('3d10')
    expect(m.valor).toBe(2) // bônus fixo intacto
    expect(m._faixaAtiva.campo).toBe('dados_extras')
  })
  it('modificador sem faixas passa intacto (retrocompat)', () => {
    const mod = { tipo: 'atributo', operacao: 'somar', valor: 5 }
    expect(resolverFaixas([mod], KRAD)[0]).toBe(mod)
  })
  it('nenhuma faixa cobre → não contribui e marca o erro', () => {
    const [m] = resolverFaixas([{ faixas: SOPRO }], { nivel: 0 })
    expect(m.valor).toBe(0)
    expect(m._faixaErro).toBe(true)
    const [d] = resolverFaixas([{ faixas: { ...SOPRO, campo: 'dados_extras' } }], { nivel: 0 })
    expect(d.dados_extras).toBe('')
  })
})
