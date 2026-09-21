import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { normalizarEtiquetas, validarPublicacao } from '../lib/comunidade'

const tabelaAusente = e => e?.code === '42P01' || e?.code === 'PGRST205'
const LIMITE = 100 // ponytail: a vitrine mostra as 100 mais recentes; paginar quando encher

/**
 * Fase 36 — vitrine da comunidade. Publicar manda o ARQUIVO PORTÁTIL (F30/B2),
 * nunca a ficha ao vivo. Curtida é uma por pessoa; denúncia esconde no banco.
 */
export function useComunidade() {
  const { session } = useAuth()
  const meuId = session?.user?.id || null
  const [publicacoes, setPublicacoes] = useState([])
  const [minhasCurtidas, setMinhasCurtidas] = useState([])
  const [indisponivel, setIndisponivel] = useState(false)
  const [carregando, setCarregando] = useState(true)

  const carregar = useCallback(async () => {
    setCarregando(true)
    const [pubs, curtidas] = await Promise.all([
      supabase.from('publicacoes').select('*, autor:autor_id (username)').order('created_at', { ascending: false }).limit(LIMITE),
      meuId ? supabase.from('curtidas_publicacao').select('publicacao_id').eq('usuario_id', meuId) : Promise.resolve({ data: [] }),
    ])
    setIndisponivel(tabelaAusente(pubs.error))
    setPublicacoes((pubs.data || []).map(p => ({ ...p, autor: p.autor?.username || 'alguém' })))
    setMinhasCurtidas((curtidas.data || []).map(c => c.publicacao_id))
    setCarregando(false)
  }, [meuId])

  useEffect(() => { carregar() }, [carregar])

  async function publicar({ tipo, titulo, descricao, etiquetas, conteudo, imagem_url, creditos }) {
    const dados = {
      tipo,
      titulo: String(titulo || '').trim(),
      descricao: String(descricao || '').trim() || null,
      etiquetas: normalizarEtiquetas(etiquetas),
      conteudo: tipo === 'arte' ? null : conteudo || null,
      imagem_url: String(imagem_url || '').trim() || null,
      creditos: String(creditos || '').trim() || null,
    }
    const checagem = validarPublicacao(dados)
    if (!checagem.ok) throw new Error(checagem.erro)
    const { data, error } = await supabase.from('publicacoes').insert(dados).select('*').single()
    if (error) throw new Error(tabelaAusente(error) ? 'Comunidade ainda não ativada neste banco (sql/fase36_comunidade.sql).' : error.message)
    setPublicacoes(prev => [{ ...data, autor: 'você' }, ...prev])
    return data
  }

  async function curtir(publicacaoId) {
    const jaCurti = minhasCurtidas.includes(publicacaoId)
    setMinhasCurtidas(prev => (jaCurti ? prev.filter(id => id !== publicacaoId) : [...prev, publicacaoId]))
    setPublicacoes(prev => prev.map(p => (p.id === publicacaoId ? { ...p, curtidas: Math.max(0, (p.curtidas || 0) + (jaCurti ? -1 : 1)) } : p)))
    const { error } = jaCurti
      ? await supabase.from('curtidas_publicacao').delete().eq('publicacao_id', publicacaoId).eq('usuario_id', meuId)
      : await supabase.from('curtidas_publicacao').insert({ publicacao_id: publicacaoId })
    if (error) { await carregar(); throw new Error(error.message) }
  }

  async function denunciar(publicacaoId, motivo) {
    const { error } = await supabase.from('denuncias_publicacao').insert({ publicacao_id: publicacaoId, motivo: motivo?.trim() || null })
    if (error) throw new Error(error.code === '23505' ? 'Você já denunciou esta publicação.' : error.message)
    await carregar() // pode ter sido escondida na hora (3 denúncias)
  }

  async function apagar(publicacaoId) {
    const { error } = await supabase.from('publicacoes').delete().eq('id', publicacaoId)
    if (error) throw new Error(error.message)
    setPublicacoes(prev => prev.filter(p => p.id !== publicacaoId))
  }

  return { publicacoes, minhasCurtidas, meuId, indisponivel, carregando, publicar, curtir, denunciar, apagar, recarregar: carregar }
}
