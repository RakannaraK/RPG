/**
 * Fase 26 — teste de aceitação (docs/FASE26_MESA_VIRTUAL.md), na camada pura.
 * RLS (quem vê/move/desenha) foi verificado no banco real em transação desfeita;
 * a interface, em página de teste no navegador. Aqui fica o que é contrato.
 */
import { describe, it, expect } from 'vitest'
import {
  adicionarOpNevoa, encaixar, espalhar, medir, normalizarGrade, normalizarNevoa, normalizarRet, tokenVisivelParaJogador,
} from './mapaEngine'
import { ordenarPorIniciativa } from './iniciativa'
import { caminhoNoBucket } from './imageUtils'

// Cena de 30×20 quadrados de 70 px, régua 5-10-5 em metros
const LARGURA = 2100
const ALTURA = 1400
const grade = normalizarGrade({ tamanho: 70, diagonal: 'alternada', unidade: 1.5, unidade_nome: 'm' })
const centro = { x: LARGURA / 2, y: ALTURA / 2 }

describe('Fase 26 — aceitação', () => {
  it('2 fichas + 3 inimigos nascem em casas distintas, encaixadas, dentro do mapa', () => {
    const fichas = espalhar(centro, 2, grade, LARGURA, ALTURA)
    const inimigos = espalhar(centro, 3, grade, LARGURA, ALTURA, 1, fichas)
    const todos = [...fichas, ...inimigos]
    expect(new Set(todos.map(p => `${p.x},${p.y}`)).size).toBe(5)
    for (const p of todos) {
      expect(encaixar(p, grade, 1)).toEqual(p)
      expect(p.x).toBeGreaterThanOrEqual(0)
      expect(p.x).toBeLessThanOrEqual(LARGURA)
      expect(p.y).toBeGreaterThanOrEqual(0)
      expect(p.y).toBeLessThanOrEqual(ALTURA)
    }
  })

  it('soltar um token arrastado cai no centro da célula', () => {
    expect(encaixar({ x: 1000, y: 612 }, grade, 1)).toEqual({ x: 1015, y: 595 })
  })

  it('régua: "3 quadrados · 4,5 m" em linha reta; 5-10-5 na diagonal', () => {
    const a = { x: 35, y: 35 }
    expect(medir(a, { x: 35 + 210, y: 35 }, grade).rotulo).toBe('3 quadrados · 4,5 m')
    // 3 diagonais em 5-10-5 = 1 + 2 + 1 = 4 quadrados = 6 m
    expect(medir(a, { x: 35 + 210, y: 35 + 210 }, grade).rotulo).toBe('4 quadrados · 6 m')
  })

  it('destaque segue o turno pela ordem de iniciativa', () => {
    const combatentes = [
      { id: 'g', nome: 'Goblin', iniciativa: 8, ordem: 0, created_at: '2026-01-01T00:00:00Z' },
      { id: 'a', nome: 'Aria', iniciativa: 17, ordem: 0, created_at: '2026-01-01T00:00:01Z' },
      { id: 'b', nome: 'Borin', iniciativa: 12, ordem: 0, created_at: '2026-01-01T00:00:02Z' },
    ]
    const ordem = ordenarPorIniciativa(combatentes).map(c => c.nome)
    expect(ordem).toEqual(['Aria', 'Borin', 'Goblin'])
  })

  it('névoa revelada por retângulo e pincel esconde o resto do jogador', () => {
    let nevoa = normalizarNevoa({ ativa: true })
    nevoa = adicionarOpNevoa(nevoa, { modo: 'revelar', forma: 'ret', ...normalizarRet({ x: 700, y: 400 }, { x: 400, y: 200 }) })
    nevoa = adicionarOpNevoa(nevoa, { modo: 'revelar', forma: 'traco', raio: 70, pontos: [[1200, 900], [1600, 1000]] })

    const noRetangulo = { x: 500, y: 300, oculto: false, meu: false }
    const noPincel = { x: 1505, y: 945, oculto: false, meu: false }
    const naNevoa = { x: 1900, y: 200, oculto: false, meu: false }
    const ocultoNoRevelado = { x: 505, y: 305, oculto: true, meu: false }
    const meuNaNevoa = { x: 1900, y: 1300, oculto: false, meu: true }

    expect(tokenVisivelParaJogador(noRetangulo, nevoa)).toBe(true)
    expect(tokenVisivelParaJogador(noPincel, nevoa)).toBe(true)
    expect(tokenVisivelParaJogador(naNevoa, nevoa)).toBe(false)
    expect(tokenVisivelParaJogador(ocultoNoRevelado, nevoa)).toBe(false)
    expect(tokenVisivelParaJogador(meuNaNevoa, nevoa)).toBe(true)

    // Cobrir tudo esconde até o que estava revelado (menos o próprio)
    const coberta = adicionarOpNevoa(nevoa, { modo: 'cobrir', forma: 'tudo' })
    expect(tokenVisivelParaJogador(noRetangulo, coberta)).toBe(false)
    expect(tokenVisivelParaJogador(meuNaNevoa, coberta)).toBe(true)

    // Névoa desligada: tudo que não é oculto aparece
    const desligada = { ...nevoa, ativa: false }
    expect(tokenVisivelParaJogador(naNevoa, desligada)).toBe(true)
    expect(tokenVisivelParaJogador(ocultoNoRevelado, desligada)).toBe(false)
  })

  it('arquivo de token avulso é achado no bucket para ser apagado junto', () => {
    const url = 'https://xyz.supabase.co/storage/v1/object/public/fichas-imagens/u1/tokens/m1/171.jpg'
    expect(caminhoNoBucket(url)).toBe('u1/tokens/m1/171.jpg')
    expect(caminhoNoBucket('https://outro.site/imagem.png')).toBeNull()
    expect(caminhoNoBucket('não é url')).toBeNull()
  })
})
