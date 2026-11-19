import { describe, it, expect, beforeEach, vi } from 'vitest'

// Cada teste começa com módulo novo (o dicionário é estado do módulo).
async function carregar(idioma) {
  vi.resetModules()
  const store = idioma ? { 'dp-idioma': idioma } : {}
  vi.stubGlobal('localStorage', { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = v } })
  vi.stubGlobal('navigator', { language: 'pt-BR' })
  const m = await import('./index.js')
  await m.iniciarIdioma()
  return m
}

describe('i18n', () => {
  beforeEach(() => { vi.unstubAllGlobals() })

  it('sem dicionário devolve o português', async () => {
    const { t, idiomaAtual } = await carregar('pt')
    expect(idiomaAtual()).toBe('pt')
    expect(t('Salvar')).toBe('Salvar')
  })

  it('troca {variáveis}', async () => {
    const { t } = await carregar('pt')
    expect(t('Olá, {nome}! {n}', { nome: 'Ana', n: 3 })).toBe('Olá, Ana! 3')
    expect(t('Falta {x}', {})).toBe('Falta {x}')
  })

  it('tn escolhe singular e plural', async () => {
    const { tn } = await carregar('pt')
    expect(tn(1, '{n} cena', '{n} cenas')).toBe('1 cena')
    expect(tn(3, '{n} cena', '{n} cenas')).toBe('3 cenas')
    expect(tn(0, '{n} cena de {a}', '{n} cenas de {a}', { a: 'X' })).toBe('0 cenas de X')
  })

  it('em inglês traduz e cai no português quando falta tradução', async () => {
    const { t, idiomaAtual, locale } = await carregar('en')
    expect(idiomaAtual()).toBe('en')
    expect(locale()).toBe('en-US')
    expect(t('Salvar')).toBe('Save')
    expect(t('Texto que ninguém traduziu')).toBe('Texto que ninguém traduziu')
  })

  it('chave herdada do Object (constructor) não vaza', async () => {
    const { t } = await carregar('en')
    expect(t('constructor')).toBe('constructor')
    expect(t('Olá {toString}', { toString: 'x' })).toBe('Olá x')
  })

  it('tx: contexto, depois texto, depois português', async () => {
    const { tx } = await carregar('en')
    expect(tx('conta', 'Entrar')).toBe('Sign in')
    expect(tx('zz', 'zz nada')).toBe('zz nada') // nem com contexto nem sem contexto no dicionário
    expect(tx('conta', 'Salvar')).toBe('Save') // cai no texto sem contexto
    expect(tx('zz', 'zz {nome}', { nome: 'Ana' })).toBe('zz Ana')
  })

  it('usa o primeiro idioma suportado de navigator.languages', async () => {
    vi.resetModules()
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {} })
    vi.stubGlobal('navigator', { language: 'fr-FR', languages: ['fr-FR', 'es-MX', 'en'] })
    const m = await import('./index.js')
    await m.iniciarIdioma()
    expect(m.idiomaAtual()).toBe('es')
  })
})
