/**
 * Motor de modificadores — função pura.
 * Não acessa banco nem React. Entrada: base + lista de modificadores. Saída: valores finais.
 *
 * Fonte esperada de `modificadores`: saída de coletarModificadores().
 * Cada modificador deve ter { tipo, alvo, operacao, valor, _fonte }.
 */
import { avaliarFormula } from './formulaEngine.js'

/**
 * Fase 17.5 — resolve o `valor` dos modificadores marcados `valor_e_formula`,
 * avaliando a fórmula com o contexto da ficha (sem atributos — anti-auto-ref).
 * Guarda a fórmula original em `_valorFormula` para rastreabilidade. Falha → 0.
 */
export function resolverValoresFormula(modificadores, contexto) {
  return (modificadores || []).map(m => {
    if (!m.valor_e_formula) return m
    try {
      return { ...m, valor: avaliarFormula(m.valor, contexto), _valorFormula: m.valor }
    } catch {
      return { ...m, valor: 0, _valorFormula: m.valor, _valorErro: true }
    }
  })
}

/**
 * Compara dois números segundo um operador textual.
 * @param {number} a
 * @param {string} operador — '<' | '<=' | '>' | '>=' | '==' | '=' | '!='
 * @param {number} b
 */
function comparar(a, operador, b) {
  switch (operador) {
    case '<':  return a < b
    case '<=': return a <= b
    case '>':  return a > b
    case '>=': return a >= b
    case '==':
    case '=':  return a === b
    case '!=': return a !== b
    default:   return false
  }
}

/**
 * Avalia uma condição AUTOMÁTICA de um modificador contra o estado atual da ficha.
 * Só sabe avaliar métricas que o app conhece (vida%, nível, habilidade ativa) —
 * "vs mortos-vivos" e afins são condições manuais (ver coletarModificadores).
 *
 * @param {object} modificador — { condicao_config: { metrica, operador, valor, habilidade_id } }
 * @param {object|null} estadoFicha — { vida_atual, vida_max, nivel, habilidadesAtivas: Set }
 * @returns {boolean} true se a condição é satisfeita
 */
export function avaliarCondicao(modificador, estadoFicha) {
  if (!estadoFicha) return false // sem contexto não dá para avaliar auto
  const cfg = modificador.condicao_config || {}

  switch (cfg.metrica) {
    case 'vida_percent': {
      const max = Number(estadoFicha.vida_max) || 0
      if (max <= 0) return false
      const pct = ((Number(estadoFicha.vida_atual) || 0) / max) * 100
      return comparar(pct, cfg.operador, Number(cfg.valor))
    }
    case 'nivel':
      return comparar(Number(estadoFicha.nivel) || 0, cfg.operador, Number(cfg.valor))
    case 'habilidade_ativa':
      return estadoFicha.habilidadesAtivas instanceof Set
        ? estadoFicha.habilidadesAtivas.has(cfg.habilidade_id)
        : false
    default:
      return false
  }
}

/**
 * Decide se um modificador entra, conforme sua condição (Fase 12).
 *   - sem condicao_tipo ou 'nenhuma' → entra
 *   - 'auto'   → entra se avaliarCondicao() for verdadeira
 *   - 'manual' → entra se condicoesManuais[modificador.id] === true
 *   - tipo desconhecido → entra (não silenciar por engano)
 */
function condicaoSatisfeita(mod, estadoFicha, condicoesManuais) {
  const tipo = mod.condicao_tipo
  if (!tipo || tipo === 'nenhuma') return true
  if (tipo === 'auto')   return avaliarCondicao(mod, estadoFicha)
  if (tipo === 'manual') return condicoesManuais?.[mod.id] === true
  return true
}

/**
 * Coleta modificadores ativos de raça, classe e habilidades da ficha.
 * Anota _fonte em cada modificador para rastreabilidade.
 *
 * Regras para habilidades:
 *   - passiva → modificadores sempre incluídos (independe do estado ativa)
 *   - ativavel → incluídos SOMENTE se ativa === true
 *
 * Fase 12 — após o filtro de habilidade ativa, cada modificador ainda passa
 * pela avaliação de condição (auto/manual) antes de entrar na lista final.
 *
 * @param {object} contexto
 * @param {object} [contexto.raca]
 * @param {object} [contexto.classe]
 * @param {Array}  [contexto.habilidadesFicha] — { habilidade: { id, nome, tipo, modificadores[] }, ativa }
 * @param {object} [contexto.estadoFicha] — { vida_atual, vida_max, nivel, habilidadesAtivas: Set } (condições auto)
 * @param {object} [contexto.condicoesManuais] — { [modificador_id]: boolean } (condições manuais)
 * @returns {Array} lista plana de modificadores ativos com campo _fonte
 */
function coletarEmJogo({ raca, classe, habilidadesFicha = [] }) {
  const lista = []
  if (raca?.modificadores?.length) {
    lista.push(...raca.modificadores.map(m => ({ ...m, _fonte: raca.nome })))
  }
  if (classe?.modificadores?.length) {
    lista.push(...classe.modificadores.map(m => ({ ...m, _fonte: classe.nome })))
  }
  for (const hf of habilidadesFicha) {
    const hab = hf.habilidade
    if (!hab?.modificadores?.length) continue
    const deveIncluir = hab.tipo === 'passiva' || hf.ativa === true
    if (deveIncluir) {
      lista.push(...hab.modificadores.map(m => ({ ...m, _fonte: hab.nome })))
    }
  }
  return lista
}

export function coletarModificadores({
  raca,
  classe,
  habilidadesFicha = [],
  estadoFicha = null,
  condicoesManuais = {},
} = {}) {
  // Fase 12 — filtra por condição (auto/manual) antes de devolver
  return coletarEmJogo({ raca, classe, habilidadesFicha })
    .filter(mod => condicaoSatisfeita(mod, estadoFicha, condicoesManuais))
}

/**
 * Fase 12.6 — lista os modificadores de condição MANUAL atualmente "em jogo"
 * (raça/classe sempre; habilidade só se passiva ou ativável ligada),
 * independente de o interruptor estar ligado. Alimenta os interruptores
 * situacionais na ficha. Cada item traz _fonte e condicao_config.rotulo.
 *
 * @returns {Array} modificadores com condicao_tipo === 'manual'
 */
export function listarCondicoesManuais({ raca, classe, habilidadesFicha = [] } = {}) {
  return coletarEmJogo({ raca, classe, habilidadesFicha })
    .filter(mod => mod.condicao_tipo === 'manual')
}

/**
 * Aplica modificadores sobre os valores base e retorna os valores finais.
 *
 * Ordem de operações por alvo:
 *   1. parte do valor base
 *   2. soma todos os 'somar'
 *   3. aplica cada 'multiplicar' em sequência
 *   4. 'definir': último vence e sobrescreve tudo
 *
 * @param {object} base
 *   {
 *     atributos: { [atributoId: string]: number },
 *     vida_max: number,
 *     combate: { [campoId: string]: number },
 *   }
 * @param {Array} modificadores — saída de coletarModificadores()
 * @returns {object}
 *   {
 *     atributos: { [atributoId]: number },
 *     vida_max: number,
 *     vida_temp: number,
 *     combate: { [campoId]: number },
 *     detalhamento: {
 *       atributos: { [atributoId]: { base, final, fontes[] } },
 *       vida_max: { base, final, fontes[] },
 *       vida_temp: { base, final, fontes[] },
 *       combate: { [campoId]: { base, final, fontes[] } },
 *     }
 *   }
 */
export function calcularValoresFinais(base, modificadores) {
  // Separa modificadores por tipo/alvo
  const porAtributo = {}
  const porVidaMax = []
  const porVidaTemp = []
  const porCombate = {}

  for (const mod of modificadores) {
    switch (mod.tipo) {
      case 'atributo':
        if (mod.alvo) {
          if (!porAtributo[mod.alvo]) porAtributo[mod.alvo] = []
          porAtributo[mod.alvo].push(mod)
        }
        break
      case 'vida_max':
        porVidaMax.push(mod)
        break
      case 'vida_temp':
        porVidaTemp.push(mod)
        break
      case 'combate':
        if (mod.alvo) {
          if (!porCombate[mod.alvo]) porCombate[mod.alvo] = []
          porCombate[mod.alvo].push(mod)
        }
        break
      // resistencia/imunidade/vulnerabilidade → agregarDefesas
    }
  }

  // Fase 18 — ORDEM DE OPERAÇÕES OFICIAL (contrato matemático):
  //   1. base
  //   2. somas   → subtotal1 = base + Σ somar
  //   3. percent → subtotal2 = piso(subtotal1 × (1 + Σ percentual/100))  [aditivos entre si]
  //   4. mult    → resultado = subtotal2 × Π multiplicar (em sequência)
  //   5. definir → último 'definir' sobrescreve tudo
  // Piso (floor) só após o passo de percentuais. Valor não fica negativo (piso em 0),
  // exceto quando 'definir' fixa explicitamente.
  function aplicar(valorBase, mods) {
    const base = Number(valorBase) || 0
    const fontes = []

    // 2 — somas
    let somaTotal = 0
    for (const mod of mods.filter(m => m.operacao === 'somar')) {
      const v = Number(mod.valor) || 0
      somaTotal += v
      fontes.push({ fonte: mod._fonte || '?', operacao: 'somar', valor: v })
    }
    const subtotal1 = base + somaTotal

    // 3 — percentuais (ADITIVOS entre si, sobre subtotal1; piso ao fim do passo)
    let percTotal = 0
    for (const mod of mods.filter(m => m.operacao === 'percentual')) {
      const v = Number(mod.valor) || 0
      percTotal += v
      fontes.push({ fonte: mod._fonte || '?', operacao: 'percentual', valor: v })
    }
    const subtotal2 = percTotal !== 0 ? Math.floor(subtotal1 * (1 + percTotal / 100)) : subtotal1

    // 4 — multiplicadores duros (em sequência)
    let resultado = subtotal2
    for (const mod of mods.filter(m => m.operacao === 'multiplicar')) {
      const v = Number(mod.valor) || 1
      resultado = resultado * v
      fontes.push({ fonte: mod._fonte || '?', operacao: 'multiplicar', valor: v })
    }

    // piso em 0 (nada de valor negativo por soma/percentual/multiplicar)
    if (resultado < 0) resultado = 0

    // 5 — definir (último vence, valor exato)
    const definires = mods.filter(m => m.operacao === 'definir')
    let final = resultado
    if (definires.length > 0) {
      const ultimo = definires[definires.length - 1]
      final = Number(ultimo.valor)
      fontes.push({ fonte: ultimo._fonte || '?', operacao: 'definir', valor: final })
    }

    const passos = {
      base, somaTotal, subtotal1, percTotal, subtotal2, resultado,
      definido: definires.length > 0 ? final : null,
    }
    return { final, fontes, passos }
  }

  // Atributos
  const atributosFinal = {}
  const detAtributos = {}
  for (const [id, valorBase] of Object.entries(base.atributos || {})) {
    const mods = porAtributo[id] || []
    const { final, fontes, passos } = aplicar(valorBase, mods)
    atributosFinal[id] = final
    detAtributos[id] = { base: Number(valorBase) || 0, final, fontes, passos }
  }

  // Vida máxima
  const { final: vidaMaxFinal, fontes: vidaMaxFontes, passos: vidaMaxPassos } = aplicar(base.vida_max ?? 0, porVidaMax)

  // Vida temporária (base sempre 0 — é concedida pelos modificadores)
  const { final: vidaTempFinal, fontes: vidaTempFontes, passos: vidaTempPassos } = aplicar(0, porVidaTemp)

  // Combate
  const combateFinal = {}
  const detCombate = {}
  for (const [id, valorBase] of Object.entries(base.combate || {})) {
    const mods = porCombate[id] || []
    const { final, fontes, passos } = aplicar(valorBase, mods)
    combateFinal[id] = final
    detCombate[id] = { base: Number(valorBase) || 0, final, fontes, passos }
  }

  return {
    atributos: atributosFinal,
    vida_max: vidaMaxFinal,
    vida_temp: vidaTempFinal > 0 ? vidaTempFinal : 0,
    combate: combateFinal,
    detalhamento: {
      atributos: detAtributos,
      vida_max: { base: Number(base.vida_max) || 0, final: vidaMaxFinal, fontes: vidaMaxFontes, passos: vidaMaxPassos },
      vida_temp: { base: 0, final: vidaTempFinal, fontes: vidaTempFontes, passos: vidaTempPassos },
      combate: detCombate,
    },
  }
}

/**
 * Agrega resistências, imunidades e vulnerabilidades em listas únicas.
 * São conjuntos — não somam, só acumulam tipos únicos.
 *
 * @param {Array} modificadores — saída de coletarModificadores()
 * @returns {{ resistencias: string[], imunidades: string[], vulnerabilidades: string[] }}
 */
export function agregarDefesas(modificadores) {
  const resistencias = new Set()
  const imunidades = new Set()
  const vulnerabilidades = new Set()

  for (const mod of modificadores) {
    const tipo = (mod.alvo || mod.valor || '').toLowerCase().trim()
    if (!tipo) continue
    if (mod.tipo === 'resistencia')     resistencias.add(tipo)
    if (mod.tipo === 'imunidade')       imunidades.add(tipo)
    if (mod.tipo === 'vulnerabilidade') vulnerabilidades.add(tipo)
  }

  return {
    resistencias:     [...resistencias],
    imunidades:       [...imunidades],
    vulnerabilidades: [...vulnerabilidades],
  }
}
