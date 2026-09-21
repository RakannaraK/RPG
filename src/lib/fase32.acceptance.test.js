// Aceitação da Fase 32 (parte pura). O lado do banco — a RPC que baixa a
// recarga e sobe a carga, e quem pode chamá-la — foi testado no banco real
// (9/9, transação desfeita). A interface foi clicada no navegador com o banco
// simulado (defesa com habilidade, contra-ataque rolado, troca de reserva,
// veneno aplicado ao virar o turno).
import { describe, it, expect } from 'vitest'
import {
  estadoDaHabilidade, aoUsarHabilidade, ajustarCarga,
  efeitosDoTurno, textoEfeitoTurno, planejarTroca, emJogo,
} from './combateAvancado'
import { ordenarPorIniciativa } from './iniciativa'

// Mesma regra da RPC avancar_turno_ficha (quem grava é o banco):
// recarga desce 1 e some ao chegar a zero; carga sobe com teto.
const virarTurno = (hf, hab) => ({
  ...hf,
  recarga_restante: hf.recarga_restante == null ? null : (hf.recarga_restante <= 1 ? null : hf.recarga_restante - 1),
  carga_atual: hab.carga_max && hab.carga_por_rodada
    ? Math.min(hab.carga_max, (hf.carga_atual || 0) + hab.carga_por_rodada)
    : hf.carga_atual,
})

describe('Fase 32 — aceitação', () => {
  it('recarga 2: usar bloqueia, volta no segundo turno do dono', () => {
    const hab = { nome: 'Investida', recarga_turnos: 2 }
    let hf = { carga_atual: 0, recarga_restante: null }
    expect(estadoDaHabilidade(hf, hab).pronta).toBe(true)

    hf = { ...hf, ...aoUsarHabilidade(hf, hab) }
    expect(estadoDaHabilidade(hf, hab)).toMatchObject({ pronta: false, recargaRestante: 2 })

    hf = virarTurno(hf, hab) // 1º turno do dono
    expect(estadoDaHabilidade(hf, hab)).toMatchObject({ pronta: false, recargaRestante: 1 })

    hf = virarTurno(hf, hab) // 2º turno: pronta
    expect(estadoDaHabilidade(hf, hab).pronta).toBe(true)
  })

  it('ultimate carga 3 (+1/rodada): usa na 3ª rodada e usar zera', () => {
    const hab = { nome: 'Fúria Final', carga_max: 3, carga_por_rodada: 1 }
    let hf = { carga_atual: 0, recarga_restante: null }
    const prontas = []
    for (let rodada = 1; rodada <= 4; rodada++) {
      hf = virarTurno(hf, hab)
      prontas.push(estadoDaHabilidade(hf, hab).pronta)
    }
    expect(prontas).toEqual([false, false, true, true]) // cheia na 3ª rodada
    hf = { ...hf, ...aoUsarHabilidade(hf, hab) }
    expect(hf.carga_atual).toBe(0)
    expect(estadoDaHabilidade(hf, hab).motivo).toBe('Carga 0/3')
    // o mestre pode premiar carga na mão
    expect(ajustarCarga(hf, hab, +2)).toEqual({ carga_atual: 2 })
  })

  it('veneno de 1d4 por rodada vira dano no começo do turno do alvo', () => {
    const condicoes = [
      { id: 'c1', combatente_id: 'k1', nome: 'Veneno', efeito_turno: { tipo: 'dano', notacao: '1d4' } },
      { id: 'c2', combatente_id: 'k1', nome: 'Regeneração', efeito_turno: { tipo: 'cura', valor: 2 } },
      { id: 'c3', combatente_id: 'k2', nome: 'Atordoado' },
    ]
    const efeitos = efeitosDoTurno(condicoes, 'k1')
    expect(efeitos.map(e => [e.nome, e.tipo, e.notacao ?? e.valor])).toEqual([
      ['Veneno', 'dano', '1d4'], ['Regeneração', 'cura', 2],
    ])
    expect(textoEfeitoTurno(efeitos[0], 3)).toBe('Veneno: −3 de vida')
    expect(efeitosDoTurno(condicoes, 'k2')).toEqual([]) // condição sem efeito por rodada não faz nada
  })

  it('troca de reserva: o suplente assume o lugar na iniciativa', () => {
    const combatentes = [
      { id: 'a', nome: 'Aria', reserva: false, ordem: 0, iniciativa: 18, created_at: '2026-01-01' },
      { id: 'b', nome: 'Borin', reserva: false, ordem: 1, iniciativa: 12, created_at: '2026-01-02' },
      { id: 'c', nome: 'Caio', reserva: true, ordem: null, iniciativa: null, created_at: '2026-01-03' },
    ]
    expect(ordenarPorIniciativa(combatentes).map(c => c.nome)).toEqual(['Aria', 'Borin']) // reserva fora da ordem
    const { patches } = planejarTroca(combatentes, 'b', 'c')
    const depois = combatentes.map(c => ({ ...c, ...(patches.find(p => p.id === c.id) || {}) }))
    expect(ordenarPorIniciativa(depois).map(c => c.nome)).toEqual(['Aria', 'Caio'])
    expect(emJogo(depois).map(c => c.nome)).toEqual(['Aria', 'Caio'])
    expect(depois.find(c => c.id === 'c').iniciativa).toBe(12) // herdou o lugar
  })

  it('habilidade usada como reação entra em recarga na hora', () => {
    const hab = { nome: 'Escudo Arcano', recarga_turnos: 2 }
    const hf = { id: 'hf1', carga_atual: 0, recarga_restante: null, habilidade: hab }
    expect(aoUsarHabilidade(hf, hab)).toEqual({ recarga_restante: 2 })
    expect(estadoDaHabilidade({ ...hf, recarga_restante: 2 }, hab).pronta).toBe(false)
  })
})
