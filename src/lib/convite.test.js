import { describe, it, expect } from 'vitest'
import { codigoDoConvite, destinoDepoisDoLogin, linkDeConvite, souConvidado, validarNomeConvidado } from './convite'

describe('F47 — convite e convidado', () => {
  it('lê o código puro ou o link colado', () => {
    expect(codigoDoConvite('  6B9E340D ')).toBe('6b9e340d')
    expect(codigoDoConvite('https://rpgcustomizado.onrender.com/convite/6b9e340d')).toBe('6b9e340d')
    expect(codigoDoConvite('rpgcustomizado.onrender.com/convite/6b9e340d?x=1')).toBe('6b9e340d')
    expect(codigoDoConvite(linkDeConvite('https://site', 'abc'))).toBe('abc')
  })

  it('valida o nome do convidado', () => {
    expect(validarNomeConvidado('  Ana   Clara ')).toEqual({ ok: true, nome: 'Ana Clara' })
    expect(validarNomeConvidado('   ').ok).toBe(false)
    expect(validarNomeConvidado('a'.repeat(31)).ok).toBe(false)
  })

  it('reconhece a sessão de convidado', () => {
    expect(souConvidado({ user: { is_anonymous: true } })).toBe(true)
    expect(souConvidado({ user: { is_anonymous: false } })).toBe(false)
    expect(souConvidado(null)).toBe(false)
  })

  it('depois do login só volta para um convite; o resto vai ao painel', () => {
    expect(destinoDepoisDoLogin({ depois: '/convite/abc' })).toBe('/convite/abc')
    expect(destinoDepoisDoLogin({ depois: 'https://golpe.com' })).toBe('/dashboard')
    expect(destinoDepoisDoLogin({ depois: '/convite/abc/../../admin' })).toBe('/dashboard')
    expect(destinoDepoisDoLogin(null)).toBe('/dashboard')
  })
})
