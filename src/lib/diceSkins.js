// Catálogo de skins de dado — dados puros (sem dependência de three.js).
// As propriedades de cor são números hex (0xRRGGBB) consumidos pelo material
// three.js no Dice3D; `corCss` é a versão "#rrggbb" para previews em HTML/CSS.
//
// Mantido livre de imports para que a UI de preferências (11.4) possa importar
// nomes/cores sem puxar o three.js para o bundle.

export const SKINS = {
  padrao: {
    nome: 'Padrão',
    cor: 0x7c3aed, corCss: '#7c3aed',
    metalness: 0.2, roughness: 0.5, opacity: 1.0, emissive: 0x000000,
  },
  madeira: {
    nome: 'Madeira',
    cor: 0x8b5a2b, corCss: '#8b5a2b',
    metalness: 0.0, roughness: 0.9, opacity: 1.0, emissive: 0x000000,
  },
  metal: {
    nome: 'Metal',
    cor: 0xb0b0b8, corCss: '#b0b0b8',
    metalness: 1.0, roughness: 0.25, opacity: 1.0, emissive: 0x000000,
  },
  cristal: {
    nome: 'Cristal',
    cor: 0x88ccee, corCss: '#88ccee',
    metalness: 0.1, roughness: 0.05, opacity: 0.6, emissive: 0x113355,
    transmissivo: true,
  },
  gelo: {
    nome: 'Gelo',
    cor: 0xcdeeff, corCss: '#cdeeff',
    metalness: 0.0, roughness: 0.15, opacity: 0.7, emissive: 0x224455,
    transmissivo: true,
  },
  neon: {
    nome: 'Néon',
    cor: 0x39ff14, corCss: '#39ff14',
    metalness: 0.3, roughness: 0.2, opacity: 1.0, emissive: 0x39ff14,
  },
  eletrico: {
    nome: 'Elétrico',
    cor: 0x33aaff, corCss: '#33aaff',
    metalness: 0.5, roughness: 0.2, opacity: 1.0, emissive: 0x2266ff,
    particulas: 'raios',
  },
}

export const SKIN_PADRAO = 'padrao'

/** Retorna a definição da skin, caindo para 'padrao' se o id for inválido. */
export function getSkin(id) {
  return SKINS[id] || SKINS[SKIN_PADRAO]
}

/** Lista [{ id, ...def }] para iterar em seletores. */
export function listarSkins() {
  return Object.entries(SKINS).map(([id, def]) => ({ id, ...def }))
}
