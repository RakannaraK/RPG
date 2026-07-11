import { describe, it, expect } from 'vitest'
import { conversoesDeDano, resolverTipoDano, descreverTipoDano } from './conversao'

// Manoplas do Krad: convertem físico → elétrico (global)
const MANOPLAS = { operacao: 'converter', alvo: 'tipo_dano', valor: { de: 'fisico', para: 'eletrico' } }
const CURINGA = { operacao: 'converter', alvo: 'tipo_dano', valor: { de: '*', para: 'radiante' } }

describe('21.5 — conversão de tipo de dano', () => {
  it('separa os modificadores de conversão', () => {
    const mods = [MANOPLAS, { operacao: 'somar', valor: 2 }, { tipo: 'dano', valor: 3 }]
    expect(conversoesDeDano(mods)).toHaveLength(1)
  })

  it('converte o tipo que casa (físico → elétrico)', () => {
    expect(resolverTipoDano('fisico', [MANOPLAS])).toEqual({ tipo: 'eletrico', convertidoDe: 'fisico' })
  })

  it('não converte um tipo que não casa', () => {
    expect(resolverTipoDano('gelo', [MANOPLAS])).toEqual({ tipo: 'gelo', convertidoDe: null })
  })

  it('"de":"*" converte qualquer tipo', () => {
    expect(resolverTipoDano('fogo', [CURINGA]).tipo).toBe('radiante')
  })

  it('aceita a regra como JSON string', () => {
    const m = { operacao: 'converter', alvo: 'tipo_dano', valor: '{"de":"fisico","para":"eletrico"}' }
    expect(resolverTipoDano('fisico', [m]).tipo).toBe('eletrico')
  })

  it('insensível a acento/caixa no "de"', () => {
    const m = { operacao: 'converter', valor: { de: 'Físico', para: 'eletrico' } }
    expect(resolverTipoDano('fisico', [m]).tipo).toBe('eletrico')
  })

  it('conversões em sequência (físico→elétrico, depois elétrico→radiante)', () => {
    const chain = [
      { operacao: 'converter', valor: { de: 'fisico', para: 'eletrico' } },
      { operacao: 'converter', valor: { de: 'eletrico', para: 'radiante' } },
    ]
    expect(resolverTipoDano('fisico', chain).tipo).toBe('radiante')
  })

  it('sem conversões → tipo intacto', () => {
    expect(resolverTipoDano('fisico', [])).toEqual({ tipo: 'fisico', convertidoDe: null })
    expect(resolverTipoDano('fisico', [{ operacao: 'somar', valor: 1 }]).convertidoDe).toBeNull()
  })

  it('descreve para o feed', () => {
    expect(descreverTipoDano('fisico', [MANOPLAS])).toBe('eletrico (convertido de fisico)')
    expect(descreverTipoDano('fisico', [])).toBe('fisico')
    expect(descreverTipoDano('', [])).toBe('')
  })

  it('regra inválida é ignorada (sem "para")', () => {
    expect(resolverTipoDano('fisico', [{ operacao: 'converter', valor: { de: 'fisico' } }]).tipo).toBe('fisico')
    expect(resolverTipoDano('fisico', [{ operacao: 'converter', valor: 'lixo' }]).tipo).toBe('fisico')
  })
})
