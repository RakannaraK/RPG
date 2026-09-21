/**
 * Fase 33 — árvore de habilidades (puro). Cada habilidade pode exigir outra
 * (`requer_habilidade_id`) e um nível mínimo (F19.5). A árvore sai em camadas:
 * raízes em cima, filhas embaixo, com o estado de cada nó para a ficha.
 *
 * ponytail: um pré-requisito por habilidade (árvore, não grafo). Se um dia
 * precisar de "exige A e B", vira uma lista de ids e o layout passa a DAG.
 */

import { nivelDeReferencia } from './requisitos'

const ESTADOS = { conhecida: 'conhecida', disponivel: 'disponivel', bloqueada: 'bloqueada' }
export const ESTADOS_ARVORE = ESTADOS

/** Pai efetivo: ignora referência quebrada e ciclo (A→B→A vira raiz). */
function paiValido(hab, porId) {
  let atual = porId.get(hab.requer_habilidade_id)
  const vistos = new Set([hab.id])
  while (atual) {
    if (vistos.has(atual.id)) return null // ciclo: trata como raiz
    vistos.add(atual.id)
    atual = porId.get(atual.requer_habilidade_id)
  }
  return porId.get(hab.requer_habilidade_id) || null
}

/**
 * @param habilidades lista do sistema [{ id, nome, requer_habilidade_id, nivel_minimo, classe_id, raca_id }]
 * @param opcoes { conhecidasIds: string[], contexto: { nivel, niveisPorClasse } }
 * @returns {{ nos: Map, camadas: no[][], avisos: string[] }}
 *   no = { id, hab, paiId, profundidade, filhos: id[], estado, motivo }
 */
export function montarArvore(habilidades = [], { conhecidasIds = [], contexto = {} } = {}) {
  const porId = new Map(habilidades.map(h => [h.id, h]))
  const conhecidas = new Set(conhecidasIds)
  const avisos = []

  // profundidade e filhos
  const nos = new Map()
  for (const hab of habilidades) {
    const pai = paiValido(hab, porId)
    if (hab.requer_habilidade_id && !pai) {
      avisos.push(`“${hab.nome}” tem pré-requisito inválido (apagado ou em círculo) — virou raiz.`)
    }
    nos.set(hab.id, { id: hab.id, hab, paiId: pai?.id || null, profundidade: 0, filhos: [], estado: ESTADOS.bloqueada, motivo: null })
  }
  for (const no of nos.values()) {
    if (no.paiId) nos.get(no.paiId).filhos.push(no.id)
    let p = no.paiId, d = 0
    while (p && d < 100) { d++; p = nos.get(p)?.paiId }
    no.profundidade = d
  }

  // estado de cada nó para esta ficha
  for (const no of nos.values()) {
    const { hab } = no
    const nivelMin = hab.nivel_minimo == null ? null : Number(hab.nivel_minimo)
    const nivelAtual = nivelDeReferencia(hab, contexto)
    const faltaNivel = nivelMin != null && (nivelAtual ?? 0) < nivelMin
    const faltaPai = no.paiId && !conhecidas.has(no.paiId)
    if (conhecidas.has(no.id)) no.estado = ESTADOS.conhecida
    else if (faltaPai) { no.estado = ESTADOS.bloqueada; no.motivo = `Precisa de “${nos.get(no.paiId).hab.nome}”` }
    else if (faltaNivel) { no.estado = ESTADOS.bloqueada; no.motivo = `Precisa de nível ${nivelMin}` }
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

/** Quantas de cada estado (resumo em cima da árvore). */
export function resumoArvore(arvore) {
  const conta = { conhecida: 0, disponivel: 0, bloqueada: 0 }
  for (const no of arvore.nos.values()) conta[no.estado]++
  return conta
}

/**
 * Posições para desenhar: cada camada é uma linha, distribuída na largura.
 * Devolve coordenadas 0..1 (o componente multiplica pelo tamanho real).
 */
export function posicoesArvore(arvore) {
  const pos = new Map()
  const linhas = arvore.camadas.length || 1
  arvore.camadas.forEach((camada, i) => {
    camada.forEach((no, j) => {
      pos.set(no.id, { x: (j + 1) / (camada.length + 1), y: linhas === 1 ? 0.5 : (i + 0.5) / linhas })
    })
  })
  return pos
}

/** Ligações pai → filho (para as linhas do desenho). */
export const ligacoesArvore = arvore =>
  [...arvore.nos.values()].filter(n => n.paiId).map(n => ({ de: n.paiId, para: n.id }))
