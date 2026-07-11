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
  // Fase 20.6 — rótulo do painel de poderes na ficha (o mestre nomeia)
  poderes_rotulo: 'Poderes',
  // Fase 21.6 — moedas / economia. Desativada = sem carteira na ficha.
  moedas: { ativo: false, denominacoes: [] }, // [{ id, nome, sigla, valor }]
  // Fase 22.5 — defesa ativa (rolagem oposta no combate). Opcional.
  defesa_ativa: {
    ativo: false,
    opcoes: [],   // [{ id, nome, notacao }]
    faixas: [],   // [{ de, ate, reducao_percentual, rotulo }]
    contra_ataque: {
      sofre_dano_cheio: true,
      efeito_no_atacante: 'condicao',
      condicao: { nome: 'Exposto', duracao_rodadas: 1, descricao: '' },
    },
  },
  // Fase 22.3 — crítico configurável. Limiar por fórmula (var `maestria`).
  critico: {
    ativo: false,
    aplica_em: 'acerto',
    limiar_formula: '',          // ex: "max(25, 85 - 15 * piso(maestria / 2))" ou "20"
    multiplicador_padrao: 2,
    modo_multiplicador: 'total', // 'total' (dobra tudo) | 'dados' (só os dados)
  },
  // Fase 22.1 — distribuição de pontos de status (point-buy). EXCLUDENTE com a
  // rolagem de atributo (F3). Desativado = fluxo de atributos normal.
  pontos_status: {
    ativo: false,
    rotulo: 'Pontos de Status',
    inicial_por_raca: false,
    inicial: '16',
    ganho_por_nivel: '1d6 + 10',
    custo_por_ponto: 1,
    maximo_por_atributo: null,
  },
  // Fase 21.1 — maestria por uso. Desativada = nada aparece na ficha.
  maestria: {
    ativo: false,
    escopo: 'categoria',                 // 'categoria' | 'item' (escolha única do sistema)
    curva: { modo: 'formula', formula: '100 * proximo_nivel', tabela: [] },
    bonus_por_nivel: { acerto_percentual: 0, efeito_percentual: 0 }, // aplicados via F18
    ganhos_padrao: [],                   // [{ rotulo, xp }] — botões de um clique
  },
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
    poderes_rotulo: (raw || {}).poderes_rotulo || 'Poderes',
    moedas: { ...CONFIG_LAYOUT_DEFAULT.moedas, ...((raw || {}).moedas || {}) },
    pontos_status: { ...CONFIG_LAYOUT_DEFAULT.pontos_status, ...((raw || {}).pontos_status || {}) },
    critico: { ...CONFIG_LAYOUT_DEFAULT.critico, ...((raw || {}).critico || {}) },
    defesa_ativa: {
      ...CONFIG_LAYOUT_DEFAULT.defesa_ativa,
      ...((raw || {}).defesa_ativa || {}),
      contra_ataque: { ...CONFIG_LAYOUT_DEFAULT.defesa_ativa.contra_ataque, ...((raw || {}).defesa_ativa?.contra_ataque || {}) },
    },
    maestria: {
      ...CONFIG_LAYOUT_DEFAULT.maestria,
      ...((raw || {}).maestria || {}),
      curva: { ...CONFIG_LAYOUT_DEFAULT.maestria.curva, ...((raw || {}).maestria?.curva || {}) },
      bonus_por_nivel: { ...CONFIG_LAYOUT_DEFAULT.maestria.bonus_por_nivel, ...((raw || {}).maestria?.bonus_por_nivel || {}) },
    },
  }
}
