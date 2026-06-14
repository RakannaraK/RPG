/**
 * Motor de modificadores — função pura.
 * Não acessa banco nem React. Entrada: base + lista de modificadores. Saída: valores finais.
 *
 * Fonte esperada de `modificadores`: saída de coletarModificadores().
 * Cada modificador deve ter { tipo, alvo, operacao, valor, _fonte }.
 */

/**
 * Coleta modificadores ativos de raça e classe da ficha.
 * Anota _fonte (nome da raça/classe) em cada modificador para rastreabilidade.
 *
 * @param {{ raca?: object, classe?: object }} contexto
 *   raca  — objeto raça com campo modificadores[] (pode ser null)
 *   classe — objeto classe com campo modificadores[] (pode ser null)
 * @returns {Array} lista plana de modificadores ativos com campo _fonte
 */
export function coletarModificadores({ raca, classe } = {}) {
  const lista = []
  if (raca?.modificadores?.length) {
    lista.push(...raca.modificadores.map(m => ({ ...m, _fonte: raca.nome })))
  }
  if (classe?.modificadores?.length) {
    lista.push(...classe.modificadores.map(m => ({ ...m, _fonte: classe.nome })))
  }
  return lista
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

  function aplicar(valorBase, mods) {
    const fontes = []
    let result = Number(valorBase) || 0

    for (const mod of mods.filter(m => m.operacao === 'somar')) {
      const v = Number(mod.valor) || 0
      result += v
      fontes.push({ fonte: mod._fonte || '?', operacao: 'somar', valor: v })
    }

    for (const mod of mods.filter(m => m.operacao === 'multiplicar')) {
      const v = Number(mod.valor) || 1
      result = result * v
      fontes.push({ fonte: mod._fonte || '?', operacao: 'multiplicar', valor: v })
    }

    const definires = mods.filter(m => m.operacao === 'definir')
    if (definires.length > 0) {
      const ultimo = definires[definires.length - 1]
      const v = Number(ultimo.valor)
      result = v
      fontes.push({ fonte: ultimo._fonte || '?', operacao: 'definir', valor: v })
    }

    return { final: result, fontes }
  }

  // Atributos
  const atributosFinal = {}
  const detAtributos = {}
  for (const [id, valorBase] of Object.entries(base.atributos || {})) {
    const mods = porAtributo[id] || []
    const { final, fontes } = aplicar(valorBase, mods)
    atributosFinal[id] = final
    detAtributos[id] = { base: Number(valorBase) || 0, final, fontes }
  }

  // Vida máxima
  const { final: vidaMaxFinal, fontes: vidaMaxFontes } = aplicar(base.vida_max ?? 0, porVidaMax)

  // Vida temporária (base sempre 0 — é concedida pelos modificadores)
  const { final: vidaTempFinal, fontes: vidaTempFontes } = aplicar(0, porVidaTemp)

  // Combate
  const combateFinal = {}
  const detCombate = {}
  for (const [id, valorBase] of Object.entries(base.combate || {})) {
    const mods = porCombate[id] || []
    const { final, fontes } = aplicar(valorBase, mods)
    combateFinal[id] = final
    detCombate[id] = { base: Number(valorBase) || 0, final, fontes }
  }

  return {
    atributos: atributosFinal,
    vida_max: vidaMaxFinal,
    vida_temp: vidaTempFinal > 0 ? vidaTempFinal : 0,
    combate: combateFinal,
    detalhamento: {
      atributos: detAtributos,
      vida_max: { base: Number(base.vida_max) || 0, final: vidaMaxFinal, fontes: vidaMaxFontes },
      vida_temp: { base: 0, final: vidaTempFinal, fontes: vidaTempFontes },
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
