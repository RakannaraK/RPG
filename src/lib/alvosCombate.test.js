import { describe, it, expect } from 'vitest'
import {
  podeAgirNoCombate, caInfo, defesaDoAlvo, vidaDoAlvo, calcularVida,
  alvosNaArea, resolverAcertos, planejarAplicacao,
} from './alvosCombate'

const card = { id: 'f1', ficha: { id: 'f1', dono_id: 'u1', editores: [], vida_temp_atual: 5 }, hpAtual: 10, hpMax: 20, combate: { ca: 14 },
  pools: [{ id: 'p1', nome: 'Esforço', tipo: 'pontos', atual: 3, maximo: 10 }] }
const porFicha = { f1: card }
const heroi = { id: 'c1', nome: 'Herói', ficha_id: 'f1' }
const zumbi = { id: 'c2', nome: 'Zumbi', ca: 12, hp_atual: 30, hp_maximo: 40 }

describe('podeAgirNoCombate', () => {
  it('gestor, responsável e dono podem; estranho não', () => {
    expect(podeAgirNoCombate(zumbi, { isGestor: true })).toBe(true)
    expect(podeAgirNoCombate({ ...zumbi, controlador_id: 'u9' }, { meuUserId: 'u9' })).toBe(true)
    expect(podeAgirNoCombate(heroi, { meuUserId: 'u1', cardsPorFicha: porFicha })).toBe(true)
    expect(podeAgirNoCombate(zumbi, { meuUserId: 'u1' })).toBe(false)
    expect(podeAgirNoCombate(zumbi, { meuUserId: undefined })).toBe(false) // coluna ausente = sem responsável
  })
  it('controles da linha ignoram o responsável (gravam direto, o RLS barra)', () => {
    const opts = { meuUserId: 'u9', contarResponsavel: false }
    expect(podeAgirNoCombate({ ...zumbi, controlador_id: 'u9' }, opts)).toBe(false)
    expect(podeAgirNoCombate(heroi, { ...opts, meuUserId: 'u1', cardsPorFicha: porFicha })).toBe(true)
  })
})

describe('defesaDoAlvo / caInfo', () => {
  it('soma condições à base; sem base = null', () => {
    const conds = [{ modificador_config: { tipo: 'combate', valor: -2 } }]
    expect(defesaDoAlvo(zumbi, { condicoes: conds })).toBe(10)
    expect(defesaDoAlvo(heroi, { cardsPorFicha: porFicha, campoCaId: 'ca' })).toBe(14)
    expect(defesaDoAlvo({ id: 'x', nome: 'X' }, {})).toBeNull()
    expect(defesaDoAlvo(heroi, { cardsPorFicha: porFicha, campoCaId: null, condicoes: conds })).toBeNull()
    expect(caInfo(zumbi, {}, null, conds)).toMatchObject({ base: 12, efetiva: 10, delta: -2 })
  })
})

describe('vidaDoAlvo / calcularVida', () => {
  it('ficha usa a forma ativa; inimigo usa o combatente', () => {
    const forma = { ...card, ficha: { ...card.ficha, id: 'forma1' } }
    expect(vidaDoAlvo(heroi, { f1: forma }).fichaId).toBe('forma1')
    expect(vidaDoAlvo(zumbi, {})).toEqual({ fichaId: null, hpAtual: 30, hpMax: 40, temp: 0 })
    expect(vidaDoAlvo(heroi, {})).toBeNull()
  })
  it('dano gasta temp antes; piso 0; cura limita no máximo', () => {
    expect(calcularVida({ hpAtual: 10, hpMax: 20, temp: 5 }, -8)).toEqual({ hp: 7, temp: 0 })
    expect(calcularVida({ hpAtual: 10, hpMax: 20, temp: 5 }, -3)).toEqual({ hp: 10, temp: 2 })
    expect(calcularVida({ hpAtual: 4, hpMax: 20, temp: 0 }, -99).hp).toBe(0)
    expect(calcularVida({ hpAtual: 18, hpMax: 20, temp: 0 }, 9).hp).toBe(20)
    expect(calcularVida({ hpAtual: 18, hpMax: 0, temp: 0 }, 9).hp).toBe(27)
  })
})

describe('alvosNaArea', () => {
  const grade = { tamanho: 70, unidade: 1.5 }
  const tokens = [
    { x: 100, y: 100, combatente_id: 'a' },
    { x: 240, y: 100, combatente_id: 'b' },   // 140 px = 3 m (borda: entra)
    { x: 400, y: 100, combatente_id: 'c' },   // fora
    { x: 110, y: 100, combatente_id: null, ficha_id: 'fx' }, // liga por ficha
    { x: 120, y: 100, combatente_id: 'r' },   // reserva
  ]
  const combatentes = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd', ficha_id: 'fx' }, { id: 'r', reserva: true }, { id: 'sem-token' }]
  it('raio na unidade da grade; fora e reserva ficam de fora', () => {
    expect(alvosNaArea({ centro: { x: 100, y: 100 }, raio: 3, tokens, combatentes, grade })).toEqual(['a', 'b', 'd'])
    expect(alvosNaArea({ centro: { x: 100, y: 100 }, raio: 1.4, tokens, combatentes, grade })).toEqual(['a', 'd'])
  })
})

describe('resolverAcertos', () => {
  const defesaDe = c => c.def ?? null
  it('empate acerta; sem ataque ou sem defesa, todos acertam', () => {
    const alvos = [{ id: 1, def: 15 }, { id: 2, def: 16 }, { id: 3 }]
    expect(resolverAcertos({ ataque: 15, alvos, defesaDe }).map(a => a.acertou)).toEqual([true, false, true])
    expect(resolverAcertos({ ataque: null, alvos, defesaDe }).every(a => a.acertou)).toBe(true)
  })
})

describe('planejarAplicacao', () => {
  it('quem errou não toma nada; com metade toma piso(valor/2)', () => {
    const alvos = [{ c: zumbi, acertou: true }, { c: { ...zumbi, id: 'c3', nome: 'Barata', hp_atual: 20 }, acertou: false }]
    const sem = planejarAplicacao({ alvos, valor: 25 })
    expect(sem.escritas).toHaveLength(1)
    expect(sem.linhas).toEqual(['Zumbi: −25 vida', 'Barata: errou'])
    const com = planejarAplicacao({ alvos, valor: 25, metadeAoErrar: true })
    expect(com.escritas[1].hp).toBe(8) // 20 − 12
    expect(com.linhas[1]).toBe('Barata: errou, −12 vida')
  })
  it('vida + pool: temp consumida, pool limitado a 0 e ao máximo', () => {
    const p = planejarAplicacao({ alvos: [{ c: heroi, acertou: true }], valor: 8, barras: { c1: ['vida', 'p1'] }, cardsPorFicha: porFicha })
    expect(p.escritas[0]).toEqual({ combatente_id: 'c1', ficha_id: 'f1', hp: 7, temp: 0 })
    expect(p.escritas[1].pools).toEqual([{ pool_id: 'p1', atual: 0 }])
    const c = planejarAplicacao({ alvos: [{ c: heroi, acertou: false }], valor: 50, modo: 'cura', barras: { c1: ['vida', 'p1'] }, cardsPorFicha: porFicha })
    expect(c.escritas[0].hp).toBe(20)
    expect(c.escritas[1].pools[0].atual).toBe(10)
  })
  it('só a barra marcada é afetada', () => {
    const p = planejarAplicacao({ alvos: [{ c: heroi, acertou: true }], valor: 2, barras: { c1: ['p1'] }, cardsPorFicha: porFicha })
    expect(p.escritas).toHaveLength(1)
    expect(p.escritas[0].pools[0].atual).toBe(1)
  })
})
