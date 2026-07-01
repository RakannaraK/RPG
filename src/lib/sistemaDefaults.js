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
  }
}
