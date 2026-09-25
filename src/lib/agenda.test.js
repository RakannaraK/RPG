import { describe, it, expect } from 'vitest'
import {
  contarRespostas, deHorarioNoFuso, enesimaOcorrencia, partesNoFuso, proximaDaMesa,
  proximaOcorrencia, textoFalta, textoQuando, validarAgenda,
} from './agenda'

const TZ = 'America/Sao_Paulo'
// domingo 27/09/2026 às 20:00 em Brasília = 23:00 UTC
const SAB_20H = '2026-09-27T23:00:00.000Z'

describe('F40 — agenda da mesa', () => {
  it('converte horário de parede no fuso e volta', () => {
    const d = deHorarioNoFuso({ ano: 2026, mes: 9, dia: 27, hora: 20, minuto: 0 }, TZ)
    expect(d.toISOString()).toBe(SAB_20H)
    expect(partesNoFuso(d, TZ)).toMatchObject({ dia: 27, hora: 20 })
  })

  it('semanal e quinzenal andam de 7 e 14 dias', () => {
    const ev = { inicio: SAB_20H, recorrencia: 'semanal' }
    expect(enesimaOcorrencia(ev, 2, TZ).toISOString()).toBe('2026-10-11T23:00:00.000Z')
    expect(enesimaOcorrencia({ ...ev, recorrencia: 'quinzenal' }, 1, TZ).toISOString()).toBe('2026-10-11T23:00:00.000Z')
  })

  it('mensal no dia 31 cai no último dia do mês seguinte, na mesma hora local', () => {
    const ev = { inicio: deHorarioNoFuso({ ano: 2026, mes: 10, dia: 31, hora: 22, minuto: 0 }, TZ), recorrencia: 'mensal' }
    const nov = enesimaOcorrencia(ev, 1, TZ)
    expect(partesNoFuso(nov, TZ)).toMatchObject({ mes: 11, dia: 30, hora: 22 })
  })

  it('próxima ocorrência: sessão em andamento ainda conta, a que acabou não', () => {
    const ev = { inicio: SAB_20H, duracao_min: 180, recorrencia: 'semanal' }
    const durante = new Date('2026-09-28T00:30:00Z') // 21h30 de domingo
    expect(proximaOcorrencia(ev, durante, TZ).inicio.toISOString()).toBe(SAB_20H)
    const depois = new Date('2026-09-28T03:00:00Z') // meia-noite: acabou às 23h
    expect(proximaOcorrencia(ev, depois, TZ).inicio.toISOString()).toBe('2026-10-04T23:00:00.000Z')
  })

  it('respeita o fim da recorrência e o evento único que já passou', () => {
    const ev = { inicio: SAB_20H, recorrencia: 'semanal', ate: '2026-10-05' }
    expect(proximaOcorrencia(ev, new Date('2026-10-06T12:00:00Z'), TZ)).toBeNull()
    const unico = { inicio: SAB_20H, recorrencia: 'nenhuma' }
    expect(proximaOcorrencia(unico, new Date('2026-10-01T00:00:00Z'), TZ)).toBeNull()
  })

  it('pula direto para perto de agora numa recorrência antiga', () => {
    const ev = { inicio: '2020-01-04T23:00:00.000Z', recorrencia: 'semanal' }
    const o = proximaOcorrencia(ev, new Date(SAB_20H), TZ)
    expect(o.inicio.getTime()).toBeGreaterThanOrEqual(new Date(SAB_20H).getTime() - 3 * 3600 * 1000)
  })

  it('a mais próxima entre várias agendas', () => {
    const a = { id: 'a', inicio: '2026-10-10T23:00:00Z', recorrencia: 'nenhuma' }
    const b = { id: 'b', inicio: SAB_20H, recorrencia: 'nenhuma' }
    expect(proximaDaMesa([a, b], new Date('2026-09-25T12:00:00Z'), TZ).evento.id).toBe('b')
  })

  it('textos de quando e de quanto falta', () => {
    const agora = new Date('2026-09-27T12:00:00Z') // 9h de domingo em Brasília
    expect(textoQuando(new Date(SAB_20H), agora, TZ)).toBe('hoje às 20:00')
    expect(textoQuando(new Date('2026-09-28T23:00:00Z'), agora, TZ)).toBe('amanhã às 20:00')
    expect(textoFalta(new Date(SAB_20H), new Date('2026-09-28T02:00:00Z'), agora)).toBe('daqui a 11 h')
    expect(textoFalta(new Date(SAB_20H), new Date('2026-09-28T02:00:00Z'), new Date('2026-09-27T23:30:00Z'))).toBe('acontecendo agora')
    // 2 dias e 19 h: "daqui a 2 dias", não 3
    expect(textoFalta(new Date(SAB_20H), new Date('2026-09-28T02:00:00Z'), new Date('2026-09-25T04:00:00Z'))).toBe('daqui a 2 dias')
  })

  it('conta respostas só da ocorrência pedida', () => {
    const p = [
      { ocorrencia: '2026-09-27T23:00:00+00:00', resposta: 'vou' },
      { ocorrencia: SAB_20H, resposta: 'talvez' },
      { ocorrencia: '2026-10-04T23:00:00Z', resposta: 'vou' },
    ]
    expect(contarRespostas(p, SAB_20H)).toEqual({ vou: 1, talvez: 1, nao: 0 })
  })

  it('valida o formulário', () => {
    expect(validarAgenda({ inicio: SAB_20H, duracao_min: 180, recorrencia: 'semanal' }).ok).toBe(true)
    expect(validarAgenda({ inicio: '', duracao_min: 180, recorrencia: 'semanal' }).ok).toBe(false)
    expect(validarAgenda({ inicio: SAB_20H, duracao_min: 5, recorrencia: 'semanal' }).ok).toBe(false)
    expect(validarAgenda({ inicio: SAB_20H, duracao_min: 180, recorrencia: 'semanal', ate: '2026-09-01' }).ok).toBe(false)
  })
})
