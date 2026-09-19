import { describe, it, expect } from 'vitest'
import { podeEditarFicha, acessoDaFicha, colunasDeAcesso, agruparPorPasta } from './permissoesFicha'

describe('permissões da ficha (F30)', () => {
  const ficha = { dono_id: 'd', leitores: ['l', 'x'], editores: ['e', 'x'] }
  it('edita: dono e editor; leitor e estranho não', () => {
    expect(podeEditarFicha(ficha, 'd')).toBe(true)
    expect(podeEditarFicha(ficha, 'e')).toBe(true)
    expect(podeEditarFicha(ficha, 'l')).toBe(false)
    expect(podeEditarFicha(ficha, 'z')).toBe(false)
    expect(podeEditarFicha(ficha, null)).toBe(false)
    expect(podeEditarFicha({ dono_id: 'd' }, 'e')).toBe(false) // ficha antiga, sem colunas
  })
  it('ida e volta das listas; editar vence ver; dono nunca entra', () => {
    const acesso = acessoDaFicha(ficha)
    expect(acesso).toEqual({ l: 'ver', x: 'editar', e: 'editar' })
    expect(colunasDeAcesso({ ...acesso, d: 'editar', n: 'nenhum' }, 'd')).toEqual({ leitores: ['l'], editores: ['x', 'e'] })
  })
  it('agrupa por pasta: sem pasta primeiro, resto em ordem alfabética', () => {
    const fichas = [
      { id: 1, pasta: 'Vilões' }, { id: 2, pasta: null }, { id: 3, pasta: 'aliados' },
      { id: 4, pasta: 'Vilões' }, { id: 5, pasta: '  ' },
    ]
    expect(agruparPorPasta(fichas).map(g => [g.pasta, g.fichas.map(f => f.id)])).toEqual([
      [null, [2, 5]], ['aliados', [3]], ['Vilões', [1, 4]],
    ])
  })
})
