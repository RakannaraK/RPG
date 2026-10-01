import { describe, it, expect } from 'vitest'
import { TEMPLATES_SISTEMA } from './templates'
import { desserializarSistema, montarPayloadImportacao } from './engines/systemSerializer'

describe('TEMPLATES_SISTEMA', () => {
  it('tem ao menos um modelo, todos com id/nome/dados válidos', () => {
    expect(TEMPLATES_SISTEMA.length).toBeGreaterThan(0)
    for (const t of TEMPLATES_SISTEMA) {
      expect(typeof t.id).toBe('string')
      expect(t.nome).toBeTruthy()
      expect(t.dados?.sistema?.nome).toBeTruthy()
    }
  })

  it('cada modelo passa pelo pipeline de import e gera payload com ids remapeados', () => {
    const SID = '00000000-0000-4000-8000-0000000000aa'
    for (const t of TEMPLATES_SISTEMA) {
      const grafo = desserializarSistema(t.dados)
      const payload = montarPayloadImportacao(grafo, SID)
      expect(payload.sistema.id).toBe(SID)
      expect(payload.sistema.nome).toBe(t.dados.sistema.nome)
      const idsModelo = new Set((t.dados.atributos || []).map(a => a.id))
      for (const a of payload.atributos) {
        expect(a.sistema_id).toBe(SID)
        expect(idsModelo.has(a.id)).toBe(false)
        // o banco exige regra_rolagem NOT NULL — o modelo "Atributos & d20" quebrava aqui
        expect(a.regra_rolagem?.tipo).toBeTruthy()
      }
    }
  })
})

describe('importação sem regra de rolagem', () => {
  it('atributo sem regra entra com valor fixo 0 (o banco não aceita vazio)', () => {
    const payload = montarPayloadImportacao({ sistema: { nome: 'X' }, atributos: [{ id: 'a', nome: 'Força', regra_rolagem: null }, { id: 'b', nome: 'Agilidade' }] }, 'sid')
    expect(payload.atributos.map(a => a.regra_rolagem)).toEqual([{ tipo: 'fixo', valor: 0 }, { tipo: 'fixo', valor: 0 }])
  })
  it('regra existente fica como está', () => {
    const regra = { tipo: 'dados', quantidade: 3, lados: 6 }
    const payload = montarPayloadImportacao({ sistema: { nome: 'X' }, atributos: [{ id: 'a', nome: 'Força', regra_rolagem: regra }] }, 'sid')
    expect(payload.atributos[0].regra_rolagem).toEqual(regra)
  })
})
