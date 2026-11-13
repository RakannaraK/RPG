import { describe, it, expect } from 'vitest'
import { validarPacote, conteudoInstalado, instalar, desinstalar, exportarPacote, CATALOGO, PACOTE_ESSENCIAL } from './extensoes'
import { LIMITES } from './efeitosVocabulario'

const bom = () => ({
  formato: 'dado-e-pena/extensao', versao: 1, id: 'meu-pacote', nome: 'Meu', descricao: 'd', autor: 'a',
  cenas: [{ id: 'c1', nome: 'Cena', atmosfera: { efeitos: [{ tipo: 'chuva', intensidade: 5, cor: 'x' }], luz: { escuridao: 2, cor: '#123456' }, sons: ['vento', 'xx'] } }],
  efeitos: [{ id: 'e1', nome: 'Ef', forma: 'onda', cores: ['#ff0000'], som: 'nada' }],
})

describe('validarPacote', () => {
  it('aceita e normaliza', () => {
    const r = validarPacote(JSON.stringify(bom()))
    expect(r.ok).toBe(true)
    const c = r.pacote.cenas[0].atmosfera
    expect(c.efeitos[0]).toEqual({ tipo: 'chuva', intensidade: 1, cor: null })
    expect(c.luz.escuridao).toBe(0.95)
    expect(c.sons).toEqual(['vento'])
    expect(r.pacote.efeitos[0]).toMatchObject({ cores: ['#ff0000', '#FFFFFF'], som: null })
  })
  it('aceita objeto e recusa objeto grande demais', () => {
    expect(validarPacote(bom()).ok).toBe(true)
    expect(validarPacote({ ...bom(), descricao: 'x'.repeat(LIMITES.bytesPacote) }).ok).toBe(false)
  })
  it('objeto: o limite conta bytes, não caracteres', () => {
    const n = Math.ceil(LIMITES.bytesPacote / 2) - 100 // 'é' = 2 bytes
    const p = { ...bom(), descricao: 'é'.repeat(n) }
    const s = JSON.stringify(p)
    expect(s.length).toBeLessThan(LIMITES.bytesPacote)
    expect(new TextEncoder().encode(s).length).toBeGreaterThan(LIMITES.bytesPacote)
    expect(validarPacote(p).ok).toBe(false)
  })
  it('recusa formato/versão errados', () => {
    expect(validarPacote({ ...bom(), formato: 'x' }).ok).toBe(false)
    expect(validarPacote({ ...bom(), versao: 2 }).ok).toBe(false)
    expect(validarPacote('{ruim').ok).toBe(false)
  })
  it('recusa id inválido', () => expect(validarPacote({ ...bom(), id: 'Ruim Id' }).ok).toBe(false))
  it('recusa arquivo grande demais', () => expect(validarPacote(JSON.stringify({ ...bom(), descricao: 'x'.repeat(LIMITES.bytesPacote) })).ok).toBe(false))
  it('descarta item ruim com aviso', () => {
    const p = bom()
    p.cenas.push({ id: 'Ruim', nome: 'x' })
    p.efeitos.push({ id: 'e2', nome: 'z', forma: 'inexistente' })
    const r = validarPacote(p)
    expect(r.ok).toBe(true)
    expect(r.pacote.cenas).toHaveLength(1)
    expect(r.pacote.efeitos).toHaveLength(1)
    expect(r.erros).toHaveLength(2)
  })
  it('sem nada válido = não ok', () => expect(validarPacote({ ...bom(), cenas: [], efeitos: [{ id: 'x' }] }).ok).toBe(false))
  it('todo pacote do catálogo (e o essencial) passa', () => {
    for (const p of [PACOTE_ESSENCIAL, ...CATALOGO]) {
      const r = validarPacote(exportarPacote(p))
      expect(r.ok, p.id).toBe(true)
      expect(r.erros, p.id).toEqual([])
      expect(r.pacote.cenas).toHaveLength(p.cenas.length)
      expect(r.pacote.efeitos).toHaveLength(p.efeitos.length)
    }
  })
})

describe('instalar / conteudoInstalado', () => {
  it('essencial sempre presente', () => {
    const c = conteudoInstalado([])
    expect(c.pacotes).toHaveLength(1)
    expect(c.cenas.map(x => x.nome)).toContain('Noite')
  })
  it('instala, não duplica e desinstala', () => {
    let l = instalar([], 'inferno')
    l = instalar(l, 'inferno')
    expect(l).toEqual(['inferno'])
    expect(conteudoInstalado(l).cenas.find(c => c.id === 'arena-de-fogo').pacote).toBe('Inferno')
    expect(desinstalar(l, 'inferno')).toEqual([])
  })
  it('ignora id desconhecido e pacote inválido', () => {
    expect(instalar([], 'nao-existe')).toEqual([])
    expect(instalar([], { formato: 'x' })).toEqual([])
  })
  it('importado entra normalizado; id repetido fica o primeiro', () => {
    const l = instalar(['inferno'], bom())
    expect(l).toHaveLength(2)
    const c = conteudoInstalado([...l, { ...bom(), id: 'outro' }])
    expect(c.cenas.filter(x => x.id === 'c1')).toHaveLength(1)
    expect(c.cenas.find(x => x.id === 'c1').pacote).toBe('Meu')
  })
  it('respeita o limite de pacotes', () => {
    let l = []
    for (let i = 0; i < LIMITES.pacotes + 2; i++) l = instalar(l, { ...bom(), id: `p${i}` })
    expect(l).toHaveLength(LIMITES.pacotes)
  })
})
