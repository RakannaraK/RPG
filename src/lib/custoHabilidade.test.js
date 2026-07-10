import { describe, it, expect } from 'vitest'
import {
  custosDaHabilidade, custosDeTurno, resolverCustos,
  podeAtivarHabilidade, descreverCustoTurno, planejarTurno,
} from './custoHabilidade'

const THARIUNS = { id: 'p-thar', nome: 'Thariuns' }
const FOCO = { id: 'p-foco', nome: 'Pontos de Foco' }
const POOLS_POR_ID = { 'p-thar': THARIUNS, 'p-foco': FOCO }

// Transformação do IC: 2 Thariuns por turno enquanto ativa
const TRANSFORMACAO = {
  id: 'h-transf',
  nome: 'Transformação',
  tipo: 'ativavel',
  custo_pool: [{ pool_id: 'p-thar', quantidade: '2', por_turno: true }],
}

// Habilidade com custo só de ativação (não recorrente)
const GRITO = {
  id: 'h-grito',
  nome: 'Grito de Guerra',
  tipo: 'ativavel',
  custo_pool: [{ pool_id: 'p-foco', quantidade: '3', por_turno: false }],
}

const SEM_CUSTO = { id: 'h-x', nome: 'Postura', tipo: 'ativavel' }

const estadoCom = (thar, foco = 10) => ({
  atualDoPool: id => (id === 'p-thar' ? thar : foco),
  poolsPorId: POOLS_POR_ID,
  contexto: { nivel: 13 },
})

describe('20.5 — leitura dos custos', () => {
  it('separa custos recorrentes dos de ativação', () => {
    expect(custosDaHabilidade(TRANSFORMACAO)).toHaveLength(1)
    expect(custosDeTurno(TRANSFORMACAO)).toHaveLength(1)
    expect(custosDeTurno(GRITO)).toHaveLength(0)
  })
  it('habilidade sem custo_pool', () => {
    expect(custosDaHabilidade(SEM_CUSTO)).toEqual([])
    expect(custosDeTurno(SEM_CUSTO)).toEqual([])
  })
  it('quantidade aceita fórmula', () => {
    const custos = [{ pool_id: 'p-thar', quantidade: 'piso(nivel / 4)' }]
    expect(resolverCustos(custos, { nivel: 13 })).toEqual([{ pool_id: 'p-thar', quantidade: 3 }])
  })
  it('descreve o custo recorrente', () => {
    expect(descreverCustoTurno(TRANSFORMACAO, POOLS_POR_ID)).toBe('2 Thariuns/turno')
    expect(descreverCustoTurno(GRITO, POOLS_POR_ID)).toBeNull()
  })
})

describe('20.5 — ativar debita o custo', () => {
  it('com Thariuns suficientes, ativa e informa o débito', () => {
    const r = podeAtivarHabilidade(TRANSFORMACAO, estadoCom(26))
    expect(r.ok).toBe(true)
    expect(r.custos).toEqual([{ pool_id: 'p-thar', quantidade: 2 }])
  })
  it('pool insuficiente NÃO ativa, e diz o porquê', () => {
    const r = podeAtivarHabilidade(TRANSFORMACAO, estadoCom(1))
    expect(r.ok).toBe(false)
    expect(r.motivo).toBe('Thariuns insuficiente: tem 1, precisa de 2.')
  })
  it('habilidade sem custo sempre ativa', () => {
    expect(podeAtivarHabilidade(SEM_CUSTO, estadoCom(0)).ok).toBe(true)
  })
  it('custos repetidos do mesmo pool somam', () => {
    const hab = { custo_pool: [
      { pool_id: 'p-thar', quantidade: '2' },
      { pool_id: 'p-thar', quantidade: '3' },
    ] }
    const r = podeAtivarHabilidade(hab, estadoCom(4))
    expect(r.ok).toBe(false)
    expect(r.motivo).toMatch(/precisa de 5/)
  })
  it('fórmula quebrada vira motivo, não exceção', () => {
    const hab = { custo_pool: [{ pool_id: 'p-thar', quantidade: 'nivel +' }] }
    expect(podeAtivarHabilidade(hab, estadoCom(99)).ok).toBe(false)
  })
})

describe('20.5 — cada turno debita 2 Thariuns', () => {
  const ativas = [{ id: 'hf-1', habilidade: TRANSFORMACAO }]

  it('com 26 Thariuns, o turno debita 2 → 24', () => {
    const p = planejarTurno(ativas, estadoCom(26))
    expect(p.debitos).toEqual([{ pool_id: 'p-thar', atual: 24 }])
    expect(p.desativar).toEqual([])
    expect(p.avisos).toEqual([])
  })

  it('com exatamente 2, ainda paga → 0', () => {
    const p = planejarTurno(ativas, estadoCom(2))
    expect(p.debitos).toEqual([{ pool_id: 'p-thar', atual: 0 }])
    expect(p.desativar).toEqual([])
  })

  it('Thariuns zerando DESATIVA a transformação, com aviso', () => {
    const p = planejarTurno(ativas, estadoCom(1))
    expect(p.debitos).toEqual([]) // nada foi debitado
    expect(p.desativar).toEqual(['hf-1'])
    expect(p.avisos[0]).toMatch(/Transformação desativada.*Thariuns insuficiente/)
  })

  it('custo só de ativação não é cobrado por turno', () => {
    const p = planejarTurno([{ id: 'hf-2', habilidade: GRITO }], estadoCom(26))
    expect(p.debitos).toEqual([])
    expect(p.desativar).toEqual([])
  })

  it('habilidade sem custo nenhum é ignorada', () => {
    const p = planejarTurno([{ id: 'hf-3', habilidade: SEM_CUSTO }], estadoCom(26))
    expect(p.debitos).toEqual([])
  })
})

describe('20.5 — várias habilidades disputam o mesmo pool', () => {
  const A = { id: 'a', nome: 'Aura', custo_pool: [{ pool_id: 'p-thar', quantidade: '2', por_turno: true }] }
  const B = { id: 'b', nome: 'Brasa', custo_pool: [{ pool_id: 'p-thar', quantidade: '2', por_turno: true }] }

  it('quem vem antes paga; quem não couber é desativada', () => {
    const p = planejarTurno([{ id: 'hf-a', habilidade: A }, { id: 'hf-b', habilidade: B }], estadoCom(3))
    expect(p.debitos).toEqual([{ pool_id: 'p-thar', atual: 1 }]) // A pagou 2
    expect(p.desativar).toEqual(['hf-b'])                        // B não coube
    expect(p.avisos[0]).toMatch(/Brasa desativada/)
  })

  it('com folga, as duas pagam', () => {
    const p = planejarTurno([{ id: 'hf-a', habilidade: A }, { id: 'hf-b', habilidade: B }], estadoCom(10))
    expect(p.debitos).toEqual([{ pool_id: 'p-thar', atual: 6 }])
    expect(p.desativar).toEqual([])
  })

  it('pools diferentes não se atrapalham', () => {
    const C = { id: 'c', nome: 'Cálice', custo_pool: [{ pool_id: 'p-foco', quantidade: '4', por_turno: true }] }
    const p = planejarTurno([{ id: 'hf-a', habilidade: A }, { id: 'hf-c', habilidade: C }], estadoCom(10, 10))
    expect(p.debitos).toEqual([
      { pool_id: 'p-thar', atual: 8 },
      { pool_id: 'p-foco', atual: 6 },
    ])
  })
})
