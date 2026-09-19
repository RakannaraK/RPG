import { describe, it, expect } from 'vitest'
import {
  PRESETS_CALENDARIO, normalizarCalendario, diasNoAno, limitarData, diaAbsoluto, deAbsoluto,
  avancarDias, diaDaSemana, gradeDoMes, eventosDoDia, proximosEventos, formatarData, textoPassagem,
} from './calendarioEngine'

const greg = normalizarCalendario(PRESETS_CALENDARIO.gregoriano)
const fant = normalizarCalendario(PRESETS_CALENDARIO.fantasia)

describe('normalizarCalendario', () => {
  it('config vazia vira o modelo fantasia', () => {
    const c = normalizarCalendario({})
    expect(c.meses).toHaveLength(12)
    expect(diasNoAno(c)).toBe(360)
  })
  it('conserta meses tortos e tira dias da semana vazios', () => {
    const c = normalizarCalendario({ meses: [{ nome: '', dias: 0 }, { nome: 'B', dias: 'x' }], dias_semana: ['A', '', null, 'B'], deslocamento: 5 })
    expect(c.meses).toEqual([{ nome: 'Mês 1', dias: 1 }, { nome: 'B', dias: 30 }])
    expect(c.dias_semana).toEqual(['A', 'B'])
    expect(c.deslocamento).toBe(1)
  })
  it('sem limite: 40 meses de 100 dias', () => {
    const c = normalizarCalendario({ meses: Array.from({ length: 40 }, () => ({ nome: 'M', dias: 100 })) })
    expect(diasNoAno(c)).toBe(4000)
  })
})

describe('avançar e voltar dias', () => {
  it('virada de mês e de ano', () => {
    expect(avancarDias({ ano: 1, mes: 2, dia: 28 }, 1, greg)).toEqual({ ano: 1, mes: 3, dia: 1 })
    expect(avancarDias({ ano: 1, mes: 12, dia: 31 }, 1, greg)).toEqual({ ano: 2, mes: 1, dia: 1 })
    expect(avancarDias({ ano: 1024, mes: 1, dia: 1 }, 365, greg)).toEqual({ ano: 1025, mes: 1, dia: 1 })
  })
  it('voltar antes do ano 1 dá ano 0 e negativos', () => {
    expect(avancarDias({ ano: 1, mes: 1, dia: 1 }, -1, greg)).toEqual({ ano: 0, mes: 12, dia: 31 })
    expect(avancarDias({ ano: 1, mes: 1, dia: 1 }, -366, greg)).toEqual({ ano: -1, mes: 12, dia: 31 })
  })
  it('ida e volta é identidade', () => {
    const d = { ano: 1492, mes: 7, dia: 19 }
    for (const n of [0, 1, 29, 360, 1000, -1000]) expect(avancarDias(avancarDias(d, n, fant), -n, fant)).toEqual(d)
    expect(deAbsoluto(diaAbsoluto(d, fant), fant)).toEqual(d)
  })
  it('limitarData encaixa dia inexistente (30 de fevereiro → 28)', () => {
    expect(limitarData({ ano: 5, mes: 2, dia: 30 }, greg)).toEqual({ ano: 5, mes: 2, dia: 28 })
    expect(limitarData({ ano: 5, mes: 99, dia: 0 }, greg)).toEqual({ ano: 5, mes: 12, dia: 1 })
  })
})

describe('dia da semana e grade', () => {
  it('1/1 do ano 1 é segunda no gregoriano; +7 dias é o mesmo dia', () => {
    expect(greg.dias_semana[diaDaSemana({ ano: 1, mes: 1, dia: 1 }, greg)]).toBe('Segunda')
    const d = { ano: 1024, mes: 5, dia: 10 }
    expect(diaDaSemana(avancarDias(d, 7, greg), greg)).toBe(diaDaSemana(d, greg))
    expect(diaDaSemana(avancarDias(d, 1, greg), greg)).toBe((diaDaSemana(d, greg) + 1) % 7)
  })
  it('sem semana: null e grade de 7 colunas', () => {
    const c = normalizarCalendario({ meses: [{ nome: 'Único', dias: 10 }] })
    expect(diaDaSemana({ ano: 1, mes: 1, dia: 1 }, c)).toBeNull()
    expect(gradeDoMes(1, 1, c)).toEqual([[1, 2, 3, 4, 5, 6, 7], [8, 9, 10, null, null, null, null]])
  })
  it('grade começa no dia da semana certo e cobre o mês inteiro', () => {
    const semanas = gradeDoMes(1, 1, greg) // janeiro do ano 1 começa na segunda (coluna 1)
    expect(semanas[0].slice(0, 2)).toEqual([null, 1])
    expect(semanas.flat().filter(Boolean)).toHaveLength(31)
    expect(semanas.every(s => s.length === 7)).toBe(true)
  })
})

describe('eventos', () => {
  const eventos = [
    { id: 'a', ano: null, mes: 6, dia: 1, titulo: 'Festival' },
    { id: 'b', ano: 1024, mes: 4, dia: 1, titulo: 'Eclipse' },
    { id: 'c', ano: 1000, mes: 1, dia: 1, titulo: 'Passado' },
  ]
  it('anual aparece todo ano; único só no ano dele', () => {
    expect(eventosDoDia(eventos, { ano: 1, mes: 6, dia: 1 }).map(e => e.id)).toEqual(['a'])
    expect(eventosDoDia(eventos, { ano: 1024, mes: 4, dia: 1 }).map(e => e.id)).toEqual(['b'])
    expect(eventosDoDia(eventos, { ano: 1025, mes: 4, dia: 1 })).toEqual([])
  })
  it('próximos: em ordem, anual já passado vai pro ano seguinte, passado some', () => {
    const p = proximosEventos(eventos, { ano: 1024, mes: 3, dia: 1 }, fant)
    expect(p.map(x => [x.evento.id, x.emDias])).toEqual([['b', 30], ['a', 90]])
    const depois = proximosEventos(eventos, { ano: 1024, mes: 7, dia: 1 }, fant)
    expect(depois.map(x => [x.evento.id, x.data.ano])).toEqual([['a', 1025]])
  })
  it('evento de hoje conta (0 dias)', () => {
    expect(proximosEventos(eventos, { ano: 9, mes: 6, dia: 1 }, fant)[0].emDias).toBe(0)
  })
})

describe('textos', () => {
  it('formatarData', () => {
    expect(formatarData({ ano: 1, mes: 1, dia: 1 }, greg)).toBe('Segunda, 1 de Janeiro de 1')
    const c = normalizarCalendario({ meses: [{ nome: 'Brumas', dias: 20 }], sufixo_ano: 'DR' })
    expect(formatarData({ ano: 1492, mes: 1, dia: 3 }, c)).toBe('3 de Brumas de 1492 DR')
  })
  it('textoPassagem', () => {
    expect(textoPassagem(1)).toBe('Passou 1 dia')
    expect(textoPassagem(7)).toBe('Passaram 7 dias')
    expect(textoPassagem(-2)).toBe('O calendário voltou 2 dias')
  })
})
