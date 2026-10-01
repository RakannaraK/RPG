import { describe, it, expect } from 'vitest'
import { agruparPorDia, iconeDaNotificacao, quandoFoi } from './notificacoes'

describe('F52 — notificações', () => {
  it('ícone pelo prefixo do tipo, com reserva para tipo desconhecido', () => {
    expect(iconeDaNotificacao('sessao_iniciada')).toBe('vivo')
    expect(iconeDaNotificacao('promovido_comestre')).toBe('coroa')
    expect(iconeDaNotificacao('removido_mesa')).toBe('porta')
    expect(iconeDaNotificacao('pedido_vaga')).toBe('pessoas')
    expect(iconeDaNotificacao('qualquer_coisa')).toBe('sino')
    expect(iconeDaNotificacao(null)).toBe('sino')
  })

  it('agrupa por dia mantendo a ordem', () => {
    const agora = new Date(2026, 9, 1, 12, 0)
    const n = (id, d) => ({ id, created_at: d.toISOString() })
    const grupos = agruparPorDia([
      n(1, new Date(2026, 9, 1, 11)), n(2, new Date(2026, 9, 1, 8)),
      n(3, new Date(2026, 8, 30, 22)), n(4, new Date(2026, 8, 27, 10)), n(5, new Date(2026, 7, 1)),
    ], agora)
    expect(grupos.map(g => [g.rotulo, g.itens.map(i => i.id)])).toEqual([
      ['Hoje', [1, 2]], ['Ontem', [3]], ['Esta semana', [4]], ['Antes', [5]],
    ])
  })

  it('hora relativa', () => {
    const agora = new Date(2026, 9, 1, 12, 0)
    expect(quandoFoi(new Date(2026, 9, 1, 11, 59, 30), agora)).toBe('agora')
    expect(quandoFoi(new Date(2026, 9, 1, 11, 45), agora)).toBe('15 min')
    expect(quandoFoi(new Date(2026, 9, 1, 9, 0), agora)).toBe('3 h')
    expect(quandoFoi(new Date(2026, 8, 30, 19, 32), agora)).toBe('ontem 19:32')
    expect(quandoFoi(new Date(2026, 6, 14, 19, 32), agora)).toBe('14/07 19:32')
  })
})
