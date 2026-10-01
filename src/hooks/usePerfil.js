import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

/**
 * Fase 52 — nome e avatar de quem está logado, para o cabeçalho. Uma consulta
 * por conta (fica guardada entre páginas); quem troca o nome avisa com
 * `perfilMudou()` e todo cabeçalho aberto se atualiza.
 */
const cache = new Map() // uid -> { username, avatar_url }
const EVENTO = 'dp-perfil-mudou'

export function perfilMudou(uid, patch) {
  cache.set(uid, { ...(cache.get(uid) || {}), ...patch })
  window.dispatchEvent(new CustomEvent(EVENTO, { detail: uid }))
}

export function usePerfil() {
  const { session } = useAuth()
  const uid = session?.user?.id
  const [perfil, setPerfil] = useState(() => (uid && cache.get(uid)) || null)
  const [uidVisto, setUidVisto] = useState(uid)
  if (uid !== uidVisto) { setUidVisto(uid); setPerfil((uid && cache.get(uid)) || null) }

  useEffect(() => {
    if (!uid) return
    let vivo = true
    if (!cache.has(uid)) {
      supabase.from('profiles').select('username, avatar_url').eq('id', uid).single()
        .then(({ data }) => {
          if (!data) return
          cache.set(uid, data)
          if (vivo) setPerfil(data)
        })
    }
    const mudou = e => { if (e.detail === uid) setPerfil({ ...cache.get(uid) }) }
    window.addEventListener(EVENTO, mudou)
    return () => { vivo = false; window.removeEventListener(EVENTO, mudou) }
  }, [uid])

  return perfil
}

/** Iniciais para o avatar sem foto: "teste.mestre" -> "TM", "Ana" -> "AN". */
export function iniciais(nome) {
  const partes = String(nome || '?').split(/[\s._-]+/).filter(Boolean)
  if (partes.length >= 2) return (partes[0][0] + partes[1][0]).toUpperCase()
  return String(partes[0] || '?').slice(0, 2).toUpperCase()
}
