/**
 * Fase 20.5 — Custo de pool em habilidades ativáveis (função PURA).
 * Não acessa banco nem React.
 *
 * habilidade.custo_pool = [{ pool_id, quantidade, por_turno }]
 *   quantidade  — texto, aceita fórmula (F17), igual ao custo de poder
 *   por_turno   — custo recorrente enquanto a habilidade está ativa
 *                 (transformações do IC: 2 Thariuns por turno)
 *
 * Ativar debita TODOS os custos uma vez. Depois, a cada turno, só os `por_turno`
 * voltam a ser cobrados. Quem não consegue pagar o turno é DESATIVADO.
 *
 * A decisão de "não conseguiu pagar → desativa" é da spec (20.5). Não há
 * reembolso: se o mestre errar, corrige na mão.
 */
import { avaliarFormula } from './formulaEngine.js'

export function custosDaHabilidade(hab) {
  const lista = hab?.custo_pool
  return Array.isArray(lista) ? lista : []
}

export function custosDeTurno(hab) {
  return custosDaHabilidade(hab).filter(c => c?.por_turno === true)
}

/** Soma custos repetidos do mesmo pool. */
function agregar(custos) {
  const mapa = {}
  for (const c of custos) mapa[c.pool_id] = (mapa[c.pool_id] || 0) + c.quantidade
  return Object.entries(mapa).map(([pool_id, quantidade]) => ({ pool_id, quantidade }))
}

/**
 * Avalia as quantidades (que podem ser fórmula) com o contexto da ficha.
 * @throws {FormulaError} se alguma fórmula for inválida
 */
export function resolverCustos(custos, contexto = {}) {
  return (custos || []).map(c => ({
    pool_id: c.pool_id,
    quantidade: Math.max(0, Math.floor(avaliarFormula(String(c.quantidade), contexto))),
  }))
}

/**
 * A habilidade pode ser ativada agora? Ativar debita TODOS os custos.
 * @param {object} estado — { atualDoPool: (id)=>number, poolsPorId, contexto }
 * @returns {{ ok: boolean, motivo?: string, custos: Array<{pool_id, quantidade}> }}
 */
export function podeAtivarHabilidade(hab, estado = {}) {
  const { atualDoPool = () => 0, poolsPorId = {}, contexto = {} } = estado

  let custos
  try {
    custos = agregar(resolverCustos(custosDaHabilidade(hab), contexto))
  } catch (e) {
    return { ok: false, motivo: `Custo inválido: ${e.message}`, custos: [] }
  }
  if (custos.length === 0) return { ok: true, custos: [] }

  for (const c of custos) {
    const disponivel = atualDoPool(c.pool_id)
    if (disponivel < c.quantidade) {
      const nome = poolsPorId[c.pool_id]?.nome || 'recurso'
      return {
        ok: false,
        motivo: `${nome} insuficiente: tem ${disponivel}, precisa de ${c.quantidade}.`,
        custos,
      }
    }
  }
  return { ok: true, custos }
}

/** Texto do custo recorrente, para a ficha mostrar. Sem custo por turno → null. */
export function descreverCustoTurno(hab, poolsPorId = {}) {
  const custos = custosDeTurno(hab)
  if (custos.length === 0) return null
  return custos
    .map(c => `${c.quantidade} ${poolsPorId[c.pool_id]?.nome || 'recurso'}`)
    .join(' + ') + '/turno'
}

/**
 * Plano de cobrança de um turno para TODAS as habilidades ativas da ficha.
 * Processa em ordem: cada habilidade paga do saldo que sobrou. Quem não pagar
 * é desativada e não debita nada.
 *
 * @param {Array} habilidadesAtivas — [{ id, habilidade }] já filtradas por ativa
 * @param {object} estado — { atualDoPool, poolsPorId, contexto }
 * @returns {{ debitos: Array<{pool_id, atual}>, desativar: string[], avisos: string[] }}
 *   `debitos` traz o valor FINAL de cada pool que mudou (o RPC só persiste).
 */
export function planejarTurno(habilidadesAtivas = [], estado = {}) {
  const { atualDoPool = () => 0, poolsPorId = {}, contexto = {} } = estado

  const saldo = {}
  const inicial = {}
  const ler = id => {
    if (!(id in saldo)) {
      const v = atualDoPool(id)
      saldo[id] = v
      inicial[id] = v
    }
    return saldo[id]
  }

  const desativar = []
  const avisos = []

  for (const hf of habilidadesAtivas) {
    const hab = hf.habilidade
    if (!hab) continue

    let custos
    try {
      custos = agregar(resolverCustos(custosDeTurno(hab), contexto))
    } catch {
      continue // fórmula quebrada: não cobra, não desativa
    }
    if (custos.length === 0) continue

    const faltando = custos.find(c => ler(c.pool_id) < c.quantidade)
    if (faltando) {
      desativar.push(hf.id)
      const nome = poolsPorId[faltando.pool_id]?.nome || 'recurso'
      avisos.push(`${hab.nome} desativada: ${nome} insuficiente (tem ${ler(faltando.pool_id)}, precisa de ${faltando.quantidade}).`)
      continue
    }
    for (const c of custos) saldo[c.pool_id] = ler(c.pool_id) - c.quantidade
  }

  const debitos = Object.keys(saldo)
    .filter(id => saldo[id] !== inicial[id])
    .map(pool_id => ({ pool_id, atual: saldo[pool_id] }))

  return { debitos, desativar, avisos }
}
