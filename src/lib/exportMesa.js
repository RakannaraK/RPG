/**
 * Fase 45 — a mesa inteira num arquivo .json (puro). "A mesa é sua, não do site":
 * sistema, fichas e tudo que tem `mesa_id` e o RLS deixa quem baixa ver.
 */
import { nomeArquivoFicha } from './fichaPortatil'

export const FORMATO_MESA = { formato: 'rpg-ficha', tipo: 'mesa', versao: 1 }

// o que entra além do sistema e das fichas (cada uma lida inteira, já filtrada pelo RLS)
export const TABELAS_MESA = [
  'membros_mesa', 'sessoes', 'agenda_mesa', 'calendarios_mesa', 'eventos_calendario',
  'relogios_mesa', 'notas_mesa', 'mensagens_mesa', 'verbetes', 'revelacoes_verbete',
  'limites_mesa', 'mapas',
]

// dariam acesso à mesa a quem receber o arquivo
const SEGREDOS_MESA = ['codigo_convite', 'overlay_token']

export function montarArquivoMesa({ mesa, sistema = null, fichas = [], tabelas = {}, exportadoEm = new Date().toISOString() }) {
  const semSegredos = Object.fromEntries(Object.entries(mesa || {}).filter(([k]) => !SEGREDOS_MESA.includes(k)))
  return {
    ...FORMATO_MESA,
    exportado_em: exportadoEm,
    mesa: semSegredos,
    sistema,
    fichas,
    ...Object.fromEntries(TABELAS_MESA.map(t => [t, tabelas[t] || []])),
  }
}

/** "A Torre de Vex" -> "a_torre_de_vex.mesa.json". */
export const nomeArquivoMesa = nome => nomeArquivoFicha(nome || 'mesa').replace(/\.ficha\.json$/, '.mesa.json')
