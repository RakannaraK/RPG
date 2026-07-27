import { describe, it, expect } from 'vitest'
import { resumirSessao } from './recapEngine'

const rolagem = (over = {}) => ({
  autor_nome: 'Ana',
  rotulo: 'Teste de Força',
  notacao: '1d20+3',
  resultados: { dados: [{ lados: 20, valor: 15 }] },
  total: 18,
  created_at: '2026-01-10T20:00:00Z',
  ...over,
})

describe('resumirSessao', () => {
  it('lista vazia devolve retrato vazio, sem quebrar', () => {
    const r = resumirSessao([])
    expect(r.total).toBe(0)
    expect(r.periodo).toBeNull()
    expect(r.participantes).toEqual([])
    expect(r.maiores).toEqual([])
  })

  it('conta o total e separa rolagens com dados de eventos narrados', () => {
    const r = resumirSessao([
      rolagem(),
      rolagem({ rotulo: 'Cura — Bênção', notacao: '', resultados: { dados: [] }, total: 5 }),
    ])
    expect(r.total).toBe(2)
    expect(r.comDados).toBe(1)
    expect(r.eventos).toHaveLength(1)
    expect(r.eventos[0].rotulo).toMatch(/Cura/)
  })

  it('agrupa por participante, do mais ativo para o menos', () => {
    const r = resumirSessao([
      rolagem({ autor_nome: 'Ana' }),
      rolagem({ autor_nome: 'Bruno' }),
      rolagem({ autor_nome: 'Ana' }),
    ])
    expect(r.participantes[0]).toEqual({ nome: 'Ana', total: 2, criticos: 0 })
    expect(r.participantes[1]).toEqual({ nome: 'Bruno', total: 1, criticos: 0 })
  })

  it('destaca críticos e os conta por participante', () => {
    const r = resumirSessao([
      rolagem({ autor_nome: 'Ana', resultados: { dados: [{ lados: 20, valor: 20 }], critico: { multiplicador: 2 } } }),
      rolagem({ autor_nome: 'Ana' }),
    ])
    expect(r.criticos).toHaveLength(1)
    expect(r.participantes[0].criticos).toBe(1)
  })

  it('traz as 3 maiores rolagens, da maior para a menor', () => {
    const r = resumirSessao([
      rolagem({ total: 10 }), rolagem({ total: 30 }), rolagem({ total: 20 }), rolagem({ total: 5 }),
    ])
    expect(r.maiores.map(x => x.total)).toEqual([30, 20, 10])
  })

  it('período vai da primeira à última rolagem, em ordem cronológica', () => {
    const r = resumirSessao([
      rolagem({ created_at: '2026-01-10T22:00:00Z' }),
      rolagem({ created_at: '2026-01-10T19:00:00Z' }),
    ])
    expect(r.periodo.de).toBe('2026-01-10T19:00:00Z')
    expect(r.periodo.ate).toBe('2026-01-10T22:00:00Z')
  })

  it('tolera linhas malformadas sem lançar', () => {
    const r = resumirSessao([{}, { resultados: null }, null])
    expect(r.total).toBe(3)
    expect(r.participantes[0].nome).toBe('Alguém')
  })
})
