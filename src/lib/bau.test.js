import { describe, it, expect } from 'vitest'
import { destinosParaDar, fichasQueUso, validarItemBau } from './bau'

const fichas = [
  { id: 'a', dono_id: 'eu', tipo_ficha: 'personagem' },
  { id: 'b', dono_id: 'ana', editores: ['eu'], tipo_ficha: 'personagem' },
  { id: 'c', dono_id: 'ana', tipo_ficha: 'personagem' },
  { id: 'd', dono_id: 'mestre', tipo_ficha: 'criatura' },
]

describe('F49 — baú do grupo', () => {
  it('fichas que uso: as minhas e as que edito', () => {
    expect(fichasQueUso(fichas, 'eu').map(f => f.id)).toEqual(['a', 'b'])
  })
  it('dar: outros personagens, nunca a própria ficha nem criatura', () => {
    expect(destinosParaDar(fichas, 'a').map(f => f.id)).toEqual(['b', 'c'])
  })
  it('valida o saque que o mestre põe no baú', () => {
    expect(validarItemBau({ nome: '  ' }).ok).toBe(false)
    expect(validarItemBau({ nome: ' Poção ', descricao: '' })).toEqual({ ok: true, linha: { nome: 'Poção', descricao: null } })
  })
})
