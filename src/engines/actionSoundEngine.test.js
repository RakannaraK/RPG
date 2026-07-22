import { describe, it, expect } from 'vitest'
import { resolveActionSound, PRESET_IDS } from './actionSoundEngine'

describe('PRESET_IDS', () => {
  it('cataloga os 10 presets genéricos', () => {
    expect(PRESET_IDS).toEqual([
      'lamina', 'impacto', 'disparo', 'projetil', 'arcano',
      'cura', 'escudo', 'critico', 'falha', 'neutro',
    ])
  })
})

describe('resolveActionSound', () => {
  it('regra 5: sistema sem bloco sons retorna sempre null (retrocompat)', () => {
    const evento = { tipo: 'ataque', origemId: 'espada-1' }
    expect(resolveActionSound(evento, null)).toBeNull()
    expect(resolveActionSound(evento, undefined)).toBeNull()
  })

  it('regra 2/3: mapeamento específico da origem tem prioridade sobre o padrão do tipo', () => {
    const configSom = {
      mapa: { 'espada-1': 'lamina' },
      padroes: { ataque: 'impacto' },
    }
    const evento = { tipo: 'ataque', origemId: 'espada-1' }
    expect(resolveActionSound(evento, configSom)).toEqual({ presetId: 'lamina', intensity: 1, layer: null })
  })

  it('regra 3: sem mapeamento de origem, cai para o padrão do tipo', () => {
    const configSom = {
      mapa: { 'outra-arma': 'impacto' },
      padroes: { ataque: 'disparo' },
    }
    const evento = { tipo: 'ataque', origemId: 'espada-1' }
    expect(resolveActionSound(evento, configSom)).toEqual({ presetId: 'disparo', intensity: 1, layer: null })
  })

  it('regra 3: sem mapeamento de origem nem padrão do tipo, retorna null (silêncio)', () => {
    const configSom = { mapa: {}, padroes: {} }
    const evento = { tipo: 'ataque', origemId: 'espada-1' }
    expect(resolveActionSound(evento, configSom)).toBeNull()
  })

  it('regra 4: crítico adiciona a camada, sem substituir o preset base', () => {
    const configSom = { mapa: { 'espada-1': 'lamina' }, padroes: {} }
    const evento = { tipo: 'ataque', origemId: 'espada-1', resultado: { critico: true } }
    expect(resolveActionSound(evento, configSom)).toEqual({ presetId: 'lamina', intensity: 1, layer: 'critico' })
  })

  it('regra 4: falha adiciona a camada, sem substituir o preset base', () => {
    const configSom = { mapa: { 'espada-1': 'lamina' }, padroes: {} }
    const evento = { tipo: 'ataque', origemId: 'espada-1', resultado: { falha: true } }
    expect(resolveActionSound(evento, configSom)).toEqual({ presetId: 'lamina', intensity: 1, layer: 'falha' })
  })

  it('crítico E falha simultâneos: crítico vence (prioridade fixa, sem ambiguidade)', () => {
    const configSom = { mapa: { 'espada-1': 'lamina' }, padroes: {} }
    const evento = { tipo: 'ataque', origemId: 'espada-1', resultado: { critico: true, falha: true } }
    expect(resolveActionSound(evento, configSom)).toEqual({ presetId: 'lamina', intensity: 1, layer: 'critico' })
  })

  it('sem evento retorna null', () => {
    expect(resolveActionSound(null, { mapa: {}, padroes: {} })).toBeNull()
  })

  it('evento com tipo sem padrão configurado e sem origem retorna null', () => {
    const configSom = { mapa: {}, padroes: { ataque: 'lamina' } }
    expect(resolveActionSound({ tipo: 'rolagem' }, configSom)).toBeNull()
  })
})
