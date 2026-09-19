import { describe, it, expect } from 'vitest'
import { interpretarEntrada, destinatarios, opcoesDestino, rotuloSussurro, contarNaoLidas, TAMANHO_MAX_MENSAGEM } from './chatMesa'

const membros = [
  { usuario_id: 'm', nome: 'Mestre', role: 'mestre' },
  { usuario_id: 'c', nome: 'Co', role: 'co-mestre' },
  { usuario_id: 'a', nome: 'Aria', role: 'jogador' },
  { usuario_id: 'b', nome: 'Borin', role: 'jogador' },
]
const nomeDe = id => membros.find(m => m.usuario_id === id)?.nome || 'Jogador'

describe('interpretarEntrada', () => {
  it('texto comum vira mensagem (aparado); vazio é nada', () => {
    expect(interpretarEntrada('  olá mesa \n')).toEqual({ tipo: 'mensagem', texto: 'olá mesa' })
    expect(interpretarEntrada('   ')).toBeNull()
  })
  it('/r rola com rótulo opcional', () => {
    expect(interpretarEntrada('/r 2d6+3 ataque com espada')).toEqual({ tipo: 'rolagem', notacao: '2d6+3', rotulo: 'ataque com espada' })
    expect(interpretarEntrada('/ROLL 1d20')).toEqual({ tipo: 'rolagem', notacao: '1d20', rotulo: null })
    expect(interpretarEntrada('/rolar 4d6kh3')).toMatchObject({ tipo: 'rolagem', notacao: '4d6kh3' })
  })
  it('/r inválido ou sem notação é erro, não mensagem', () => {
    expect(interpretarEntrada('/r banana').tipo).toBe('erro')
    expect(interpretarEntrada('/r').tipo).toBe('erro')
  })
  it('comando desconhecido é erro', () => {
    expect(interpretarEntrada('/w Aria oi')).toMatchObject({ tipo: 'erro' })
  })
  it('mensagem acima do máximo é erro', () => {
    expect(interpretarEntrada('x'.repeat(TAMANHO_MAX_MENSAGEM)).tipo).toBe('mensagem')
    expect(interpretarEntrada('x'.repeat(TAMANHO_MAX_MENSAGEM + 1)).tipo).toBe('erro')
  })
})

describe('destinatários', () => {
  it('mesa toda = null; mestres = mestre + co-mestres, sem o autor', () => {
    expect(destinatarios('todos', membros, 'a')).toBeNull()
    expect(destinatarios('mestres', membros, 'a')).toEqual(['m', 'c'])
    expect(destinatarios('mestres', membros, 'm')).toEqual(['c'])
    expect(destinatarios('b', membros, 'a')).toEqual(['b'])
  })
  it('sussurro para si mesmo não vira sussurro vazio', () => {
    expect(destinatarios('a', membros, 'a')).toBeNull()
  })
  it('opções: sem "só os mestres" se não há outro mestre', () => {
    expect(opcoesDestino(membros, 'a').map(o => o.valor)).toEqual(['todos', 'mestres', 'm', 'c', 'b'])
    const soMestreEu = [membros[0], membros[2]]
    expect(opcoesDestino(soMestreEu, 'm').map(o => o.valor)).toEqual(['todos', 'a'])
  })
})

describe('rótulos e não lidas', () => {
  it('rótulo de sussurro para quem manda e quem recebe', () => {
    expect(rotuloSussurro({ autor_id: 'a', para: ['m', 'c'] }, 'a', nomeDe)).toBe('🤫 para Mestre e Co')
    expect(rotuloSussurro({ autor_id: 'a', para: ['m'] }, 'm', nomeDe)).toBe('🤫 sussurro para você')
    expect(rotuloSussurro({ autor_id: 'a', para: null }, 'm', nomeDe)).toBeNull()
  })
  it('conta só mensagens de outros depois do visto', () => {
    const msgs = [
      { autor_id: 'b', created_at: '2026-09-19T10:00:00+00:00' },
      { autor_id: 'a', created_at: '2026-09-19T10:05:00+00:00' },
      { autor_id: 'b', created_at: '2026-09-19T10:06:00.123456+00:00' },
    ]
    expect(contarNaoLidas(msgs, null, 'a')).toBe(2)
    expect(contarNaoLidas(msgs, '2026-09-19T10:00:00+00:00', 'a')).toBe(1)
    expect(contarNaoLidas(msgs, '2026-09-19T10:06:00.123456+00:00', 'a')).toBe(0)
  })
})
