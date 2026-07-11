/**
 * Fase 21.5 — Conversão de tipo de dano (função PURA).
 * Não acessa banco nem React.
 *
 * Um modificador com operacao 'converter' muda o TIPO de um efeito:
 *   { operacao: 'converter', alvo: 'tipo_dano', valor: {"de":"fisico","para":"eletrico"} }
 *   `de` === '*'  → converte qualquer tipo. `valor` pode vir como objeto ou JSON string.
 *
 * A conversão acontece ANTES da checagem de resistência/imunidade (contrato F21):
 * quem consome resolve o tipo final e só então compara com as defesas do alvo.
 */
import { normalizar } from './formulaEngine.js'

function parseRegra(valor) {
  if (valor && typeof valor === 'object') return valor
  if (typeof valor === 'string') { try { return JSON.parse(valor) } catch { return null } }
  return null
}

/** Só os modificadores de conversão de tipo de dano. */
export function conversoesDeDano(modificadores = []) {
  return (modificadores || []).filter(
    m => m?.operacao === 'converter' && (!m.alvo || m.alvo === 'tipo_dano')
  )
}

/**
 * Resolve o tipo final aplicando as conversões em sequência (uma pode alimentar
 * a próxima). Retorna também o tipo original, se houve conversão.
 * @returns {{ tipo: string, convertidoDe: string|null }}
 */
export function resolverTipoDano(tipoBase, modificadores = []) {
  let tipo = String(tipoBase || '').trim()
  const original = tipo
  let houve = false

  for (const m of conversoesDeDano(modificadores)) {
    const regra = parseRegra(m.valor)
    if (!regra?.para) continue
    const de = String(regra.de ?? '*')
    if (de === '*' || (tipo && normalizar(de) === normalizar(tipo))) {
      tipo = String(regra.para)
      houve = true
    }
  }

  return { tipo, convertidoDe: houve ? (original || null) : null }
}

/** Texto para o feed: "elétrico (convertido de físico)" ou só "físico". */
export function descreverTipoDano(tipoBase, modificadores = []) {
  const { tipo, convertidoDe } = resolverTipoDano(tipoBase, modificadores)
  if (!tipo) return ''
  return convertidoDe ? `${tipo} (convertido de ${convertidoDe})` : tipo
}
