import { supabase } from './supabase'
import { duplicarFicha } from './fichaBanco'
import { nomesDaInvocacao, planejarInvocacao } from './invocacao'

/** Fase 31.2 — invocar criatura: linhas de combatente (e, no boss, fichas próprias). */

/** Campos de combate gravados na ficha da criatura (para sugerir a defesa). */
export async function valoresCombateDaCriatura(fichaId) {
  const { data } = await supabase.from('valores_combate').select('campo_id, valor').eq('ficha_id', fichaId)
  return data || []
}

/**
 * Monta as linhas de combatente. Com `fichaPropria`, duplica a ficha da
 * criatura uma vez por invocado (boss/NPC importante): recursos, habilidades e
 * vida passam a ser dele, sem mexer na criatura do bestiário.
 */
export async function invocarCriatura({ criatura, mesaId, meuId, quantidade = 1, tipo = 'inimigo', vida, defesa, fichaPropria = false, nomesExistentes = [] }) {
  let fichasProprias = null
  if (fichaPropria) {
    const nomes = nomesDaInvocacao(criatura.nome_personagem, quantidade, nomesExistentes)
    fichasProprias = []
    for (const nome of nomes) {
      fichasProprias.push(await duplicarFicha(criatura.id, { mesaId, donoId: meuId, nome, extras: { origem_id: criatura.id } }))
    }
  }
  return planejarInvocacao({ criatura, quantidade, tipo, vida, defesa, nomesExistentes, fichasProprias })
}
