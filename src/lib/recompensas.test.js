import { describe, it, expect } from 'vitest'
import { recompensasAoSubir, juntarRecompensas, contarPendentes } from './recompensas'

// Infinit Corridor: "criar uma habilidade própria" nos níveis 1, 5 e 9 (nível TOTAL)
const IC = [
  { id: 'r1', classe_id: null, nivel: 1, titulo: 'Criar uma habilidade própria' },
  { id: 'r5', classe_id: null, nivel: 5, titulo: 'Criar uma habilidade própria' },
  { id: 'r9', classe_id: null, nivel: 9, titulo: 'Criar uma habilidade própria' },
]

// Recompensas por CLASSE: disparam no nível daquela classe
const POR_CLASSE = [
  { id: 'b3', classe_id: 'cls-barbaro', nivel: 3, titulo: 'Caminho Primal' },
  { id: 'b5', classe_id: 'cls-barbaro', nivel: 5, titulo: 'Ataque Extra' },
  { id: 'p5', classe_id: 'cls-paladino', nivel: 5, titulo: 'Castigo Divino' },
]

describe('19.6 — recompensas destravadas ao subir', () => {
  it('recompensa do sistema dispara no nível TOTAL', () => {
    const r = recompensasAoSubir(IC, { classeId: 'cls-barbaro', nivelClasse: 2, nivelTotal: 5 })
    expect(r.map(x => x.id)).toEqual(['r5'])
  })
  it('recompensa de classe dispara no nível DAQUELA classe', () => {
    const r = recompensasAoSubir(POR_CLASSE, { classeId: 'cls-barbaro', nivelClasse: 5, nivelTotal: 9 })
    expect(r.map(x => x.id)).toEqual(['b5']) // não pega p5 (outra classe)
  })
  it('classe errada não dispara mesmo com o nível batendo', () => {
    const r = recompensasAoSubir(POR_CLASSE, { classeId: 'cls-paladino', nivelClasse: 3, nivelTotal: 3 })
    expect(r).toEqual([]) // b3 é do bárbaro
  })
  it('as duas fontes podem disparar no mesmo level-up', () => {
    const todas = [...IC, ...POR_CLASSE]
    const r = recompensasAoSubir(todas, { classeId: 'cls-barbaro', nivelClasse: 5, nivelTotal: 5 })
    expect(r.map(x => x.id).sort()).toEqual(['b5', 'r5'])
  })
  it('ficha sem classes só recebe as do sistema', () => {
    const r = recompensasAoSubir([...IC, ...POR_CLASSE], { classeId: null, nivelClasse: 0, nivelTotal: 9 })
    expect(r.map(x => x.id)).toEqual(['r9'])
  })
  it('nível sem recompensa → nada', () => {
    expect(recompensasAoSubir(IC, { nivelTotal: 4 })).toEqual([])
    expect(recompensasAoSubir(null, { nivelTotal: 1 })).toEqual([])
  })
})

describe('19.6 — checklist na ficha', () => {
  const naFicha = [
    { id: 'f9', recompensa_id: 'r9', concluida: false },
    { id: 'f1', recompensa_id: 'r1', concluida: true },
    { id: 'f5', recompensa_id: 'r5', concluida: false },
    { id: 'fx', recompensa_id: 'apagada', concluida: false }, // recompensa removida do sistema
  ]
  it('pendentes primeiro, depois por nível; ignora recompensa apagada', () => {
    const lista = juntarRecompensas(naFicha, IC)
    expect(lista.map(x => x.recompensa.id)).toEqual(['r5', 'r9', 'r1'])
  })
  it('conta as pendentes', () => {
    expect(contarPendentes(naFicha)).toBe(3)
    expect(contarPendentes([])).toBe(0)
  })
})
