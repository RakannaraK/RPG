import { describe, it, expect } from 'vitest'
import {
  TEMAS, FONTES, LIMITE_SOM, ehTemaValido, ehFonteValida,
  atributosDeAparencia, validarSom, extensaoDoSom, midiaEhSom,
  particulasLigadas, reduzMovimento,
} from './personalizacao'

describe('temas e fontes', () => {
  it('as listas têm ids únicos e o padrão primeiro', () => {
    expect(TEMAS[0].id).toBe('violeta')
    expect(FONTES[0].id).toBe('padrao')
    expect(new Set(TEMAS.map(t => t.id)).size).toBe(TEMAS.length)
    expect(ehTemaValido('gelo')).toBe(true)
    expect(ehTemaValido('rosa-choque')).toBe(false)
    expect(ehFonteValida('facil')).toBe(true)
  })
  it('atributos do <html>: padrão não marca nada', () => {
    expect(atributosDeAparencia({ tema: 'violeta', fonte: 'padrao' })).toMatchObject({ 'data-tema': null, 'data-fonte': null })
    expect(atributosDeAparencia({ tema: 'carmim', fonte: 'mono' })).toMatchObject({ 'data-tema': 'carmim', 'data-fonte': 'mono' })
    expect(atributosDeAparencia({ tema: 'inventado' })).toMatchObject({ 'data-tema': null, 'data-fonte': null })
    expect(atributosDeAparencia()).toMatchObject({ 'data-tema': null, 'data-fonte': null })
  })
})

describe('validar som enviado', () => {
  const som = (size, type = 'audio/mpeg', name = 'critico.mp3') => ({ size, type, name })
  it('aceita áudio curto e pequeno', () => {
    expect(validarSom(som(200_000), 3)).toEqual({ ok: true })
  })
  it('recusa o que não é áudio', () => {
    expect(validarSom({ size: 1000, type: 'image/png', name: 'a.png' })).toMatchObject({ ok: false })
    expect(validarSom(null).erro).toMatch(/Escolha um arquivo/)
  })
  it('recusa arquivo grande com o tamanho no aviso', () => {
    const r = validarSom(som(3_000_000), 2)
    expect(r.ok).toBe(false)
    expect(r.erro).toMatch(/3\.0 MB/)
    expect(r.erro).toMatch(/1\.5 MB/)
  })
  it('recusa som longo e aceita no limite', () => {
    expect(validarSom(som(300_000), 30).erro).toMatch(new RegExp(`${LIMITE_SOM.segundos} s`))
    expect(validarSom(som(300_000), 15)).toEqual({ ok: true })
    expect(validarSom(som(300_000), null)).toEqual({ ok: true }) // duração desconhecida não bloqueia
  })
})

describe('arquivo e mídia', () => {
  it('extensão vem do nome, do tipo ou cai no mp3', () => {
    expect(extensaoDoSom({ name: 'uivo.OGG', type: 'audio/ogg' })).toBe('ogg')
    expect(extensaoDoSom({ name: 'sem-extensao', type: 'audio/wav' })).toBe('wav')
    expect(extensaoDoSom({})).toBe('mp3')
  })
  it('reconhece mídia de som e de imagem', () => {
    expect(midiaEhSom('https://x/y/uivo.mp3')).toBe(true)
    expect(midiaEhSom('https://x/y/uivo.ogg?token=1')).toBe(true)
    expect(midiaEhSom('https://x/y/arte.png')).toBe(false)
    expect(midiaEhSom(null)).toBe(false)
  })
})

describe('F52 — aparência, movimento e efeitos', () => {
  it('padrões não marcam o <html>; escolhas marcam', () => {
    expect(Object.values(atributosDeAparencia({})).every(v => v === null)).toBe(true)
    expect(atributosDeAparencia({
      animacoes: 'reduzidas', efeitos: 'sutis', tamanho_texto: 'grande', alto_contraste: true,
    })).toMatchObject({ 'data-animacoes': 'reduzidas', 'data-efeitos': 'sutis', 'data-tamanho': 'grande', 'data-contraste': 'alto' })
    expect(atributosDeAparencia({ animacoes: 'loucura', efeitos: 'x' })).toMatchObject({ 'data-animacoes': null, 'data-efeitos': null })
  })

  it('o sistema pedir menos movimento vale mesmo com animações completas', () => {
    expect(reduzMovimento('completas', false)).toBe(false)
    expect(reduzMovimento(undefined, false)).toBe(false)
    expect(reduzMovimento('completas', true)).toBe(true)
    expect(reduzMovimento('reduzidas', false)).toBe(true)
  })

  it('partículas só com efeitos completos e sem movimento reduzido', () => {
    expect(particulasLigadas(undefined, false)).toBe(true)
    expect(particulasLigadas('completos', true)).toBe(false)
    expect(particulasLigadas('sutis', false)).toBe(false)
  })

  it('todo tema tem partícula e descrição de energia', () => {
    for (const t of TEMAS) expect(t.particula && t.energia).toBeTruthy()
  })
})
