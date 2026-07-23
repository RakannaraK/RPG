import { supabase } from './supabase'
import { desserializarSistema, montarPayloadImportacao } from '../engines/systemSerializer'

// Importa um sistema (JSON exportado) numa mesa: remapeia os ids (motor puro),
// gera o id do novo sistema, monta o payload e chama a RPC atômica que insere
// tudo numa transação. Retorna o id do novo sistema.
export async function importarSistemaNaMesa(mesaId, json) {
  if (!mesaId) throw new Error('Mesa não informada.')
  if (!json || typeof json !== 'object') throw new Error('Arquivo de sistema inválido.')
  const grafo = desserializarSistema(json)
  const novoSid = crypto.randomUUID()
  const payload = montarPayloadImportacao(grafo, novoSid)
  const { error } = await supabase.rpc('importar_sistema', { p_mesa_id: mesaId, p_payload: payload })
  if (error) throw error
  return novoSid
}
