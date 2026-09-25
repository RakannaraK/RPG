import { useCallback, useEffect, useId, useState } from 'react'
import { supabase } from '../lib/supabase'
import { redimensionarImagem } from '../lib/imageUtils'

/**
 * Fases 41/42 — enciclopédia da mesa.
 * Quem gere lê a tabela inteira (com o segredo). Quem joga NUNCA lê a tabela:
 * chama `verbetes_visiveis`, que devolve só os campos já revelados.
 * Sem o SQL (`sql/fase41_enciclopedia.sql`), `indisponivel` fica true.
 */
export function useEnciclopedia(mesaId, isGestor) {
  const idCanal = useId().replace(/[^a-zA-Z0-9]/g, '')
  const [verbetes, setVerbetes] = useState([])
  const [revelacoes, setRevelacoes] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [indisponivel, setIndisponivel] = useState(false)

  const recarregar = useCallback(async () => {
    if (!mesaId) return
    const [v, r] = isGestor
      ? await Promise.all([
        supabase.from('verbetes').select('*').eq('mesa_id', mesaId),
        supabase.from('revelacoes_verbete').select('*').eq('mesa_id', mesaId),
      ])
      : [await supabase.rpc('verbetes_visiveis', { p_mesa_id: mesaId }), { data: [] }]
    setCarregando(false)
    if (v.error) { setIndisponivel(true); return }
    setIndisponivel(false)
    setVerbetes(v.data || [])
    setRevelacoes(r.data || [])
  }, [mesaId, isGestor])

  useEffect(() => {
    recarregar()
    if (!mesaId) return
    // ponytail: o jogador só é avisado de revelações (a RLS não deixa o realtime
    // de `verbetes` chegar a ele); texto editado depois aparece ao reabrir a aba.
    const canal = supabase
      .channel(`enciclopedia-${mesaId}-${idCanal}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'revelacoes_verbete', filter: `mesa_id=eq.${mesaId}` }, () => recarregar())
      // DELETE não aceita filtro: "esconder de novo" em qualquer mesa recarrega
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'revelacoes_verbete' }, () => recarregar())
    if (isGestor) {
      canal.on('postgres_changes', { event: '*', schema: 'public', table: 'verbetes', filter: `mesa_id=eq.${mesaId}` }, () => recarregar())
    }
    canal.subscribe()
    return () => { supabase.removeChannel(canal) }
  }, [mesaId, isGestor, idCanal, recarregar])

  async function salvar(id, linha) {
    const { data, error } = id
      ? await supabase.from('verbetes').update(linha).eq('id', id).select().single()
      : await supabase.from('verbetes').insert({ ...linha, mesa_id: mesaId }).select().single()
    if (error) throw new Error(error.message)
    setVerbetes(vs => [...vs.filter(v => v.id !== data.id), data])
    return data
  }

  async function remover(id) {
    const { error } = await supabase.from('verbetes').delete().eq('id', id)
    if (error) throw new Error(error.message)
    setVerbetes(vs => vs.filter(v => v.id !== id))
  }

  /** Revela campos a jogadores (lista vazia = mesa toda) e avisa pelo sininho. */
  async function entregar(verbeteId, usuarios, campos, avisar = true) {
    const { data, error } = await supabase.rpc('entregar_verbete', {
      p_verbete_id: verbeteId, p_usuarios: usuarios, p_campos: campos, p_avisar: avisar,
    })
    if (error) throw new Error(error.message)
    await recarregar()
    return data
  }

  /** Desfaz uma revelação (usuarioId null = a revelação à mesa toda). */
  async function esconder(verbeteId, usuarioId, campo) {
    let q = supabase.from('revelacoes_verbete').delete().eq('verbete_id', verbeteId).eq('campo', campo)
    q = usuarioId ? q.eq('usuario_id', usuarioId) : q.is('usuario_id', null)
    const { error } = await q
    if (error) throw new Error(error.message)
    await recarregar()
  }

  /** Imagem do verbete: nome aleatório, para a URL pública não ser adivinhável antes da revelação. */
  async function enviarImagem(file, usuarioId) {
    const resized = await redimensionarImagem(file)
    const path = `${usuarioId}/verbetes/${crypto.randomUUID()}.jpg`
    const { error } = await supabase.storage.from('fichas-imagens').upload(path, resized, { contentType: 'image/jpeg' })
    if (error) throw new Error(error.message)
    return supabase.storage.from('fichas-imagens').getPublicUrl(path).data.publicUrl
  }

  return { verbetes, revelacoes, carregando, indisponivel, recarregar, salvar, remover, entregar, esconder, enviarImagem }
}
