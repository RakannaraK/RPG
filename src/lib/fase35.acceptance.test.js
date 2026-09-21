// Aceitação da Fase 35 (parte pura). A interface foi conferida no navegador:
// trocar o tema muda o acento no site todo (inclusive nas telas antigas) e fica
// salvo; "leitura fácil" aumenta o espaçamento; a barra de vida mostra o pedaço
// de escudo; habilidade com som ganha o botão de ouvir.
import { describe, it, expect } from 'vitest'
import { TEMAS, atributosDeAparencia, validarSom, midiaEhSom, LIMITE_SOM } from './personalizacao'
import { faixasDaBarra, textoVida } from './barraVida'

describe('Fase 35 — aceitação', () => {
  it('trocar o tema marca o site e volta ao padrão sem marca', () => {
    expect(atributosDeAparencia({ tema: 'esmeralda', fonte: 'facil' })).toEqual({ 'data-tema': 'esmeralda', 'data-fonte': 'facil' })
    expect(atributosDeAparencia({ tema: 'violeta', fonte: 'padrao' })).toEqual({ 'data-tema': null, 'data-fonte': null })
    expect(TEMAS).toHaveLength(5)
  })

  it('áudio de 3 s entra; de 30 s é recusado com o motivo', () => {
    const arquivo = { type: 'audio/mpeg', size: 400_000, name: 'critico.mp3' }
    expect(validarSom(arquivo, 3)).toEqual({ ok: true })
    const longo = validarSom(arquivo, 30)
    expect(longo.ok).toBe(false)
    expect(longo.erro).toContain(`${LIMITE_SOM.segundos} s`)
  })

  it('mídia da habilidade: som toca, imagem aparece', () => {
    expect(midiaEhSom('https://x/uivo.mp3')).toBe(true)
    expect(midiaEhSom('https://x/arte.webp')).toBe(false)
  })

  it('barra de vida com 4 de escudo mostra o pedaço a mais', () => {
    const b = faixasDaBarra({ atual: 12, maximo: 20, temp: 4 })
    expect(b).toMatchObject({ pct: 60, pctTemp: 20, nivel: 'cheia' })
    expect(textoVida({ atual: 12, maximo: 20, temp: 4 })).toBe('12/20 (+4)')
  })

  it('barra de progressão (projeto/relógio) é a mesma conta, sem escudo', () => {
    expect(faixasDaBarra({ atual: 3, maximo: 8 })).toMatchObject({ pct: 37.5, pctTemp: 0 })
    expect(faixasDaBarra({ atual: 8, maximo: 8 }).pct).toBe(100)
  })
})
