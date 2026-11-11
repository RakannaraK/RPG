import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { conteudoInstalado } from '../lib/extensoes'

/** Fase 60 — lê `mesas.extensoes` e grava pela RPC `definir_extensoes` (só mestre/co-mestre). */
export function useExtensoesMesa(mesaId) {
  const [extensoes, setExtensoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!mesaId) return
    let vivo = true
    supabase.from('mesas').select('extensoes').eq('id', mesaId).single().then(({ data, error }) => {
      if (!vivo) return
      if (error) setErro(error.message)
      else setExtensoes(Array.isArray(data?.extensoes) ? data.extensoes : [])
      setLoading(false)
    })
    return () => { vivo = false }
  }, [mesaId])

  const salvar = useCallback(async novaLista => {
    setErro('')
    const { data, error } = await supabase.rpc('definir_extensoes', { p_mesa_id: mesaId, p_extensoes: novaLista })
    if (error) { setErro(error.message); throw new Error(error.message) }
    setExtensoes(Array.isArray(data) ? data : novaLista)
  }, [mesaId])

  const conteudo = useMemo(() => conteudoInstalado(extensoes), [extensoes])
  return { extensoes, conteudo, salvar, loading, erro }
}
