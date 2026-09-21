import { useState, useEffect, useCallback, useRef, useId } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const CORES_USUARIO = ['#A78BFA', '#60A5FA', '#34D399', '#FBBF24', '#FB7185', '#22D3EE', '#818CF8', '#2DD4BF']
const INTERVALO_REGUA_MS = 66
const VIDA_PING_MS = 2000
const VIDA_REGUA_REMOTA_MS = 3000

/** Cor fixa por pessoa (régua e ping), a partir do id. */
export function corDoUsuario(id) {
  let h = 0
  for (let i = 0; i < (id || '').length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return CORES_USUARIO[h % CORES_USUARIO.length]
}

/**
 * Fase 26.4 — desenhos da cena (banco) + régua e ping (só broadcast, nada gravado).
 * O RLS decide quem desenha/apaga; aqui só refletimos o resultado.
 */
export function useDesenhosMapa(mapaId) {
  // Nome de canal único por instância: com o mesmo nome o supabase-js devolve o
  // canal já existente e o segundo `.on()` estoura (F34: Escudo + banner na mesma tela).
  const idCanal = useId().replace(/[^a-zA-Z0-9]/g, '')
  const { session } = useAuth()
  const meuId = session?.user?.id
  const [desenhos, setDesenhos] = useState([])
  const [reguas, setReguas] = useState({}) // autorId → { a, b, cor }
  const [pings, setPings] = useState([])   // { id, x, y, cor }
  const canalRef = useRef(null)
  const ultimoEnvioRef = useRef(0)

  const fetchAll = useCallback(async () => {
    if (!mapaId) { setDesenhos([]); return }
    const { data, error } = await supabase
      .from('desenhos_mapa')
      .select('*')
      .eq('mapa_id', mapaId)
      .order('created_at', { ascending: true })
    if (!error) setDesenhos(data || [])
  }, [mapaId])

  useEffect(() => { fetchAll() }, [fetchAll])

  const mostrarPing = useCallback((x, y, cor) => {
    const id = crypto.randomUUID()
    setPings(prev => [...prev, { id, x, y, cor }])
    setTimeout(() => setPings(prev => prev.filter(p => p.id !== id)), VIDA_PING_MS)
  }, [])

  useEffect(() => {
    if (!mapaId) return
    let jaConectou = false
    const tirarRegua = autor => setReguas(prev => {
      if (!(autor in prev)) return prev
      const novo = { ...prev }
      delete novo[autor]
      return novo
    })
    const canal = supabase
      .channel(`desenhos-${mapaId}-${idCanal}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'desenhos_mapa', filter: `mapa_id=eq.${mapaId}` }, p => {
        setDesenhos(prev => (prev.some(d => d.id === p.new.id) ? prev : [...prev, p.new]))
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'desenhos_mapa' }, p => {
        setDesenhos(prev => prev.filter(d => d.id !== p.old?.id))
      })
      .on('broadcast', { event: 'regua' }, ({ payload }) => {
        const marca = Date.now()
        setReguas(prev => ({ ...prev, [payload.autor]: { a: payload.a, b: payload.b, cor: payload.cor, marca } }))
        // Régua de quem caiu da conexão não fica presa na tela
        setTimeout(() => setReguas(prev => {
          if (prev[payload.autor]?.marca !== marca) return prev
          const novo = { ...prev }
          delete novo[payload.autor]
          return novo
        }), VIDA_REGUA_REMOTA_MS)
      })
      .on('broadcast', { event: 'regua_fim' }, ({ payload }) => tirarRegua(payload.autor))
      .on('broadcast', { event: 'ping' }, ({ payload }) => mostrarPing(payload.x, payload.y, payload.cor))
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
      setReguas({})
    }
  }, [mapaId, fetchAll, mostrarPing])

  const enviar = (event, payload) => canalRef.current?.send({ type: 'broadcast', event, payload })
  const minhaCor = corDoUsuario(meuId)

  async function desenhar({ forma, pontos, cor, espessura }) {
    const { data, error } = await supabase
      .from('desenhos_mapa')
      .insert({ mapa_id: mapaId, forma, pontos, cor, espessura })
      .select()
      .single()
    if (error) throw error
    setDesenhos(prev => (prev.some(d => d.id === data.id) ? prev : [...prev, data]))
  }

  async function apagar(id) {
    const { data, error } = await supabase.from('desenhos_mapa').delete().eq('id', id).select('id')
    if (error) throw error
    if (!data?.length) throw new Error('Você só pode apagar os seus desenhos.')
    setDesenhos(prev => prev.filter(d => d.id !== id))
  }

  /** Apaga os meus desenhos da cena (ou todos, se `todos` e o RLS deixar). */
  async function limpar(todos = false) {
    let q = supabase.from('desenhos_mapa').delete().eq('mapa_id', mapaId)
    if (!todos) q = q.eq('autor_id', meuId)
    const { error } = await q
    if (error) throw error
    await fetchAll()
  }

  function medir(a, b) {
    setReguas(prev => ({ ...prev, [meuId]: { a, b, cor: minhaCor } }))
    const agora = Date.now()
    if (agora - ultimoEnvioRef.current < INTERVALO_REGUA_MS) return
    ultimoEnvioRef.current = agora
    enviar('regua', { autor: meuId, a, b, cor: minhaCor })
  }

  function encerrarRegua() {
    setReguas(prev => {
      const novo = { ...prev }
      delete novo[meuId]
      return novo
    })
    enviar('regua_fim', { autor: meuId })
  }

  function pingar(x, y) {
    mostrarPing(x, y, minhaCor)
    enviar('ping', { x, y, cor: minhaCor })
  }

  return { desenhos, reguas, pings, meuId, desenhar, apagar, limpar, medir, encerrarRegua, pingar }
}
