export const CONFIG_LAYOUT_DEFAULT = {
  secoes: {
    atributos: true,
    pericias: false,
    proficiencias: false,
    combate: false,
    defesas: false,
    acoes: true,
    inventario: true,
    tracos: true,
    imagens: true,
    notas: true,
  },
  campos_combate: [],
  rotulo_vida: 'Pontos de Vida',
  dado_padrao: 20,
  descansos: [], // Fase 15 — tipos de descanso configurados pelo mestre
  formula_modificador: '', // Fase 17.3 — fórmula do modificador de atributo ('' = valor puro)
  formula_proficiencia: '', // Fase 19.2 — fórmula da proficiência ('' = sistema sem proficiência)
  // Fase 19.3 — curva de progressão. 'nenhum' = sistema sem XP (subida manual).
  progressao_xp: { modo: 'nenhum', tabela: [], formula: '' },
  // Fase 20.3 — slots são MODO OPCIONAL. Desativado = painel nem aparece.
  slots: {
    ativo: false,
    rotulo: 'Espaços',
    circulo_max: 9,
    preparacao: false,
    cd_formula: '',
    grades: {},      // { "<classe_id>": { "1": [2], "3": [3,2] } }
    recuperacao: {}, // { "<id_descanso>": { modo: "total" | "nada" } }
  },
}

// Mescla config parcial do banco com os defaults, garantindo que nenhuma chave falte
export function mergeConfigLayout(raw) {
  return {
    ...CONFIG_LAYOUT_DEFAULT,
    ...(raw || {}),
    secoes: {
      ...CONFIG_LAYOUT_DEFAULT.secoes,
      ...((raw || {}).secoes || {}),
    },
    campos_combate: (raw || {}).campos_combate || [],
    rotulo_vida: (raw || {}).rotulo_vida || 'Pontos de Vida',
    dado_padrao: (raw || {}).dado_padrao || 20,
    descansos: (raw || {}).descansos || [],
    formula_modificador: (raw || {}).formula_modificador || '',
    formula_proficiencia: (raw || {}).formula_proficiencia || '',
    progressao_xp: {
      ...CONFIG_LAYOUT_DEFAULT.progressao_xp,
      ...((raw || {}).progressao_xp || {}),
    },
    slots: {
      ...CONFIG_LAYOUT_DEFAULT.slots,
      ...((raw || {}).slots || {}),
    },
  }
}
