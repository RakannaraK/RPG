/**
 * Fase 20.2 — Catálogo de poderes (funções PURAS).
 * Não acessa banco nem React.
 *
 * Um poder é uma "carta" do sistema: nome, categoria livre ("Magia", "Técnica"),
 * círculo opcional, custo, efeito rolável opcional. Nada aqui é de D&D.
 *
 * Custo = lista de débitos ao usar:
 *   { tipo: 'pool', pool_id, quantidade }   quantidade é texto e aceita fórmula (F17)
 *   { tipo: 'slot', circulo_minimo }
 *
 * Escala por círculo: a faixa é escolhida pelo círculo USADO (mecanismo da F19)
 * e seu valor é a TAXA por círculo ACIMA do mínimo — 3º círculo num poder de 1º
 * são 2 círculos acima, logo 2× a taxa.
 */
import { validarFormula, normalizar, avaliarFormula } from './formulaEngine.js'
import { validarNotacao } from './diceNotation.js'
import { validarFaixas, faixaAtiva } from './faixas.js'
import { circulosGastaveis } from './slotsEngine.js'

// ────────────────────────────────────────────────────────────── custo

/** Só os débitos de pool. */
export function custosDePool(custo) {
  return (custo || []).filter(c => c?.tipo === 'pool')
}

/** O débito de slot, se houver (no máximo um). */
export function custoDeSlot(custo) {
  return (custo || []).find(c => c?.tipo === 'slot') || null
}

/**
 * Texto legível do custo. `poolsPorId` mapeia id → pool (para pegar o nome).
 * Sem custo → "Sem custo".
 */
export function descreverCusto(custo, poolsPorId = {}) {
  const partes = []
  for (const c of custo || []) {
    if (c.tipo === 'pool') {
      const nome = poolsPorId[c.pool_id]?.nome || 'recurso'
      partes.push(`${c.quantidade} ${nome}`)
    } else if (c.tipo === 'slot') {
      const min = Number(c.circulo_minimo)
      partes.push(Number.isFinite(min) ? `slot de círculo ${min}+` : 'slot')
    }
  }
  return partes.length ? partes.join(' + ') : 'Sem custo'
}

/** @returns {{ valida: boolean, erro?: string }} */
export function validarCusto(custo, pools = []) {
  if (!custo || custo.length === 0) return { valida: true } // custo é opcional
  const ids = new Set(pools.map(p => p.id))
  let slots = 0

  for (let i = 0; i < custo.length; i++) {
    const c = custo[i]
    const rotulo = `Custo ${i + 1}`
    if (c?.tipo === 'pool') {
      if (!c.pool_id || !ids.has(c.pool_id)) return { valida: false, erro: `${rotulo}: escolha um recurso existente.` }
      const q = String(c.quantidade ?? '').trim()
      if (!q) return { valida: false, erro: `${rotulo}: informe a quantidade.` }
      const v = validarFormula(q) // aceita "3" e "piso(nivel / 2)"
      if (!v.valida) return { valida: false, erro: `${rotulo}: quantidade inválida — ${v.erro}` }
    } else if (c?.tipo === 'slot') {
      slots++
      if (slots > 1) return { valida: false, erro: 'Só um custo de slot por poder.' }
      const n = Number(c.circulo_minimo)
      if (!Number.isFinite(n) || n < 0) return { valida: false, erro: `${rotulo}: círculo mínimo inválido.` }
    } else {
      return { valida: false, erro: `${rotulo}: tipo desconhecido.` }
    }
  }
  return { valida: true }
}

// ────────────────────────────────────────────────────────────── escala

/**
 * Quantos círculos ACIMA do mínimo o poder está sendo usado.
 * Nunca negativo (usar abaixo do mínimo é bloqueado antes).
 */
export function circulosAcima(circuloUsado, circuloBase) {
  return Math.max(0, (Number(circuloUsado) || 0) - (Number(circuloBase) || 0))
}

/** Texto legível da escala. Sem escala → null. */
export function descreverEscala(escala) {
  const fs = escala?.faixas
  if (!Array.isArray(fs) || fs.length === 0) return null
  return fs
    .map(f => {
      const ate = f.ate == null ? '+' : `–${f.ate}`
      return `${f.de}${ate}: +${f.valor_extra_por_circulo}/círculo`
    })
    .join(' · ')
}

/**
 * Valida a escala reusando a validação de faixas da F19 (contígua, sem
 * sobreposição, só a última aberta). Adapta o nome do campo de valor.
 */
export function validarEscala(escala) {
  const fs = escala?.faixas
  if (!Array.isArray(fs) || fs.length === 0) return { valida: true } // escala é opcional
  const adaptada = { faixas: fs.map(f => ({ ...f, valor: f.valor_extra_por_circulo })) }
  return validarFaixas(adaptada)
}

// ────────────────────────────────────────────────────────────── poder

/**
 * Valida um poder inteiro antes de salvar.
 * `efeito_notacao` pode conter fórmulas (F17.2); aqui só checamos que, tirando
 * as variáveis, a notação é plausível — a resolução real acontece ao usar.
 */
export function validarPoder(poder, { pools = [] } = {}) {
  if (!poder?.nome?.trim()) return { valida: false, erro: 'Informe o nome do poder.' }

  if (poder.circulo != null && poder.circulo !== '') {
    const c = Number(poder.circulo)
    if (!Number.isFinite(c) || c < 0) return { valida: false, erro: 'Círculo inválido.' }
  }

  const custo = validarCusto(poder.custo, pools)
  if (!custo.valida) return custo

  const escala = validarEscala(poder.escala_circulo)
  if (!escala.valida) return { valida: false, erro: `Escala: ${escala.erro}` }

  const notacao = String(poder.efeito_notacao ?? '').trim()
  if (notacao && !notacaoPlausivel(notacao)) {
    return { valida: false, erro: 'Efeito: notação inválida (ex: 2d6, 1d8 + mod(carisma)).' }
  }

  const cd = String(poder.cd_formula ?? '').trim()
  if (cd) {
    const v = validarFormula(cd)
    if (!v.valida) return { valida: false, erro: `CD: ${v.erro}` }
  }

  if (poder.nivel_minimo != null && poder.nivel_minimo !== '') {
    const n = Number(poder.nivel_minimo)
    if (!Number.isFinite(n) || n < 1) return { valida: false, erro: 'Nível mínimo inválido.' }
  }

  return { valida: true }
}

/**
 * Notação com variáveis ainda não resolvidas ("1d8 + mod(carisma)"): trocamos
 * cada chamada de função e nome solto por um número e conferimos a notação.
 * `validarNotacao` não tolera espaços entre operadores, então limpamos antes.
 */
function notacaoPlausivel(texto) {
  const semFuncoes = String(texto).replace(/[a-z_]+\s*\([^)]*\)/gi, '0')
  const semVars = semFuncoes.replace(/(^|[^0-9a-z])([a-z_]{2,})/gi, (m, pre) => `${pre}0`)
  return validarNotacao(semVars.replace(/\s+/g, ''))
}

// ────────────────────────────────────────────────────────────── filtros

/**
 * Filtra o catálogo. Campos vazios não filtram.
 * @param {object} f — { busca, circulo, categoria, classeId, tag }
 */
export function filtrarPoderes(poderes, f = {}) {
  const busca = normalizar(f.busca || '')
  const temCirculo = f.circulo !== '' && f.circulo != null
  const circulo = Number(f.circulo)

  return (poderes || []).filter(p => {
    if (busca) {
      const alvo = `${normalizar(p.nome)} ${normalizar(p.descricao || '')}`
      if (!alvo.includes(busca)) return false
    }
    if (temCirculo) {
      if (circulo === -1) { if (p.circulo != null) return false } // "sem círculo"
      else if (Number(p.circulo) !== circulo) return false
    }
    if (f.categoria && normalizar(p.categoria || '') !== normalizar(f.categoria)) return false
    if (f.classeId && p.classe_id !== f.classeId) return false
    if (f.tag && !(p.tags || []).some(t => normalizar(t) === normalizar(f.tag))) return false
    return true
  })
}

/** Valores distintos para alimentar os selects de filtro. */
export function opcoesDeFiltro(poderes) {
  const categorias = new Set()
  const tags = new Set()
  const circulos = new Set()
  for (const p of poderes || []) {
    if (p.categoria?.trim()) categorias.add(p.categoria.trim())
    for (const t of p.tags || []) if (t?.trim()) tags.add(t.trim())
    if (p.circulo != null) circulos.add(Number(p.circulo))
  }
  return {
    categorias: [...categorias].sort((a, b) => a.localeCompare(b)),
    tags: [...tags].sort((a, b) => a.localeCompare(b)),
    circulos: [...circulos].sort((a, b) => a - b),
  }
}

/** Ordena por círculo (sem círculo primeiro) e depois por nome. */
export function ordenarPoderes(poderes) {
  return [...(poderes || [])].sort((a, b) => {
    const ca = a.circulo ?? -1
    const cb = b.circulo ?? -1
    if (ca !== cb) return ca - cb
    return (a.nome || '').localeCompare(b.nome || '')
  })
}

// ═══════════════════════════════════════════════════ Fase 20.4 — usar um poder

/** Círculo mínimo em que o poder pode ser usado (do custo de slot, ou o do poder). */
export function circuloBaseDoPoder(poder) {
  const slot = custoDeSlot(poder?.custo)
  if (slot && Number.isFinite(Number(slot.circulo_minimo))) return Number(slot.circulo_minimo)
  return Number(poder?.circulo) || 0
}

/**
 * Extra da escala ao usar num círculo acima do mínimo.
 * A faixa é escolhida pelo círculo USADO — reusando o seletor de faixas da F19 —
 * e seu valor é a TAXA por círculo acima, que ACUMULA.
 * @returns {{ taxa: string, vezes: number, termos: string[] }|null}
 */
export function extraDaEscala(poder, circuloUsado) {
  const faixas = poder?.escala_circulo?.faixas
  if (!Array.isArray(faixas) || faixas.length === 0) return null

  const vezes = circulosAcima(circuloUsado, circuloBaseDoPoder(poder))
  if (vezes <= 0) return null

  // Reusa faixaAtiva (F19) tratando o círculo usado como a variável observada.
  const ativa = faixaAtiva({ variavel: 'nivel', faixas }, { nivel: Number(circuloUsado) || 0 })
  const taxa = String(ativa?.faixa?.valor_extra_por_circulo ?? '').trim()
  if (!taxa) return null

  return { taxa, vezes, termos: Array(vezes).fill(taxa) }
}

/**
 * Notação final do efeito, já com a escala do círculo usado.
 * "1d8 + mod(carisma)" no 3º círculo de um poder de 1º → "1d8 + mod(carisma) + 1d8 + 1d8"
 * (a resolução das fórmulas acontece depois, via resolverNotacaoFormula da F17.2)
 */
export function montarNotacaoUso(poder, circuloUsado) {
  const base = String(poder?.efeito_notacao ?? '').trim()
  const extra = extraDaEscala(poder, circuloUsado)
  if (!extra) return base
  const termos = extra.termos.join(' + ')
  return base ? `${base} + ${termos}` : termos
}

/**
 * Resolve as quantidades dos custos de pool (que podem ser fórmula).
 * @returns {Array<{ pool_id: string, quantidade: number }>}
 * @throws {FormulaError} se alguma fórmula for inválida
 */
export function custoResolvido(custo, contexto = {}) {
  return custosDePool(custo).map(c => ({
    pool_id: c.pool_id,
    quantidade: Math.max(0, Math.floor(avaliarFormula(String(c.quantidade), contexto))),
  }))
}

/**
 * O poder pode ser usado agora? Custos falham ANTES do efeito, com motivo claro.
 *
 * @param {object} poder
 * @param {object} estado
 *   { totaisSlots, usadosSlots, atualDoPool: (id)=>number, poolsPorId, contexto }
 * @returns {{ ok: boolean, motivo?: string, circulos: number[], custos: Array }}
 *   `circulos` = círculos gastáveis (vazio se o poder não custa slot)
 */
export function podeUsarPoder(poder, estado = {}) {
  const { totaisSlots = {}, usadosSlots = {}, atualDoPool = () => 0, poolsPorId = {}, contexto = {} } = estado

  // 1) custos de pool
  let custos
  try {
    custos = custoResolvido(poder?.custo, contexto)
  } catch (e) {
    return { ok: false, motivo: `Custo inválido: ${e.message}`, circulos: [], custos: [] }
  }
  for (const c of custos) {
    const disponivel = atualDoPool(c.pool_id)
    if (disponivel < c.quantidade) {
      const nome = poolsPorId[c.pool_id]?.nome || 'recurso'
      return {
        ok: false,
        motivo: `${nome} insuficiente: tem ${disponivel}, precisa de ${c.quantidade}.`,
        circulos: [],
        custos,
      }
    }
  }

  // 2) custo de slot
  const slot = custoDeSlot(poder?.custo)
  if (!slot) return { ok: true, circulos: [], custos }

  const minimo = Number(slot.circulo_minimo) || 0
  const circulos = circulosGastaveis(totaisSlots, usadosSlots, minimo)
  if (circulos.length === 0) {
    return { ok: false, motivo: `Sem slots disponíveis de ${minimo}º círculo ou acima.`, circulos: [], custos }
  }
  return { ok: true, circulos, custos }
}

/**
 * CD do poder: a fórmula dele, ou a do sistema. Sem fórmula → null.
 * Falha de avaliação → null (não derruba a ficha).
 */
export function cdDoPoder(poder, cdSistema, contexto = {}) {
  const f = String(poder?.cd_formula || cdSistema || '').trim()
  if (!f) return null
  try {
    return Math.floor(avaliarFormula(f, contexto))
  } catch {
    return null
  }
}

/** Frase do feed: "conjurou Curar Feridas no 2º círculo". */
export function frasesDeUso(poder, circuloUsado, rotuloCategoria = 'usou') {
  const nome = poder?.nome || 'poder'
  const base = circuloBaseDoPoder(poder)
  const noCirculo = custoDeSlot(poder?.custo) && circuloUsado > 0
    ? ` no ${circuloUsado}º círculo${circuloUsado > base ? ' (elevado)' : ''}`
    : ''
  return `${rotuloCategoria} ${nome}${noCirculo}`
}
