import { describe, it, expect } from 'vitest'
import { passosDoGuia, quantosFeitos } from './guia'

describe('F52 — guia do mestre em passos', () => {
  it('sem mesa: nada feito e só dá para criar a mesa', () => {
    const p = passosDoGuia({})
    expect(quantosFeitos(p)).toBe(0)
    expect(p[0].acao).toMatchObject({ criar: true })
    expect(p.slice(1).every(x => !x.acao)).toBe(true)
  })

  it('marca só o que o banco confirma e aponta para a aba certa', () => {
    const p = passosDoGuia({ mesaId: 'm1', atributos: 6, outrosMembros: 0, fichas: 2, sessoes: 0 })
    expect(p.map(x => x.feito)).toEqual([true, true, false, true, false])
    expect(quantosFeitos(p)).toBe(3)
    expect(p.find(x => x.id === 'convite').acao.para).toBe('/mesa/m1?aba=Membros')
    expect(p.find(x => x.id === 'sistema').acao.para).toBe('/mesa/m1?aba=Sistema')
  })
})
