import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { redimensionarImagem, lerDimensoes } from '../lib/imageUtils'

const BUCKET = 'fichas-imagens'
const MAX_LADO = 4096
const MAX_BYTES = 10 * 1024 * 1024

async function removerArquivo(path) {
  if (!path) return
  try { await supabase.storage.from(BUCKET).remove([path]) } catch { /* best-effort (política de DELETE) */ }
}

/**
 * Fase 26.1 — cenas (mapas) de uma mesa.
 *
 * O RLS decide o que chega: gestor recebe todas as cenas; jogador, só a ATIVA.
 * Mudanças que o RLS esconde do jogador (cena desativada ou apagada) não geram
 * evento de banco para ele — por isso o gestor avisa por broadcast `recarregar`.
 *
 * Falha de carga (tabela ainda não criada) vira `indisponivel`: a página mostra
 * o aviso do SQL e o resto do app segue igual.
 */
export function useMapas(mesaId) {
  const { session } = useAuth()
  const [mapas, setMapas] = useState([])
  const [loading, setLoading] = useState(true)
  const [indisponivel, setIndisponivel] = useState(false)
  const canalRef = useRef(null)

  const fetchAll = useCallback(async () => {
    if (!mesaId) return
    try {
      const { data, error } = await supabase
        .from('mapas')
        .select('*')
        .eq('mesa_id', mesaId)
        .order('ordem', { ascending: true })
        .order('created_at', { ascending: true })
      if (error) throw error
      setMapas(data || [])
      setIndisponivel(false)
    } catch {
      setMapas([])
      setIndisponivel(true)
    } finally {
      setLoading(false)
    }
  }, [mesaId])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Realtime + broadcast; reconexão re-sincroniza.
  useEffect(() => {
    if (!mesaId) return
    let jaConectou = false
    const canal = supabase
      .channel(`mapas-${mesaId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mapas', filter: `mesa_id=eq.${mesaId}` }, () => fetchAll())
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
    }
  }, [mesaId, fetchAll])

  const avisar = () => canalRef.current?.send({ type: 'broadcast', event: 'recarregar', payload: {} })

  /** Envia a imagem (sempre recomprimida, ≤ 4096 px, ≤ 10 MB) e cria a cena. */
  async function criar({ nome, arquivo }) {
    const comprimida = await redimensionarImagem(arquivo, MAX_LADO, true)
    if (comprimida.size > MAX_BYTES) {
      throw new Error('A imagem passa de 10 MB mesmo comprimida. Use uma imagem menor.')
    }
    const { largura, altura } = await lerDimensoes(comprimida)
    const path = `${session.user.id}/mapas/${mesaId}/${Date.now()}.jpg`

    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, comprimida, { contentType: 'image/jpeg' })
    if (upErr) throw upErr
    const { data: url } = supabase.storage.from(BUCKET).getPublicUrl(path)

    const { data, error } = await supabase
      .from('mapas')
      .insert({
        mesa_id: mesaId,
        nome: (nome || '').trim() || arquivo.name.replace(/\.[^.]+$/, ''),
        imagem_url: url.publicUrl,
        imagem_path: path,
        largura,
        altura,
        ordem: mapas.length,
      })
      .select()
      .single()
    if (error) {
      await removerArquivo(path)
      throw error
    }
    setMapas(prev => [...prev, data])
    return data
  }

  /** Mostra a cena aos jogadores (null = nenhuma). Uma ativa por mesa (índice único). */
  async function ativar(mapaId) {
    const { error: e1 } = await supabase.from('mapas').update({ ativo: false }).eq('mesa_id', mesaId).eq('ativo', true)
    if (e1) throw e1
    if (mapaId) {
      const { error: e2 } = await supabase.from('mapas').update({ ativo: true }).eq('id', mapaId)
      if (e2) throw e2
    }
    setMapas(prev => prev.map(m => ({ ...m, ativo: m.id === mapaId })))
    avisar()
  }

  async function atualizar(id, patch) {
    const { error } = await supabase.from('mapas').update(patch).eq('id', id)
    if (error) throw error
    setMapas(prev => prev.map(m => (m.id === id ? { ...m, ...patch } : m)))
  }

  async function remover(mapa) {
    const { error } = await supabase.from('mapas').delete().eq('id', mapa.id)
    if (error) throw error
    setMapas(prev => prev.filter(m => m.id !== mapa.id))
    await removerArquivo(mapa.imagem_path)
    avisar()
  }

  return {
    mapas,
    ativo: mapas.find(m => m.ativo) || null,
    loading, indisponivel,
    criar, ativar, atualizar, remover,
    refetch: fetchAll,
  }
}
