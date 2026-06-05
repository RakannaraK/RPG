import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { redimensionarImagem } from '../lib/imageUtils'

export function useImagens(fichaId) {
  const [imagens, setImagens] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchImagens = useCallback(async () => {
    if (!fichaId) return
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('imagens_ficha')
        .select('*')
        .eq('ficha_id', fichaId)
        .order('created_at', { ascending: true })
      if (err) throw err
      setImagens(data || [])
    } catch (err) {
      setError(err.message || 'Erro ao carregar imagens.')
    } finally {
      setLoading(false)
    }
  }, [fichaId])

  useEffect(() => { fetchImagens() }, [fetchImagens])

  async function uploadImagem({ donoId, file, tipo, legenda }) {
    const resized = await redimensionarImagem(file)
    const path = `${donoId}/${fichaId}/${Date.now()}.jpg`

    const { error: uploadErr } = await supabase.storage
      .from('fichas-imagens')
      .upload(path, resized, { contentType: 'image/jpeg' })
    if (uploadErr) throw uploadErr

    const { data: urlData } = supabase.storage
      .from('fichas-imagens')
      .getPublicUrl(path)

    const { data, error: insertErr } = await supabase
      .from('imagens_ficha')
      .insert({
        ficha_id: fichaId,
        url: urlData.publicUrl,
        tipo: tipo || 'outro',
        legenda: legenda || null,
      })
      .select()
      .single()
    if (insertErr) throw insertErr

    await fetchImagens()
    return data
  }

  async function deleteImagem(imagem) {
    const { error: dbErr } = await supabase
      .from('imagens_ficha')
      .delete()
      .eq('id', imagem.id)
    if (dbErr) throw dbErr

    try {
      const url = new URL(imagem.url)
      const match = url.pathname.match(/\/fichas-imagens\/(.+)$/)
      if (match) {
        await supabase.storage.from('fichas-imagens').remove([match[1]])
      }
    } catch { /* remoção do storage é best-effort */ }

    await fetchImagens()
  }

  return { imagens, loading, error, uploadImagem, deleteImagem, refetch: fetchImagens }
}
