import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { redimensionarImagem, extensaoDe } from '../lib/imageUtils'
import { normalizarQuadro, normalizarQuadros } from '../lib/cinematica'
import { t } from '../i18n'

/** Grava o quadro `indice` da cinemática em exibição na mesa (upsert por mesa). */
export async function exibirQuadro(mesaId, cinematica, indice) {
  const quadros = normalizarQuadros(cinematica.quadros)
  const quadro = quadros[indice]
  if (!quadro) throw new Error(t('Quadro inexistente.'))
  const { error } = await supabase.from('cinematica_ao_vivo').upsert({
    mesa_id: mesaId, cinematica_id: cinematica.id, quadro, indice, total: quadros.length,
    atualizado_em: new Date().toISOString(),
  }, { onConflict: 'mesa_id' })
  if (error) throw new Error(error.message)
}

export async function encerrarExibicao(mesaId) {
  const { error } = await supabase.from('cinematica_ao_vivo').upsert(
    { mesa_id: mesaId, quadro: null, indice: 0, total: 0, atualizado_em: new Date().toISOString() },
    { onConflict: 'mesa_id' },
  )
  if (error) throw new Error(error.message)
}

/** Gestor: CRUD das cinemáticas da mesa (a RLS só deixa o gestor ler e escrever). */
export function useCinematicas(mesaId) {
  const [cinematicas, setCinematicas] = useState([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!mesaId) return
    let vivo = true
    supabase.from('cinematicas').select('*').eq('mesa_id', mesaId).order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!vivo) return
        setErro(error ? error.message : '')
        setCinematicas(data || [])
        setLoading(false)
      })
    return () => { vivo = false }
  }, [mesaId])

  const salvarLinha = (id, linha) => (id
    ? supabase.from('cinematicas').update(linha).eq('id', id).select().single()
    : supabase.from('cinematicas').insert({ ...linha, mesa_id: mesaId }).select().single())

  async function gravar(id, { titulo, quadros }) {
    const { data, error } = await salvarLinha(id, { titulo: titulo.trim().slice(0, 80), quadros: normalizarQuadros(quadros) })
    if (error) throw new Error(error.message)
    setCinematicas(cs => (id ? cs.map(c => (c.id === id ? data : c)) : [data, ...cs]))
    return data
  }

  const criar = dados => gravar(null, dados)
  const atualizar = (id, dados) => gravar(id, dados)

  async function apagar(id) {
    const { error } = await supabase.from('cinematicas').delete().eq('id', id)
    if (error) throw new Error(error.message)
    setCinematicas(cs => cs.filter(c => c.id !== id))
  }

  /** Imagem do quadro: nome aleatório, balde `fichas-imagens`, até 1600 px. */
  async function enviarImagem(file, usuarioId) {
    const resized = await redimensionarImagem(file, 1600)
    const path = `${usuarioId}/cinematicas/${crypto.randomUUID()}.${extensaoDe(resized)}`
    const { error } = await supabase.storage.from('fichas-imagens').upload(path, resized, { contentType: resized.type })
    if (error) throw new Error(error.message)
    return supabase.storage.from('fichas-imagens').getPublicUrl(path).data.publicUrl
  }

  const exibir = useCallback((cinematica, indice = 0) => exibirQuadro(mesaId, cinematica, indice), [mesaId])
  const encerrar = useCallback(() => encerrarExibicao(mesaId), [mesaId])

  return { cinematicas, loading, erro, criar, atualizar, apagar, enviarImagem, exibir, encerrar }
}

function paraAoVivo(row) {
  const quadro = normalizarQuadro(row?.quadro)
  if (!quadro) return null
  return { quadro, indice: Number(row.indice) || 0, total: Number(row.total) || 1, cinematicaId: row.cinematica_id || null }
}

/** Todo membro: o que está em exibição agora (null = nada). */
export function useCinematicaAoVivo(mesaId) {
  const idCanal = useId().replace(/[^a-zA-Z0-9]/g, '')
  const [aoVivo, setAoVivo] = useState(null)
  const ultimoRef = useRef(0) // atualizado_em mais novo já visto: a leitura inicial atrasada não repõe estado velho

  useEffect(() => {
    if (!mesaId) return
    let vivo = true
    ultimoRef.current = 0
    const aplicar = row => {
      const ts = Date.parse(row?.atualizado_em) || 0
      if (ts < ultimoRef.current) return
      ultimoRef.current = ts
      setAoVivo(paraAoVivo(row))
    }
    supabase.from('cinematica_ao_vivo').select('*').eq('mesa_id', mesaId).maybeSingle()
      .then(({ data }) => { if (vivo) aplicar(data) })
    const canal = supabase
      .channel(`cinematica-${mesaId}-${idCanal}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cinematica_ao_vivo', filter: `mesa_id=eq.${mesaId}` },
        p => (p.eventType === 'DELETE' ? setAoVivo(null) : aplicar(p.new)))
      .subscribe()
    return () => { vivo = false; supabase.removeChannel(canal) }
  }, [mesaId, idCanal])

  return { aoVivo }
}
