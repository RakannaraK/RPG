import { describe, it, expect } from 'vitest'
import { serializarSistema, desserializarSistema, VERSAO_FORMATO } from './systemSerializer'

// Gerador determinístico para asserção exata dos ids novos.
function gerador() {
  let n = 0
  return () => `NOVO-${++n}`
}

// uuids de teste (formato válido 8-4-4-4-12)
const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const P = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const POOL = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const CLASSE = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
const LINHA = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
const R = '99999999-9999-4999-8999-999999999999'

describe('serializarSistema', () => {
  it('remove campos de ambiente e mantém id/nome/config; marca a versão', () => {
    const grafo = {
      sistema: { id: 'ffffffff-ffff-4fff-8fff-ffffffffffff', mesa_id: 'mesa-x', criador_id: 'user-x', nome: 'Meu Sistema', descricao: 'd', config_layout: { a: 1 } },
      atributos: [{ id: A, sistema_id: 'ffffffff-ffff-4fff-8fff-ffffffffffff', created_at: 't', nome: 'Força' }],
    }
    const out = serializarSistema(grafo)
    expect(out.versao).toBe(VERSAO_FORMATO)
    expect(out.sistema).toEqual({ nome: 'Meu Sistema', descricao: 'd', config_layout: { a: 1 } })
    expect(out.sistema.id).toBeUndefined()
    expect(out.atributos[0]).toEqual({ id: A, nome: 'Força' })
    expect(out.atributos[0].sistema_id).toBeUndefined()
    expect(out.atributos[0].created_at).toBeUndefined()
  })
})

describe('desserializarSistema — remap de referências entre linhas', () => {
  it('gera ids novos e mantém a referência perícia→atributo consistente', () => {
    const json = {
      sistema: { nome: 'S', config_layout: {} },
      atributos: [{ id: A, nome: 'Força' }],
      pericias: [{ id: P, nome: 'Luta', atributo_base_id: A }],
    }
    const r = desserializarSistema(json, gerador())
    expect(r.atributos[0].id).toBe('NOVO-1')
    expect(r.pericias[0].id).toBe('NOVO-2')
    expect(r.pericias[0].atributo_base_id).toBe(r.atributos[0].id)
    expect(r.pericias[0].atributo_base_id).not.toBe(A)
  })

  it('remapeia ids dentro de arrays (linhas_nativas de raça)', () => {
    const json = {
      sistema: { nome: 'S', config_layout: {} },
      racas: [{ id: R, nome: 'Humano', linhas_nativas: [LINHA] }],
      linhas_poder: [{ id: LINHA, nome: 'Dominação' }],
    }
    const r = desserializarSistema(json, gerador())
    expect(r.racas[0].linhas_nativas[0]).toBe(r.linhas_poder[0].id)
    expect(r.racas[0].linhas_nativas[0]).not.toBe(LINHA)
  })
})

describe('desserializarSistema — remap de ids aninhados', () => {
  it('regenera o id de modificadores dentro de raça e mantém as refs (pai e alvo)', () => {
    const MOD = '55555555-5555-4555-8555-555555555555'
    const json = {
      sistema: { nome: 'S', config_layout: {} },
      atributos: [{ id: A, nome: 'Força' }],
      racas: [{ id: R, nome: 'Humano', modificadores: [{ id: MOD, raca_id: R, alvo: A, valor: 2 }] }],
    }
    const r = desserializarSistema(json, gerador())
    const mod = r.racas[0].modificadores[0]
    expect(mod.id).not.toBe(MOD)
    expect(mod.raca_id).toBe(r.racas[0].id)
    expect(mod.alvo).toBe(r.atributos[0].id)
  })
})

describe('desserializarSistema — remap dentro do config_layout', () => {
  it('remapeia id embutido como VALOR (pool_id em resolucao.rerolagem)', () => {
    const json = {
      sistema: { nome: 'S', config_layout: { resolucao: { rerolagem: { pool_id: POOL } } } },
      pools: [{ id: POOL, nome: 'Sangue' }],
    }
    const r = desserializarSistema(json, gerador())
    expect(r.sistema.config_layout.resolucao.rerolagem.pool_id).toBe(r.pools[0].id)
    expect(r.sistema.config_layout.resolucao.rerolagem.pool_id).not.toBe(POOL)
  })

  it('remapeia id embutido como CHAVE de objeto (slots.grades por classe_id)', () => {
    const json = {
      sistema: { nome: 'S', config_layout: { slots: { grades: { [CLASSE]: { '1': [2] } } } } },
      classes: [{ id: CLASSE, nome: 'Mago' }],
    }
    const r = desserializarSistema(json, gerador())
    const chaves = Object.keys(r.sistema.config_layout.slots.grades)
    expect(chaves).toEqual([r.classes[0].id])
    expect(chaves).not.toContain(CLASSE)
    expect(r.sistema.config_layout.slots.grades[r.classes[0].id]).toEqual({ '1': [2] })
  })

  it('não toca em strings que não são uuid (nomes, fórmulas)', () => {
    const json = {
      sistema: { nome: 'S', config_layout: { formula_modificador: 'floor((_x-10)/2)' } },
      atributos: [{ id: A, nome: 'Força' }],
    }
    const r = desserializarSistema(json, gerador())
    expect(r.atributos[0].nome).toBe('Força')
    expect(r.sistema.config_layout.formula_modificador).toBe('floor((_x-10)/2)')
  })
})

describe('round-trip serializar → desserializar', () => {
  it('preserva estrutura e reescreve todos os ids de forma consistente', () => {
    const grafo = {
      sistema: { id: 'ffffffff-ffff-4fff-8fff-ffffffffffff', mesa_id: 'm', nome: 'S', descricao: null, config_layout: { slots: { grades: { [CLASSE]: {} } } } },
      atributos: [{ id: A, nome: 'Força' }],
      classes: [{ id: CLASSE, nome: 'Mago' }],
      habilidades: [{ id: '77777777-7777-4777-8777-777777777777', nome: 'Bola de fogo', classe_id: CLASSE }],
    }
    const json = serializarSistema(grafo)
    const r = desserializarSistema(json, gerador())
    expect(r.atributos).toHaveLength(1)
    expect(r.classes).toHaveLength(1)
    expect(r.habilidades).toHaveLength(1)
    expect(r.habilidades[0].classe_id).toBe(r.classes[0].id)
    expect(Object.keys(r.sistema.config_layout.slots.grades)).toEqual([r.classes[0].id])
    expect(r.classes[0].id).not.toBe(CLASSE)
  })
})
