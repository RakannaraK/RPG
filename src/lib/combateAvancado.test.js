import { describe, it, expect } from 'vitest'
import {
  estadoDaHabilidade, aoUsarHabilidade, ajustarCarga, liberarRecarga,
  efeitosDoTurno, textoEfeitoTurno, planejarTroca, emJogo, naReserva,
} from './combateAvancado'

describe('estado da habilidade', () => {
  it('sem recarga nem carga: sempre pronta (retrocompatível)', () => {
    expect(estadoDaHabilidade({}, {})).toMatchObject({ pronta: true, ehUltimate: false, motivo: null })
  })
  it('em recarga: bloqueada com o motivo no plural certo', () => {
    expect(estadoDaHabilidade({ recarga_restante: 2 }, { recarga_turnos: 3 })).toMatchObject({ pronta: false, emRecarga: true, motivo: 'Em recarga: faltam 2 turnos' })
    expect(estadoDaHabilidade({ recarga_restante: 1 }, { recarga_turnos: 3 }).motivo).toBe('Em recarga: falta 1 turno')
    expect(estadoDaHabilidade({ recarga_restante: null }, { recarga_turnos: 3 })).toMatchObject({ pronta: true, emRecarga: false })
  })
  it('ultimate: só pronta com a carga cheia', () => {
    expect(estadoDaHabilidade({ carga_atual: 2 }, { carga_max: 3 })).toMatchObject({ ehUltimate: true, cheia: false, pronta: false, motivo: 'Carga 2/3' })
    expect(estadoDaHabilidade({ carga_atual: 3 }, { carga_max: 3 })).toMatchObject({ cheia: true, pronta: true })
    expect(estadoDaHabilidade({ carga_atual: 9 }, { carga_max: 3 }).cheia).toBe(true)
  })
})

describe('usar e ajustar', () => {
  it('usar liga a recarga e zera a ultimate', () => {
    expect(aoUsarHabilidade({ carga_atual: 3 }, { carga_max: 3, recarga_turnos: 2 })).toEqual({ recarga_restante: 2, carga_atual: 0 })
    expect(aoUsarHabilidade({}, { recarga_turnos: 0 })).toEqual({}) // recarga 0 = nenhuma
    expect(aoUsarHabilidade({}, {})).toEqual({})
  })
  it('carga na mão respeita 0 e o teto', () => {
    expect(ajustarCarga({ carga_atual: 2 }, { carga_max: 3 }, +1)).toEqual({ carga_atual: 3 })
    expect(ajustarCarga({ carga_atual: 3 }, { carga_max: 3 }, +1)).toEqual({ carga_atual: 3 })
    expect(ajustarCarga({ carga_atual: 0 }, { carga_max: 3 }, -1)).toEqual({ carga_atual: 0 })
    expect(ajustarCarga({ carga_atual: 5 }, {}, +1)).toEqual({ carga_atual: 0 }) // não é ultimate
  })
  it('liberar recarga volta a pronta', () => {
    expect(liberarRecarga()).toEqual({ recarga_restante: null })
  })
})

describe('efeitos por rodada', () => {
  const condicoes = [
    { id: 'x1', combatente_id: 'k1', nome: 'Veneno', efeito_turno: { tipo: 'dano', notacao: '1d4' } },
    { id: 'x2', combatente_id: 'k1', nome: 'Regeneração', efeito_turno: { tipo: 'cura', valor: 2 } },
    { id: 'x3', combatente_id: 'k1', nome: 'Atordoado' }, // sem efeito por rodada
    { id: 'x4', combatente_id: 'k2', nome: 'Queimando', efeito_turno: { tipo: 'dano', valor: 3 } },
    { id: 'x5', combatente_id: 'k1', nome: 'Nada', efeito_turno: { tipo: 'dano', valor: 0 } },
  ]
  it('só as condições daquele combatente, só as que têm efeito', () => {
    expect(efeitosDoTurno(condicoes, 'k1')).toEqual([
      { condicaoId: 'x1', nome: 'Veneno', tipo: 'dano', valor: null, notacao: '1d4' },
      { condicaoId: 'x2', nome: 'Regeneração', tipo: 'cura', valor: 2, notacao: null },
    ])
    expect(efeitosDoTurno(condicoes, 'k2')).toHaveLength(1)
    expect(efeitosDoTurno(condicoes, 'k9')).toEqual([])
  })
  it('texto do feed', () => {
    expect(textoEfeitoTurno({ nome: 'Veneno', tipo: 'dano' }, 3)).toBe('Veneno: −3 de vida')
    expect(textoEfeitoTurno({ nome: 'Regeneração', tipo: 'cura' }, 2)).toBe('Regeneração: +2 de vida')
  })
})

describe('reserva e troca', () => {
  const combatentes = [
    { id: 'a', nome: 'Aria', reserva: false, ordem: 0, iniciativa: 18 },
    { id: 'b', nome: 'Borin', reserva: false, ordem: 1, iniciativa: 12 },
    { id: 'c', nome: 'Caio', reserva: true, ordem: null, iniciativa: null },
  ]
  it('o suplente herda ordem e iniciativa de quem sai', () => {
    const { patches, narracao } = planejarTroca(combatentes, 'b', 'c')
    expect(patches).toEqual([
      { id: 'b', reserva: true },
      { id: 'c', reserva: false, ordem: 1, iniciativa: 12 },
    ])
    expect(narracao).toBe('Caio entra no lugar de Borin')
  })
  it('escolhas impossíveis explicam o motivo', () => {
    expect(() => planejarTroca(combatentes, 'b', 'a')).toThrow(/já está em jogo/)
    expect(() => planejarTroca(combatentes, 'c', 'c')).toThrow(/diferentes/)
    expect(() => planejarTroca(combatentes, 'c', 'a')).toThrow(/já está em jogo/)
    expect(() => planejarTroca(combatentes, 'b', 'z')).toThrow(/quem sai e quem entra/)
  })
  it('em jogo e reserva', () => {
    expect(emJogo(combatentes).map(c => c.id)).toEqual(['a', 'b'])
    expect(naReserva(combatentes).map(c => c.id)).toEqual(['c'])
  })
})
