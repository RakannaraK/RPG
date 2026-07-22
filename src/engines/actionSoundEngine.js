// Motor puro de resolução de som de ação (FV.4a). Decide QUAL preset toca —
// não toca nada (sem React/banco/AudioContext). Ver src/audio/actionSynth.js
// para a síntese.
//
// evento    = { tipo: 'ataque'|'dano'|'cura'|'defesa'|'habilidade'|'rolagem',
//               origemId?: string, resultado?: { critico?: boolean, falha?: boolean } }
// configSom = sistemas.config_layout.sons: { mapa: { [origemId]: presetId },
//                                            padroes: { [tipo]: presetId } }
// Sistema sem bloco `sons` (ou com mapa/padroes vazios) ⇒ sempre null —
// retrocompat: tudo mudo como hoje, exceto os sons de dado da F11.

export const PRESET_IDS = Object.freeze([
  'lamina', 'impacto', 'disparo', 'projetil', 'arcano',
  'cura', 'escudo', 'critico', 'falha', 'neutro',
])

/**
 * @param {{tipo?:string, origemId?:string, resultado?:{critico?:boolean, falha?:boolean}}} evento
 * @param {{mapa?:Object, padroes?:Object}|null|undefined} configSom
 * @returns {{presetId:string, intensity:number, layer:('critico'|'falha'|null)}|null}
 */
export function resolveActionSound(evento, configSom) {
  if (!evento || !configSom) return null

  const { tipo, origemId, resultado } = evento
  const mapa = configSom.mapa || {}
  const padroes = configSom.padroes || {}

  // Prioridade: mapeamento específico da origem > padrão do tipo > null.
  let presetId = null
  if (origemId != null && mapa[origemId]) {
    presetId = mapa[origemId]
  } else if (tipo && padroes[tipo]) {
    presetId = padroes[tipo]
  }

  if (!presetId) return null

  // Crítico/falha adicionam a camada correspondente — nunca substituem o preset base.
  let layer = null
  if (resultado?.critico) layer = 'critico'
  else if (resultado?.falha) layer = 'falha'

  return { presetId, intensity: 1, layer }
}
