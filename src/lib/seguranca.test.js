import { describe, it, expect } from 'vitest'
import { agruparLimites, validarLimite, xcardAtivo } from './seguranca'

describe('F44 — segurança da mesa', () => {
  it('valida o texto do limite', () => {
    expect(validarLimite('linha', '  aranhas ')).toEqual({ ok: true, texto: 'aranhas' })
    expect(validarLimite('linha', '   ').ok).toBe(false)
    expect(validarLimite('tabu', 'x').ok).toBe(false)
    expect(validarLimite('veu', 'a'.repeat(201)).ok).toBe(false)
  })

  it('agrupa por tipo em ordem de chegada', () => {
    const g = agruparLimites([
      { id: 2, tipo: 'linha', created_at: '2026-09-25T20:02:00Z' },
      { id: 1, tipo: 'linha', created_at: '2026-09-25T20:01:00Z' },
      { id: 3, tipo: 'combinado', created_at: '2026-09-25T20:00:00Z' },
      { id: 4, tipo: 'desconhecido', created_at: '2026-09-25T20:00:00Z' },
    ])
    expect(g.linha.map(l => l.id)).toEqual([1, 2])
    expect(g.veu).toEqual([])
    expect(g.combinado.map(l => l.id)).toEqual([3])
  })

  it('X-Card: mostra o toque recente que a pessoa ainda não dispensou', () => {
    const agora = Date.parse('2026-09-25T20:10:00Z')
    const toques = [
      { id: 'velho', created_at: '2026-09-25T19:00:00Z' },
      { id: 'a', created_at: '2026-09-25T20:05:00Z' },
      { id: 'b', created_at: '2026-09-25T20:08:00Z' },
    ]
    expect(xcardAtivo(toques, 0, agora).id).toBe('b')
    // dispensou o "b": nada (o "a" é anterior)
    expect(xcardAtivo(toques, Date.parse('2026-09-25T20:08:00Z'), agora)).toBeNull()
    // quem chega uma hora depois não vê o aviso velho
    expect(xcardAtivo(toques, 0, agora + 60 * 60 * 1000)).toBeNull()
  })
})
