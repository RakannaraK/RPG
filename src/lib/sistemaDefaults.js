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
  // Fase 24.3 — dots: modo de EXIBIÇÃO de atributos/perícias (o valor continua
  // número em banco/motores/paradas). Override por atributo em atributos.exibicao.
  exibicao_atributos: 'numero', // 'numero' | 'dots'
  maximo_dots: 5,               // até 10; acima do máximo = bolinhas de destaque
  // Fase 24 — trilhas de caixinhas (Vitalidade/FdV/Sanidade/relógios). Vazio =
  // nada aparece. [{ id, nome, tamanho_formula, tipos_marca, regra_transbordo,
  // ao_encher_do_maior, substitui_vida, recuperacao, feed }]
  trilhas: [],
  // Fase 23 — modo de RESOLUÇÃO da rolagem. Ausente/'soma' = comportamento de
  // sempre (retrocompatível byte a byte). Um modo por sistema.
  resolucao: {
    modo: 'soma', // 'soma' | 'sucessos' | 'roll_under' | 'faixas'
    // sucessos:
    dado: 10,
    dificuldade_padrao: 6,
    max_conta_dobrado: false,
    par_de_max_critico: false,
    um_anula_sucesso: false,
    botch: true,
    // roll_under:
    faixas_qualidade: true,
    critico_em: 1,
    desastre_em: 100,
    desastre_faixas: [], // [{ ate_alvo, desastre_em }]
    // faixas:
    notacao_base: '2d6',
    faixas: [], // [{ de, ate, rotulo, texto, cor, opcional }]
    // transversais:
    explosao: { ativo: false },
    rerolagem: { ativo: false, pool_id: null, custo: 1, max_dados: 3 },
    dados_especiais: { ativo: false, nome: '', quantidade_formula: '', marcacoes: [] },
  },
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
    trilhas: (raw || {}).trilhas || [],
    exibicao_atributos: (raw || {}).exibicao_atributos || 'numero',
    maximo_dots: (raw || {}).maximo_dots || 5,
    resolucao: {
      ...CONFIG_LAYOUT_DEFAULT.resolucao,
      ...((raw || {}).resolucao || {}),
      explosao: { ...CONFIG_LAYOUT_DEFAULT.resolucao.explosao, ...((raw || {}).resolucao?.explosao || {}) },
      rerolagem: { ...CONFIG_LAYOUT_DEFAULT.resolucao.rerolagem, ...((raw || {}).resolucao?.rerolagem || {}) },
      dados_especiais: { ...CONFIG_LAYOUT_DEFAULT.resolucao.dados_especiais, ...((raw || {}).resolucao?.dados_especiais || {}) },
    },
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
