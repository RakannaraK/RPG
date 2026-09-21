// Aceitação da Fase 33 (parte pura). A interface foi clicada no navegador com o
// banco simulado: criar forma, transformar (a ficha grava forma_ativa_id),
// voltar ao normal, e a árvore — clique em disponível aprende, clique em
// bloqueada só mostra o motivo.
import { describe, it, expect } from 'vitest'
import { fichaValendo, rotuloDaForma, planejarTransformacao, formasDaFicha, ehFichaDeJogador } from './transformacao'
import { montarArvore, resumoArvore } from './arvoreHabilidades'

describe('Fase 33 — aceitação', () => {
  // Aria com a forma Lobo (vinda de uma criatura do bestiário)
  const aria = { id: 'a', nome_personagem: 'Aria', tipo_ficha: 'personagem', hp_atual: 18, hp_maximo: 22, forma_ativa_id: null }
  const lobo = { id: 'l', nome_personagem: 'Lobo', tipo_ficha: 'forma', forma_de_id: 'a', origem_id: 'criatura-urso', hp_atual: 30, hp_maximo: 30, created_at: '2026-01-01' }

  it('transformar troca quem vale, e a vida que muda é a da forma', () => {
    expect(formasDaFicha([aria, lobo], 'a')).toHaveLength(1)
    expect(fichaValendo(aria, [aria, lobo]).id).toBe('a')

    const patch = planejarTransformacao(aria, 'l', [lobo])
    expect(patch).toEqual({ forma_ativa_id: 'l' })
    const transformada = { ...aria, ...patch }

    const valendo = fichaValendo(transformada, [transformada, lobo])
    expect(valendo.id).toBe('l')                     // é a vida do Lobo que o mestre tira
    expect(valendo.hp_maximo).toBe(30)
    expect(rotuloDaForma(transformada, [transformada, lobo])).toBe('Aria (Lobo)')
  })

  it('voltar ao normal devolve a ficha original intacta', () => {
    const transformada = { ...aria, forma_ativa_id: 'l' }
    const machucado = { ...lobo, hp_atual: 4 } // o Lobo levou pancada
    const voltou = { ...transformada, ...planejarTransformacao(transformada, 'l', [machucado]) }
    expect(voltou.forma_ativa_id).toBeNull()
    const valendo = fichaValendo(voltou, [voltou, machucado])
    expect(valendo.id).toBe('a')
    expect(valendo.hp_atual).toBe(18)   // Aria continua com a vida dela
    expect(machucado.hp_atual).toBe(4)  // e o estrago fica registrado na forma
  })

  it('a forma não entra na lista de personagens da mesa', () => {
    expect([aria, lobo].filter(ehFichaDeJogador).map(f => f.id)).toEqual(['a'])
  })

  it('árvore: Golpe Duplo exige Golpe Rápido — bloqueia, libera e aprende', () => {
    const habs = [
      { id: 'r', nome: 'Golpe Rápido', requer_habilidade_id: null },
      { id: 'd', nome: 'Golpe Duplo', requer_habilidade_id: 'r' },
    ]
    const semNada = montarArvore(habs, { conhecidasIds: [], contexto: { nivel: 1 } })
    expect(semNada.nos.get('d')).toMatchObject({ estado: 'bloqueada', motivo: 'Precisa de “Golpe Rápido”' })
    expect(resumoArvore(semNada)).toEqual({ conhecida: 0, disponivel: 1, bloqueada: 1 })

    const comRapido = montarArvore(habs, { conhecidasIds: ['r'], contexto: { nivel: 1 } })
    expect(comRapido.nos.get('d').estado).toBe('disponivel')

    const comAsDuas = montarArvore(habs, { conhecidasIds: ['r', 'd'], contexto: { nivel: 1 } })
    expect(resumoArvore(comAsDuas)).toEqual({ conhecida: 2, disponivel: 0, bloqueada: 0 })
  })
})
