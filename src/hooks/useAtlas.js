import { useCallback, useEffect, useId, useState } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Fase 48 — mapas do atlas e seus pinos. A RLS já filtra o que o jogador vê
 * (mapa visível + pino de verbete revelado a ele); aqui é só ler e ouvir.
 * Sem o SQL (`sql/fase48_atlas.sql`), `indisponivel` fica true.
 */
export function useAtlas(mesaId) {
  const idCanal = useId().replace(/[^a-zA-Z0-9]/g, '')
  const [mapas, setMapas] = useState([])
  const [pinos, setPinos] = useState([])
  const [indisponivel, setIndisponivel] = useState(false)

  const recarregar = useCallback(async () => {
    if (!mesaId) return
    const [m, p] = await Promise.all([
      supabase.from('atlas_mesa').select('*').eq('mesa_id', mesaId).order('created_at'),
      supabase.from('pinos_atlas').select('*').eq('mesa_id', mesaId),
    ])
    if (m.error) { setIndisponivel(true); return }
    setMapas(m.data || [])
    setPinos(p.data || [])
  }, [mesaId])

  useEffect(() => {
    recarregar()
    if (!mesaId) return
    const filtro = `mesa_id=eq.${mesaId}`
    const canal = supabase.channel(`atlas-${mesaId}-${idCanal}`)
    for (const tabela of ['atlas_mesa', 'pinos_atlas', 'revelacoes_verbete']) {
      // revelação nova pode fazer um pino aparecer para o jogador
      canal.on('postgres_changes', { event: 'INSERT', schema: 'public', table: tabela, filter: filtro }, () => recarregar())
      canal.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: tabela, filter: filtro }, () => recarregar())
      // DELETE não aceita filtro
      canal.on('postgres_changes', { event: 'DELETE', schema: 'public', table: tabela }, () => recarregar())
    }
    canal.subscribe()
    return () => { supabase.removeChannel(canal) }
  }, [mesaId, idCanal, recarregar])

  async function executar(consulta) {
    const { data, error } = await consulta
    if (error) throw new Error(error.message)
    await recarregar()
    return data
  }

  return {
    mapas, pinos, indisponivel,
    criar: linha => executar(supabase.from('atlas_mesa').insert({ ...linha, mesa_id: mesaId }).select().single()),
    atualizar: (id, patch) => executar(supabase.from('atlas_mesa').update(patch).eq('id', id)),
    remover: id => executar(supabase.from('atlas_mesa').delete().eq('id', id)),
    porPino: (atlasId, verbeteId, { x, y }) => executar(supabase.from('pinos_atlas').insert({ atlas_id: atlasId, verbete_id: verbeteId, x, y })),
    moverPino: (id, { x, y }) => executar(supabase.from('pinos_atlas').update({ x, y }).eq('id', id)),
    tirarPino: id => executar(supabase.from('pinos_atlas').delete().eq('id', id)),
  }
}
