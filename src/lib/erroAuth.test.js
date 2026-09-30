import { describe, it, expect } from 'vitest'
import { faltaConfirmar, traduzirErroAuth } from './erroAuth'

describe('erros de login em português', () => {
  it('traduz pelo código e, sem código, pela mensagem', () => {
    expect(traduzirErroAuth({ code: 'invalid_credentials', message: 'Invalid login credentials' })).toBe('E-mail ou senha incorretos.')
    expect(traduzirErroAuth({ message: 'Email not confirmed' })).toMatch(/Confirme seu e-mail/)
    expect(traduzirErroAuth({ message: 'captcha protection: request disallowed (timeout-or-duplicate)' })).toMatch(/anti-robô/)
    expect(traduzirErroAuth({ message: 'Anonymous sign-ins are disabled' })).toMatch(/convidados está desligada/)
    expect(traduzirErroAuth({ message: 'Algo novo' })).toBe('Algo novo') // desconhecido: mostra como veio
    expect(traduzirErroAuth(null)).toBe('')
  })
  it('reconhece o e-mail não confirmado', () => {
    expect(faltaConfirmar({ code: 'email_not_confirmed' })).toBe(true)
    expect(faltaConfirmar({ message: 'Email not confirmed' })).toBe(true)
    expect(faltaConfirmar({ message: 'Invalid login credentials' })).toBe(false)
  })
})
