import { describe, it, expect } from 'vitest'
import {
  TIPOS_PUBLICACAO, normalizarEtiquetas, validarPublicacao, filtrarVitrine,
  etiquetasPopulares, ordenarVitrine, textoCurtidas, nomeDoTipo, iconeDoTipo,
} from './comunidade'

const fichaArquivo = { formato: 'rpg-ficha', tipo: 'ficha', versao: 1, ficha: { nome_personagem: 'Aria' }, filhos: {} }

describe('etiquetas', () => {
  it('separa, limpa, tira repetidas e limita a 8', () => {
    expect(normalizarEtiquetas('Fantasia, baixo nível ,fantasia,, Terror')).toEqual(['fantasia', 'baixo nível', 'terror'])
    expect(normalizarEtiquetas('a,b,c,d,e,f,g,h,i,j')).toHaveLength(8)
    expect(normalizarEtiquetas('')).toEqual([])
    expect(normalizarEtiquetas(['Dragões'])).toEqual(['dragões'])
  })
})

describe('validar publicação', () => {
  it('aceita ficha exportada', () => {
    expect(validarPublicacao({ tipo: 'ficha', titulo: 'Aria, a Maga', conteudo: fichaArquivo })).toEqual({ ok: true })
  })
  it('recusa tipo, título curto e arquivo trocado', () => {
    expect(validarPublicacao({ tipo: 'outro', titulo: 'x' }).ok).toBe(false)
    expect(validarPublicacao({ tipo: 'ficha', titulo: 'a', conteudo: fichaArquivo }).erro).toMatch(/2 letras/)
    expect(validarPublicacao({ tipo: 'ficha', titulo: 'Sistema errado', conteudo: { atributos: [] } }).erro).toMatch(/ficha exportada/)
    expect(validarPublicacao({ tipo: 'sistema', titulo: 'Sistema', conteudo: { foo: 1 } }).erro).toMatch(/sistema exportado/)
  })
  it('arte precisa de imagem; ficha precisa de arquivo', () => {
    expect(validarPublicacao({ tipo: 'arte', titulo: 'Retrato' }).erro).toMatch(/imagem/)
    expect(validarPublicacao({ tipo: 'arte', titulo: 'Retrato', imagem_url: 'https://x/a.png' })).toEqual({ ok: true })
    expect(validarPublicacao({ tipo: 'criatura', titulo: 'Goblin' }).erro).toMatch(/arquivo exportado/)
  })
  it('recusa arquivo acima de 1 MB', () => {
    const grande = { formato: 'rpg-ficha', tipo: 'ficha', versao: 1, lixo: 'x'.repeat(1_100_000) }
    expect(validarPublicacao({ tipo: 'ficha', titulo: 'Gigante', conteudo: grande }).erro).toMatch(/limite é 1 MB/)
  })
})

describe('vitrine', () => {
  const vitrine = [
    { id: '1', tipo: 'criatura', titulo: 'Goblin', autor: 'tom', etiquetas: ['fantasia'], curtidas: 2, created_at: '2026-09-01T00:00:00Z' },
    { id: '2', tipo: 'ficha', titulo: 'Aria, a Maga', descricao: 'elfa estudiosa', autor: 'bia', etiquetas: ['fantasia', 'magia'], curtidas: 9, created_at: '2026-09-05T00:00:00Z' },
    { id: '3', tipo: 'arte', titulo: 'Retrato do Ogro', autor: 'tom', etiquetas: ['arte'], curtidas: 0, created_at: '2026-09-10T00:00:00Z' },
  ]
  it('filtra por tipo, etiqueta e busca livre', () => {
    expect(filtrarVitrine(vitrine, { tipo: 'arte' }).map(p => p.id)).toEqual(['3'])
    expect(filtrarVitrine(vitrine, { etiqueta: 'fantasia' }).map(p => p.id)).toEqual(['1', '2'])
    expect(filtrarVitrine(vitrine, { busca: 'ELFA' }).map(p => p.id)).toEqual(['2'])
    expect(filtrarVitrine(vitrine, { busca: 'tom' }).map(p => p.id)).toEqual(['1', '3'])
    expect(filtrarVitrine(vitrine, {})).toHaveLength(3)
  })
  it('etiquetas populares em ordem de uso', () => {
    expect(etiquetasPopulares(vitrine)).toEqual([
      { etiqueta: 'fantasia', usos: 2 }, { etiqueta: 'arte', usos: 1 }, { etiqueta: 'magia', usos: 1 },
    ])
  })
  it('ordena por recentes ou por curtidas', () => {
    expect(ordenarVitrine(vitrine).map(p => p.id)).toEqual(['3', '2', '1'])
    expect(ordenarVitrine(vitrine, 'curtidas').map(p => p.id)).toEqual(['2', '1', '3'])
  })
  it('rótulos', () => {
    expect(textoCurtidas(1)).toBe('1 curtida')
    expect(textoCurtidas(0)).toBe('0 curtidas')
    expect(nomeDoTipo('criatura')).toBe('Criatura')
    expect(iconeDoTipo('arte')).toBe('🎨')
    expect(TIPOS_PUBLICACAO).toHaveLength(4)
  })
})
