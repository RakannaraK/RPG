// F57–F60 — aceitação "Arena de fogo": só módulos puros, do pacote à luz e ao efeito de ação.
import { describe, it, expect } from 'vitest'
import { conteudoInstalado, instalar, validarPacote } from './extensoes'
import { aplicarCena, colocarNoMapa, normalizarAtmosfera, volumesDaAtmosfera, adicionarFonte, ehLocal } from './atmosfera'
import { fontesDeLuz } from './luzMapa'
import { resolverVfx } from './vfx'
import { LIMITES } from './efeitosVocabulario'

const grade = { tamanho: 70, unidade: 1.5 }

describe('Arena de fogo (F57–F60)', () => {
  const extensoes = instalar([], 'inferno')
  const { cenas, efeitos } = conteudoInstalado(extensoes)
  const arena = cenas.find(c => c.nome === 'Arena de fogo')

  it('o Inferno instalado traz a cena e os efeitos', () => {
    expect(arena).toBeTruthy()
    expect(efeitos.some(e => e.pacote === 'Inferno')).toBe(true)
  })

  // fogueira local (2 quadrados) + uma fonte de luz fixa
  const antes = adicionarFonte(
    colocarNoMapa(normalizarAtmosfera(null), { oQue: 'efeito', tipo: 'fogo' }, { x: 100, y: 100 }, grade.unidade),
    { x: 400, y: 400, raio: 4, cor: '#FFC27A', tremula: false },
  )
  const depois = aplicarCena(antes, arena)

  it('aplicarCena mantém o que é do mapa e põe fogo e brasas de cena inteira', () => {
    expect(depois.efeitos.filter(ehLocal)).toHaveLength(1)
    expect(depois.luz.fontes).toHaveLength(1)
    const cenaInteira = depois.efeitos.filter(e => !ehLocal(e)).map(e => e.tipo).sort()
    expect(cenaInteira).toEqual(['brasas', 'fogo'])
    expect(depois.luz.escuridao).toBe(0.35)
    expect(depois.luz.cor).toBe('#2A0505')
  })

  it('o som do fogo existe e some com som: false', () => {
    expect(volumesDaAtmosfera(depois).fogo).toBeGreaterThan(0)
    expect(volumesDaAtmosfera({ ...depois, som: false })).toEqual({})
  })

  it('fontesDeLuz junta fonte fixa, fogueira local e token com Tocha', () => {
    const tokens = [{ id: 't1', x: 200, y: 200, luz: { raio: 6, cor: '#FFB25E', tremula: true } }, { id: 't2', x: 5, y: 5, luz: null }]
    const fontes = fontesDeLuz({ atmosfera: depois, tokens, grade })
    expect(fontes.map(f => f.id.split('-')[0]).sort()).toEqual(['efeito', 'fonte', 'token'])
  })

  it('resolverVfx: atacante para dois alvos, um sem token, devolve um alvo', () => {
    const tokens = [
      { combatente_id: 'atq', ficha_id: null, x: 50, y: 50 },
      { combatente_id: 'alvo1', ficha_id: null, x: 300, y: 320 },
    ]
    const r = resolverVfx(
      { efeitoId: efeitos.find(e => e.nome === 'Chama infernal').id, de: { comb: 'atq', ficha: null }, para: [{ comb: 'alvo1', ficha: null }, { comb: 'sem-token', ficha: null }] },
      { tokens, efeitos, grade },
    )
    expect(r.para).toHaveLength(1)
    expect(r.para[0]).toMatchObject({ x: 300, y: 320, de: { x: 50, y: 50 } })
  })

  it('pacote importado hostil sai limpo', () => {
    const base = { formato: 'dado-e-pena/extensao', versao: 1, id: 'hostil', nome: 'x'.repeat(5000) }
    const sujo = validarPacote({
      ...base,
      cenas: [
        { id: 'c1', nome: 'Boa', atmosfera: { efeitos: [{ tipo: 'meteoro', intensidade: 1 }, { tipo: 'fogo', intensidade: 9, cor: 'javascript:alert(1)' }] } },
      ],
      efeitos: [{ id: 'e1', nome: 'y'.repeat(5000), forma: 'projetil', cores: ['javascript:alert(1)', 'red'], som: 'hack' }],
    })
    expect(sujo.ok).toBe(true)
    expect(sujo.pacote.nome.length).toBeLessThanOrEqual(LIMITES.texto)
    expect(sujo.pacote.cenas[0].atmosfera.efeitos).toEqual([{ tipo: 'fogo', intensidade: 1, cor: null }])
    expect(sujo.pacote.efeitos[0]).toMatchObject({ cores: ['#FFFFFF', '#FFFFFF'], som: null })
    expect(sujo.pacote.efeitos[0].nome.length).toBeLessThanOrEqual(LIMITES.texto)
    expect(JSON.stringify(sujo)).not.toContain('javascript:')

    // 500 efeitos: o arquivo inteiro passa do limite de tamanho e é recusado
    const enorme = validarPacote({ ...base, cenas: [], efeitos: Array.from({ length: 500 }, (_, i) => ({ id: `e${i}`, nome: 'n', forma: 'onda', cores: ['#FFFFFF', '#000000'] })) })
    expect(enorme.ok).toBe(false)
  })
})
