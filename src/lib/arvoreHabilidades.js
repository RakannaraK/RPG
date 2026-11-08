/**
 * Fase 33/54 — árvore de habilidades (puro). Cada habilidade pode exigir outras
 * (`requer_habilidades_ids` + o antigo `requer_habilidade_id`; modo 'todos' ou
 * 'qualquer'), um nível mínimo (F19.5) e custar pontos (`custo_pontos`). A árvore
 * sai em camadas (caminho mais longo até a raiz), com o estado de cada nó.
 * Colunas novas ausentes (banco sem a F54) = sem lista, sem custo, modo 'todos'.
 */

import { avaliarFormula } from './formulaEngine'
import { nivelDeReferencia } from './requisitos'

const ESTADOS = { conhecida: 'conhecida', disponivel: 'disponivel', bloqueada: 'bloqueada' }
export const ESTADOS_ARVORE = ESTADOS

const brutos = hab => [...new Set([...(hab.requer_habilidades_ids || []), hab.requer_habilidade_id].filter(Boolean))]

/** Pré-requisitos efetivos: lista + antigo, sem repetir, sem ids que não existem mais. */
export function prerequisitosDe(hab, idsExistentes) {
  const existe = idsExistentes instanceof Set ? idsExistentes : new Set(idsExistentes)
  return brutos(hab).filter(id => existe.has(id))
}

/** `alvo` é alcançável subindo pelos pré-requisitos a partir de `inicio`? (detecta ciclo) */
function sobeAte(inicio, alvo, porId) {
  const vistos = new Set()
  const pilha = [inicio]
  while (pilha.length) {
    const id = pilha.pop()
    if (id === alvo) return true
    if (vistos.has(id) || !porId.has(id)) continue
    vistos.add(id)
    pilha.push(...brutos(porId.get(id)))
  }
  return false
}

const lista = (nomes, sep) => nomes.map(n => `“${n}”`).join(` ${sep} `)

/**
 * @param habilidades lista do sistema [{ id, nome, requer_habilidade_id, requer_habilidades_ids, requer_modo, custo_pontos, nivel_minimo, classe_id, raca_id }]
 * @param opcoes { conhecidasIds: string[], contexto: { nivel, niveisPorClasse }, saldoPontos: number|null }
 * @returns {{ nos: Map, camadas: no[][], avisos: string[] }}
 *   no = { id, hab, paiId, paisIds, custo, profundidade, filhos: id[], estado, motivo }
 */
export function montarArvore(habilidades = [], { conhecidasIds = [], contexto = {}, saldoPontos = null } = {}) {
  const porId = new Map(habilidades.map(h => [h.id, h]))
  const conhecidas = new Set(conhecidasIds)
  const avisos = []

  const nos = new Map()
  for (const hab of habilidades) {
    // aresta inválida: pai apagado, ou que fecha círculo (o pai já depende de `hab`)
    const todos = brutos(hab)
    const paisIds = todos.filter(id => porId.has(id) && !sobeAte(id, hab.id, porId))
    if (paisIds.length < todos.length) {
      avisos.push(`“${hab.nome}” tem pré-requisito inválido (apagado ou em círculo) — ${paisIds.length ? 'ignorado' : 'virou raiz'}.`)
    }
    nos.set(hab.id, { id: hab.id, hab, paiId: paisIds[0] || null, paisIds, custo: Math.max(0, Number(hab.custo_pontos) || 0), profundidade: 0, filhos: [], estado: ESTADOS.bloqueada, motivo: null })
  }
  // grafo sem círculos: camada = 1 + maior camada dos pais
  const calcula = (no, d = 0) => {
    if (no.calculado || d > 100) return no.profundidade
    no.calculado = true
    no.profundidade = no.paisIds.length ? 1 + Math.max(...no.paisIds.map(p => calcula(nos.get(p), d + 1))) : 0
    return no.profundidade
  }
  for (const no of nos.values()) {
    for (const p of no.paisIds) nos.get(p).filhos.push(no.id)
    calcula(no)
  }
  for (const no of nos.values()) delete no.calculado

  // estado de cada nó para esta ficha
  for (const no of nos.values()) {
    const { hab } = no
    const nivelMin = hab.nivel_minimo == null ? null : Number(hab.nivel_minimo)
    const faltaNivel = nivelMin != null && (nivelDeReferencia(hab, contexto) ?? 0) < nivelMin
    const qualquer = hab.requer_modo === 'qualquer'
    const faltam = no.paisIds.filter(p => !conhecidas.has(p))
    const faltaPai = qualquer ? faltam.length === no.paisIds.length && faltam.length > 0 : faltam.length > 0
    const nome = id => nos.get(id).hab.nome
    if (conhecidas.has(no.id)) no.estado = ESTADOS.conhecida
    else if (faltaPai) { no.estado = ESTADOS.bloqueada; no.motivo = `Precisa de ${lista(faltam.map(nome), qualquer ? 'ou' : 'e')}` }
    else if (faltaNivel) { no.estado = ESTADOS.bloqueada; no.motivo = `Precisa de nível ${nivelMin}` }
    else if (saldoPontos !== null && no.custo > saldoPontos) { no.estado = ESTADOS.bloqueada; no.motivo = `Custa ${no.custo} ponto${no.custo === 1 ? '' : 's'} (restam ${saldoPontos})` }
    else no.estado = ESTADOS.disponivel
  }

  // camadas para o desenho; dentro da camada, ordem estável por nome
  const maxProf = Math.max(0, ...[...nos.values()].map(n => n.profundidade))
  const camadas = Array.from({ length: maxProf + 1 }, (_, d) =>
    [...nos.values()].filter(n => n.profundidade === d)
      .sort((a, b) => (a.hab.nome || '').localeCompare(b.hab.nome || '', 'pt-BR'))
  )
  return { nos, camadas: camadas.filter(c => c.length > 0), avisos }
}

/**
 * Orçamento da árvore: total pela fórmula do mestre, gasto = custo das habilidades
 * aprendidas à mão (raça e classe não gastam). Sem fórmula = sem orçamento.
 * @returns {{ total: number|null, gastos: number, saldo: number|null, erro: string|null }}
 */
export function pontosDaArvore({ formula, contexto = {}, habilidades = [], habilidadesFicha = [] } = {}) {
  const porId = new Map(habilidades.map(h => [h.id, h]))
  const gastos = habilidadesFicha
    .filter(hf => !hf.origem || hf.origem === 'manual')
    .reduce((soma, hf) => soma + Math.max(0, Number(porId.get(hf.habilidade_id)?.custo_pontos) || 0), 0)
  if (!formula || !String(formula).trim()) return { total: null, gastos, saldo: null, erro: null }
  try {
    const total = Math.floor(avaliarFormula(formula, contexto))
    return { total, gastos, saldo: total - gastos, erro: null }
  } catch (e) {
    return { total: null, gastos, saldo: null, erro: e.message || 'Fórmula inválida' }
  }
}

/** Ids das habilidades conhecidas que exigem `habId` (impedem esquecê-la). */
export const dependentesConhecidos = (habId, arvore) =>
  [...arvore.nos.values()].filter(n => n.estado === ESTADOS.conhecida && n.paisIds.includes(habId)).map(n => n.id)

/** Quantas de cada estado (resumo em cima da árvore). */
export function resumoArvore(arvore) {
  const conta = { conhecida: 0, disponivel: 0, bloqueada: 0 }
  for (const no of arvore.nos.values()) conta[no.estado]++
  return conta
}

/**
 * Posições para desenhar: cada camada é uma linha, distribuída na largura. Dentro
 * da camada, ordena pela média do x dos pais (menos cruzamento; empate: nome).
 * Devolve coordenadas 0..1 (o componente multiplica pelo tamanho real).
 */
export function posicoesArvore(arvore) {
  const pos = new Map()
  const linhas = arvore.camadas.length || 1
  arvore.camadas.forEach((camada, i) => {
    const media = no => no.paisIds.reduce((s, p) => s + (pos.get(p)?.x ?? 0.5), 0) / (no.paisIds.length || 1)
    const ordem = i === 0 ? camada : [...camada].sort((a, b) =>
      media(a) - media(b) || (a.hab.nome || '').localeCompare(b.hab.nome || '', 'pt-BR'))
    ordem.forEach((no, j) => {
      pos.set(no.id, { x: (j + 1) / (ordem.length + 1), y: linhas === 1 ? 0.5 : (i + 0.5) / linhas })
    })
  })
  return pos
}

/** Ligações pai → filho (uma por par, para as linhas do desenho). */
export const ligacoesArvore = arvore =>
  [...arvore.nos.values()].flatMap(n => n.paisIds.map(de => ({ de, para: n.id })))
