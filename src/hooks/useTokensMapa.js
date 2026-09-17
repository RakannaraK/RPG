import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { caminhoNoBucket, redimensionarImagem } from '../lib/imageUtils'

const INTERVALO_ARRASTE_MS = 66 // ~15 posições/s durante o arraste

/**
 * Fase 26.2 — tokens de uma cena.
 *
 * Estado persistente vem do banco (postgres_changes). O arraste em andamento é
 * EFÊMERO: vai por broadcast (`arraste`) e nunca ao banco; só a posição final é
 * gravada, e depois anunciada (`soltou`) para ninguém ficar com posição velha.
 *
 * O RLS esconde tokens ocultos do jogador — e com isso também o evento de
 * UPDATE que os oculta. Quem oculta avisa por broadcast `recarregar`.
 * DELETE chega a todos (o Realtime não aplica RLS em DELETE).
 */
export function useTokensMapa(mapaId, mesaId) {
  const { session } = useAuth()
  const [tokens, setTokens] = useState([])
  const [remotos, setRemotos] = useState({}) // id → {x, y} arrastado por outra pessoa agora
  const canalRef = useRef(null)
  const ultimoEnvioRef = useRef(0)

  const fetchAll = useCallback(async () => {
    if (!mapaId) { setTokens([]); return }
    const { data, error } = await supabase
      .from('tokens_mapa')
      .select('*')
      .eq('mapa_id', mapaId)
      .order('created_at', { ascending: true })
    if (!error) setTokens(data || [])
  }, [mapaId])

  useEffect(() => { fetchAll() }, [fetchAll])

  useEffect(() => {
    if (!mapaId) return
    let jaConectou = false
    const upsert = row => setTokens(prev => (
      prev.some(t => t.id === row.id) ? prev.map(t => (t.id === row.id ? row : t)) : [...prev, row]
    ))
    const esquecerRemoto = id => setRemotos(prev => {
      if (!(id in prev)) return prev
      const novo = { ...prev }
      delete novo[id]
      return novo
    })
    const filtro = { schema: 'public', table: 'tokens_mapa', filter: `mapa_id=eq.${mapaId}` }
    const canal = supabase
      .channel(`tokens-${mapaId}`)
      .on('postgres_changes', { event: 'INSERT', ...filtro }, p => upsert(p.new))
      .on('postgres_changes', { event: 'UPDATE', ...filtro }, p => { upsert(p.new); esquecerRemoto(p.new.id) })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'tokens_mapa' }, p => {
        setTokens(prev => prev.filter(t => t.id !== p.old?.id))
      })
      .on('broadcast', { event: 'arraste' }, ({ payload }) => {
        setRemotos(prev => ({ ...prev, [payload.id]: { x: payload.x, y: payload.y } }))
      })
      .on('broadcast', { event: 'soltou' }, ({ payload }) => {
        esquecerRemoto(payload.id)
        setTokens(prev => prev.map(t => (t.id === payload.id ? { ...t, x: payload.x, y: payload.y } : t)))
      })
      .on('broadcast', { event: 'recarregar' }, () => fetchAll())
      .subscribe(status => {
        if (status === 'SUBSCRIBED') {
          if (jaConectou) fetchAll()
          jaConectou = true
        }
      })
    canalRef.current = canal
    return () => {
      canalRef.current = null
      supabase.removeChannel(canal)
      setRemotos({})
    }
  }, [mapaId, fetchAll])

  const enviar = (event, payload) => canalRef.current?.send({ type: 'broadcast', event, payload })

  /** Posição durante o arraste — só broadcast, limitado a ~15/s. */
  function arrastar(id, x, y) {
    const agora = Date.now()
    if (agora - ultimoEnvioRef.current < INTERVALO_ARRASTE_MS) return
    ultimoEnvioRef.current = agora
    enviar('arraste', { id, x, y })
  }

  /** Grava a posição final. Sem permissão (RLS → 0 linhas) volta ao lugar. */
  async function mover(id, x, y) {
    const anterior = tokens.find(t => t.id === id)
    setTokens(prev => prev.map(t => (t.id === id ? { ...t, x, y } : t)))
    const { data, error } = await supabase.from('tokens_mapa').update({ x, y }).eq('id', id).select('id')
    if (error || !data?.length) {
      if (anterior) {
        setTokens(prev => prev.map(t => (t.id === id ? { ...t, x: anterior.x, y: anterior.y } : t)))
        enviar('soltou', { id, x: anterior.x, y: anterior.y })
      }
      return false
    }
    enviar('soltou', { id, x, y })
    return true
  }

  async function adicionar(lista) {
    if (!mapaId || !lista?.length) return []
    const { data, error } = await supabase
      .from('tokens_mapa')
      .insert(lista.map(t => ({ ...t, mapa_id: mapaId })))
      .select()
    if (error) throw error
    setTokens(prev => [...prev, ...(data || []).filter(n => !prev.some(t => t.id === n.id))])
    return data
  }

  async function atualizar(id, patch) {
    setTokens(prev => prev.map(t => (t.id === id ? { ...t, ...patch } : t)))
    const { error } = await supabase.from('tokens_mapa').update(patch).eq('id', id)
    if (error) { await fetchAll(); throw error }
    if ('oculto' in patch) enviar('recarregar', {})
  }

  async function remover(id) {
    const token = tokens.find(t => t.id === id)
    setTokens(prev => prev.filter(t => t.id !== id))
    const { error } = await supabase.from('tokens_mapa').delete().eq('id', id)
    if (error) { await fetchAll(); throw error }
    // Imagem enviada para token avulso (26.2) não fica órfã no Storage.
    // Imagem de ficha não é tocada: só a pasta /tokens/.
    const path = token?.imagem_url ? caminhoNoBucket(token.imagem_url) : null
    if (path?.includes('/tokens/')) {
      try { await supabase.storage.from('fichas-imagens').remove([path]) } catch { /* best-effort */ }
    }
  }

  /** Imagem de token avulso: ≤ 512 px, sempre recomprimida. Devolve a URL pública. */
  async function enviarImagem(arquivo) {
    const comprimida = await redimensionarImagem(arquivo, 512, true)
    const path = `${session.user.id}/tokens/${mesaId}/${Date.now()}.jpg`
    const { error } = await supabase.storage.from('fichas-imagens').upload(path, comprimida, { contentType: 'image/jpeg' })
    if (error) throw error
    return supabase.storage.from('fichas-imagens').getPublicUrl(path).data.publicUrl
  }

  return { tokens, remotos, arrastar, mover, adicionar, atualizar, remover, enviarImagem }
}
