import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Fase 49 — itens no baú da mesa (itens_ficha com bau_mesa_id) e as três
 * mudanças de lugar, que passam pelas funções do banco (sql/fase49_bau.sql).
 */
export function useBau(mesaId) {
  const idCanal = useId().replace(/[^a-zA-Z0-9]/g, '')
  const [itens, setItens] = useState([])
  const [indisponivel, setIndisponivel] = useState(false)
  const idsRef = useRef(new Set())

  const recarregar = useCallback(async () => {
    if (!mesaId) return
    const { data, error } = await supabase.from('itens_ficha').select('*').eq('bau_mesa_id', mesaId).order('created_at')
    if (error) { setIndisponivel(true); return }
    idsRef.current = new Set((data || []).map(i => i.id))
    setItens(data || [])
  }, [mesaId])

  useEffect(() => {
    recarregar()
    if (!mesaId) return
    // sem filtro: o item que SAI do baú chega com bau_mesa_id vazio
    const canal = supabase.channel(`bau-${mesaId}-${idCanal}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'itens_ficha' }, ({ new: n, old: o }) => {
        if (n?.bau_mesa_id === mesaId || idsRef.current.has(n?.id) || idsRef.current.has(o?.id)) recarregar()
      })
      .subscribe()
    return () => { supabase.removeChannel(canal) }
  }, [mesaId, idCanal, recarregar])

  async function rpc(nome, args) {
    const { error } = await supabase.rpc(nome, args)
    if (error) throw new Error(error.message)
    await recarregar()
  }

  return {
    itens, indisponivel, recarregar,
    guardar: itemId => rpc('guardar_no_bau', { p_item_id: itemId }),
    pegar: (itemId, fichaId) => rpc('pegar_do_bau', { p_item_id: itemId, p_ficha_id: fichaId }),
    dar: (itemId, fichaId) => rpc('dar_item', { p_item_id: itemId, p_ficha_destino: fichaId }),
    porSaque: async linha => {
      const { error } = await supabase.from('itens_ficha').insert({ ...linha, bau_mesa_id: mesaId })
      if (error) throw new Error(error.message)
      await recarregar()
    },
    tirar: async id => {
      const { error } = await supabase.from('itens_ficha').delete().eq('id', id)
      if (error) throw new Error(error.message)
      await recarregar()
    },
  }
}
