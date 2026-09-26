import { describe, it, expect } from 'vitest'
import { filtrarMesas, situacao, textoVagas, validarAnuncio } from './mesasAbertas'

describe('F51 — mesas abertas', () => {
  it('valida o anúncio', () => {
    expect(validarAnuncio({ descricao: ' ', vagas: 2 }).ok).toBe(false)
    expect(validarAnuncio({ descricao: 'x', vagas: 0 }).ok).toBe(false)
    expect(validarAnuncio({ descricao: 'x', vagas: 2.5 }).ok).toBe(false)
    expect(validarAnuncio({ descricao: ' Mistério ', vagas: '3', sistema: ' ', iniciantes: 1 }))
      .toEqual({ ok: true, linha: { sistema: null, quando: null, vagas: 3, iniciantes: true, descricao: 'Mistério' } })
  })

  it('o que o cartão oferece para cada pessoa', () => {
    expect(situacao('m', { logado: false })).toBe('sem-login')
    expect(situacao('m', { logado: true, convidado: true })).toBe('convidado')
    expect(situacao('m', { logado: true, minhasMesas: ['m'] })).toBe('membro')
    expect(situacao('m', { logado: true, meusPedidos: [{ mesa_id: 'm', status: 'pendente' }] })).toBe('pendente')
    expect(situacao('m', { logado: true, meusPedidos: [{ mesa_id: 'm', status: 'recusado' }] })).toBe('recusado')
    expect(situacao('m', { logado: true, meusPedidos: [{ mesa_id: 'outra', status: 'pendente' }] })).toBe('pode-pedir')
  })

  it('busca sem acento e filtro de iniciantes', () => {
    const lista = [
      { mesa_id: 1, nome: 'Vila do Brejo', sistema: 'D&D 5e', iniciantes: true, descricao: 'mistério' },
      { mesa_id: 2, nome: 'Tormenta', sistema: 'Tormenta20', iniciantes: false, descricao: 'combate' },
    ]
    expect(filtrarMesas(lista, { busca: 'misterio' }).map(m => m.mesa_id)).toEqual([1])
    expect(filtrarMesas(lista, { iniciantes: true }).map(m => m.mesa_id)).toEqual([1])
    expect(filtrarMesas(lista).length).toBe(2)
    expect(textoVagas(1)).toBe('1 vaga')
    expect(textoVagas(3)).toBe('3 vagas')
  })
})
