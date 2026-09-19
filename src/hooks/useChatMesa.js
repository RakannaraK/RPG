import { useState, useEffect, useCallback, useId, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { contarNaoLidas } from '../lib/chatMesa'

// ponytail: mostra as 200 mensagens mais recentes; "carregar anteriores" quando alguém sentir falta
const LIMITE_MENSAGENS = 200
const tabelaAusente = e => e?.code === '42P01' || e?.code === 'PGRST205'
const chaveVisto = mesaId => `chat-visto-${mesaId}`

function lerVisto(mesaId) {
  try { return localStorage.getItem(chaveVisto(mesaId)) } catch { return null }
}

/**
 * Fase 29.2 — chat da mesa ao vivo. Fica na PÁGINA (sempre montado) para a
 * contagem de não lidas funcionar com o painel fechado; o PainelChat recebe o
 * retorno daqui e chama `marcarLidas` enquanto está visível.
 * O "visto até" fica no navegador (por mesa), então sobrevive a recarregar.
 */
export function useChatMesa(mesaId, meuId) {
  const idCanal = useId().replace(/[^a-zA-Z0-9]/g, '') // canal único por instância (ver useMinigames)
  const [mensagens, setMensagens] = useState([]) // mais antiga → mais nova
  const [indisponivel, setIndisponivel] = useState(false)
  const [vistoEm, setVistoEm] = useState(() => lerVisto(mesaId))

  const carregar = useCallback(async () => {
    if (!mesaId) return
    const { data, error } = await supabase
      .from('mensagens_mesa').select('*').eq('mesa_id', mesaId)
      .order('created_at', { ascending: false }).limit(LIMITE_MENSAGENS)
    setIndisponivel(tabelaAusente(error))
    setMensagens(error ? [] : (data || []).reverse())
  }, [mesaId])

  useEffect(() => { carregar() }, [carregar])

  useEffect(() => {
    if (!mesaId) return
    const canal = supabase
      .channel(`chat-${mesaId}-${idCanal}`)
      // O RLS filtra: sussurro só chega para autor e destinatários
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens_mesa', filter: `mesa_id=eq.${mesaId}` }, p => {
        setMensagens(prev => (prev.some(m => m.id === p.new.id) ? prev : [...prev, p.new]))
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'mensagens_mesa' }, p => {
        setMensagens(prev => prev.filter(m => m.id !== p.old?.id))
      })
      .subscribe()
    return () => { supabase.removeChannel(canal) }
  }, [mesaId, idCanal])

  async function enviar(texto, para = null) {
    const { data, error } = await supabase
      .from('mensagens_mesa').insert({ mesa_id: mesaId, texto, para }).select().single()
    if (error) {
      if (tabelaAusente(error)) throw new Error('Chat ainda não ativado neste banco (sql/fase29_chat_notas_calendario.sql).')
      if (error.code === '42501') throw new Error('Sem permissão para falar nesta mesa (arquivada?).')
      throw new Error(error.message)
    }
    setMensagens(prev => (prev.some(m => m.id === data.id) ? prev : [...prev, data]))
  }

  async function apagar(id) {
    const { error } = await supabase.from('mensagens_mesa').delete().eq('id', id)
    if (error) throw new Error(error.message)
    setMensagens(prev => prev.filter(m => m.id !== id))
  }

  const ultima = mensagens.at(-1)?.created_at
  const marcarLidas = useCallback(() => {
    if (!ultima || (vistoEm && Date.parse(vistoEm) >= Date.parse(ultima))) return
    setVistoEm(ultima)
    try { localStorage.setItem(chaveVisto(mesaId), ultima) } catch { /* sem storage: só não lembra */ }
  }, [ultima, vistoEm, mesaId])

  const naoLidas = useMemo(() => contarNaoLidas(mensagens, vistoEm, meuId), [mensagens, vistoEm, meuId])

  return { mensagens, indisponivel, enviar, apagar, naoLidas, marcarLidas }
}
