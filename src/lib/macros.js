/**
 * Fase 39 — macros de rolagem salvas na ficha (puro).
 *
 * Macro = um nome + uma notação. A notação aceita tudo o que o motor já
 * entende: dados (`2d6+3`), fórmulas (`1d20+mod(forca)`) e o atalho de nome
 * solto (`(vitalidade)d3`). A conta é do motor de fórmulas (F17); aqui só se
 * valida, resolve e organiza a lista.
 *
 * Sem limite de quantidade (regra do projeto). Só teto de tamanho, para uma
 * ficha não virar um arquivo gigante.
 */
import { resolverNotacaoFormula, validarNotacao } from './diceNotation'

export const LIMITE_NOME = 40
export const LIMITE_NOTACAO = 200

/** Resolve as fórmulas da notação com o contexto da ficha. */
export function resolverMacro(macro, contexto = {}) {
  const { notacao } = resolverNotacaoFormula(String(macro?.notacao || '').trim(), contexto)
  return notacao
}

/**
 * Confere se a macro pode ser salva e rolada com a ficha atual.
 * @returns {{ ok: true, notacao: string } | { ok: false, erro: string }}
 */
export function validarMacro(macro, contexto = {}) {
  const nome = String(macro?.nome || '').trim()
  const notacao = String(macro?.notacao || '').trim()
  if (!nome) return { ok: false, erro: 'Dê um nome à macro.' }
  if (nome.length > LIMITE_NOME) return { ok: false, erro: `Nome com até ${LIMITE_NOME} caracteres.` }
  if (!notacao) return { ok: false, erro: 'Escreva a rolagem (ex.: 1d20+mod(forca)).' }
  if (notacao.length > LIMITE_NOTACAO) return { ok: false, erro: `Rolagem com até ${LIMITE_NOTACAO} caracteres.` }

  let resolvida
  try {
    resolvida = resolverMacro({ notacao }, contexto)
  } catch (e) {
    return { ok: false, erro: e?.message || 'Fórmula inválida.' }
  }
  if (!validarNotacao(resolvida)) {
    return { ok: false, erro: `"${resolvida}" não é uma rolagem válida.` }
  }
  return { ok: true, notacao: resolvida }
}

/** Limpa o que veio do banco: descarta formatos estranhos, garante id. */
export function normalizarMacros(lista) {
  if (!Array.isArray(lista)) return []
  return lista
    .filter(m => m && typeof m === 'object' && typeof m.nome === 'string' && typeof m.notacao === 'string')
    .map((m, i) => ({
      id: typeof m.id === 'string' && m.id ? m.id : `macro-${i}`,
      nome: m.nome.trim().slice(0, LIMITE_NOME),
      notacao: m.notacao.trim().slice(0, LIMITE_NOTACAO),
    }))
}

export function adicionarMacro(lista, { nome, notacao }, gerarId = () => crypto.randomUUID()) {
  return [...normalizarMacros(lista), { id: gerarId(), nome: nome.trim(), notacao: notacao.trim() }]
}

export function editarMacro(lista, id, { nome, notacao }) {
  return normalizarMacros(lista).map(m => (m.id === id ? { ...m, nome: nome.trim(), notacao: notacao.trim() } : m))
}

export function removerMacro(lista, id) {
  return normalizarMacros(lista).filter(m => m.id !== id)
}

/** Troca a macro de lugar com a vizinha (dir = -1 sobe, +1 desce). */
export function moverMacro(lista, id, dir) {
  const l = normalizarMacros(lista)
  const i = l.findIndex(m => m.id === id)
  const j = i + dir
  if (i < 0 || j < 0 || j >= l.length) return l
  ;[l[i], l[j]] = [l[j], l[i]]
  return l
}
