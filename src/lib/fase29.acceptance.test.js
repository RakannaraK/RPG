// Aceitação da Fase 29 (parte pura). O lado do banco — sussurro privado de
// verdade, nota privada invisível ao mestre, evento secreto invisível ao
// jogador, espectador fala mas não escreve em mesa arquivada — foi testado
// com RLS no banco real (38/38, transação desfeita).
import { describe, it, expect } from 'vitest'
import { destinatarios, interpretarEntrada, rotuloSussurro } from './chatMesa'
import {
  PRESETS_CALENDARIO, avancarDias, eventosDoDia, formatarData, limitarData, normalizarCalendario, textoPassagem,
} from './calendarioEngine'

const membros = [
  { usuario_id: 'mestre', nome: 'Mestre', role: 'mestre' },
  { usuario_id: 'aria', nome: 'Aria', role: 'jogador' },
  { usuario_id: 'borin', nome: 'Borin', role: 'jogador' },
  { usuario_id: 'espec', nome: 'Visita', role: 'espectador' },
]
const nomeDe = id => membros.find(m => m.usuario_id === id)?.nome

describe('Fase 29 — aceitação', () => {
  it('jogador sussurra ao mestre: só o mestre é destinatário', () => {
    const para = destinatarios('mestres', membros, 'aria')
    expect(para).toEqual(['mestre'])
    const msg = { autor_id: 'aria', para, texto: 'psiu' }
    expect(rotuloSussurro(msg, 'aria', nomeDe)).toBe('🤫 para Mestre')
    expect(rotuloSussurro(msg, 'mestre', nomeDe)).toBe('🤫 sussurro para você')
  })

  it('/r 1d20+5 rola (vai ao feed), texto comum vira mensagem, /r torto não é enviado', () => {
    expect(interpretarEntrada('/r 1d20+5 furtividade')).toEqual({ tipo: 'rolagem', notacao: '1d20+5', rotulo: 'furtividade' })
    expect(interpretarEntrada('bora!')).toEqual({ tipo: 'mensagem', texto: 'bora!' })
    expect(interpretarEntrada('/r d20 +')).toMatchObject({ tipo: 'erro' })
  })

  it('mestre passa 3 dias a partir de um 29 de fevereiro inexistente: normaliza e vira março', () => {
    const cal = normalizarCalendario(PRESETS_CALENDARIO.gregoriano)
    const hoje = limitarData({ ano: 1024, mes: 2, dia: 29 }, cal)
    expect(hoje).toEqual({ ano: 1024, mes: 2, dia: 28 })
    const depois = avancarDias(hoje, 3, cal)
    expect(depois).toEqual({ ano: 1024, mes: 3, dia: 3 })
    // 3 dias depois = 3 posições adiante na semana
    const semana = cal.dias_semana
    const idx = d => semana.indexOf(formatarData(d, cal).split(',')[0])
    expect((idx(hoje) + 3) % 7).toBe(idx(depois))
    expect(textoPassagem(3)).toBe('Passaram 3 dias')
  })

  it('evento anual aparece todo ano; único só no ano dele', () => {
    const eventos = [
      { id: 'festival', ano: null, mes: 6, dia: 1, titulo: 'Festival' },
      { id: 'eclipse', ano: 1024, mes: 4, dia: 1, titulo: 'Eclipse' },
    ]
    for (const ano of [1, 1024, 5000]) expect(eventosDoDia(eventos, { ano, mes: 6, dia: 1 }).map(e => e.id)).toEqual(['festival'])
    expect(eventosDoDia(eventos, { ano: 1024, mes: 4, dia: 1 })).toHaveLength(1)
    expect(eventosDoDia(eventos, { ano: 1025, mes: 4, dia: 1 })).toHaveLength(0)
  })

  it('sem limite: calendário de 100 meses e sussurro para toda a mesa menos um', () => {
    const cal = normalizarCalendario({ meses: Array.from({ length: 100 }, (_, i) => ({ nome: `M${i + 1}`, dias: 10 })) })
    expect(avancarDias({ ano: 1, mes: 100, dia: 10 }, 1, cal)).toEqual({ ano: 2, mes: 1, dia: 1 })
    expect(destinatarios('borin', membros, 'aria')).toEqual(['borin'])
  })
})
