import { useCallback, useEffect, useId, useState } from 'react'
import { supabase } from '../lib/supabase'
import { JANELA_XCARD_MS, validarLimite } from '../lib/seguranca'

/**
 * Fase 44 — linhas, véus, combinados e X-Card da mesa, em tempo real.
 * Nada é gravado com autor (ver `sql/fase44_seguranca.sql`).
 */
export function useSeguranca(mesaId) {
  const idCanal = useId().replace(/[^a-zA-Z0-9]/g, '')
  const [limites, setLimites] = useState([])
  const [toques, setToques] = useState([])
  const [indisponivel, setIndisponivel] = useState(false)

  const recarregar = useCallback(async () => {
    if (!mesaId) return
    const desde = new Date(Date.now() - JANELA_XCARD_MS).toISOString()
    const [l, x] = await Promise.all([
      supabase.from('limites_mesa').select('*').eq('mesa_id', mesaId),
      supabase.from('xcard_mesa').select('*').eq('mesa_id', mesaId).gte('created_at', desde),
    ])
    if (l.error) { setIndisponivel(true); return }
    setLimites(l.data || [])
    setToques(x.data || [])
  }, [mesaId])

  useEffect(() => {
    recarregar()
    if (!mesaId) return
    const canal = supabase
      .channel(`seguranca-${mesaId}-${idCanal}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'limites_mesa', filter: `mesa_id=eq.${mesaId}` },
        ({ new: n }) => setLimites(ls => ls.some(l => l.id === n.id) ? ls : [...ls, n]))
      // DELETE não aceita filtro: tira pelo id, se for daqui
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'limites_mesa' },
        ({ old: o }) => setLimites(ls => ls.filter(l => l.id !== o?.id)))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'xcard_mesa', filter: `mesa_id=eq.${mesaId}` },
        ({ new: n }) => setToques(ts => ts.some(t => t.id === n.id) ? ts : [...ts, n]))
      .subscribe()
    return () => { supabase.removeChannel(canal) }
  }, [mesaId, idCanal, recarregar])

  async function acrescentar(tipo, texto) {
    const v = validarLimite(tipo, texto)
    if (!v.ok) throw new Error(v.erro)
    const { data, error } = await supabase.from('limites_mesa').insert({ mesa_id: mesaId, tipo, texto: v.texto }).select().single()
    if (error) throw new Error(error.message)
    setLimites(ls => ls.some(l => l.id === data.id) ? ls : [...ls, data])
  }

  async function tirar(id) {
    const { error } = await supabase.from('limites_mesa').delete().eq('id', id)
    if (error) throw new Error(error.message)
    setLimites(ls => ls.filter(l => l.id !== id))
  }

  async function tocarX() {
    const { data, error } = await supabase.from('xcard_mesa').insert({ mesa_id: mesaId }).select().single()
    if (error) throw new Error(error.message)
    setToques(ts => ts.some(t => t.id === data.id) ? ts : [...ts, data])
    return data
  }

  return { limites, toques, indisponivel, acrescentar, tirar, tocarX }
}
