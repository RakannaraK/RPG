import { describe, it, expect } from 'vitest'
import { TABELAS_MESA, montarArquivoMesa, nomeArquivoMesa } from './exportMesa'

describe('F45 — exportar a mesa inteira', () => {
  it('monta o arquivo sem o código de convite nem o token do overlay', () => {
    const arq = montarArquivoMesa({
      mesa: { id: 'm', nome: 'A Torre', codigo_convite: 'ABC123', overlay_token: 'segredo' },
      fichas: [{ tipo: 'ficha' }],
      tabelas: { verbetes: [{ id: 'v' }] },
      exportadoEm: '2026-09-25T00:00:00.000Z',
    })
    expect(arq).toMatchObject({ formato: 'rpg-ficha', tipo: 'mesa', versao: 1, exportado_em: '2026-09-25T00:00:00.000Z' })
    expect(arq.mesa).toEqual({ id: 'm', nome: 'A Torre' })
    expect(JSON.stringify(arq)).not.toMatch(/ABC123|segredo/)
    expect(arq.verbetes).toEqual([{ id: 'v' }])
    // toda tabela aparece, mesmo vazia (quem lê o arquivo não precisa adivinhar)
    for (const t of TABELAS_MESA) expect(Array.isArray(arq[t])).toBe(true)
    expect(arq.fichas).toHaveLength(1)
  })

  it('nome do arquivo', () => {
    expect(nomeArquivoMesa('A Torre de Vex!')).toBe('a_torre_de_vex.mesa.json')
    expect(nomeArquivoMesa('')).toBe('mesa.mesa.json')
  })
})
