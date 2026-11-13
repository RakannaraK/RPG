import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { conteudoInstalado, instalar, validarPacote } from '../lib/extensoes'

/** Fase 61 — instala um pacote (validado aqui) na mesa, sem o hook montado. Só mestre/co-mestre (a RPC recusa o resto). */
export async function instalarNaMesa(mesaId, pacoteBruto) {
  const v = validarPacote(pacoteBruto)
  if (!v.ok) throw new Error(v.erros[0])
  // ponytail: ler-alterar-gravar pode perder uma instalação se dois gestores gravarem ao mesmo tempo; a saída é uma RPC que acrescenta no servidor
  const { data, error } = await supabase.from('mesas').select('extensoes').eq('id', mesaId).single()
  if (error) throw new Error('Não consegui ler as extensões da mesa.')
  const atual = Array.isArray(data?.extensoes) ? data.extensoes : []
  const nova = instalar(atual, v.pacote)
  if (nova === atual) throw new Error('Não foi possível instalar (limite de extensões da mesa ou id reservado).')
  const { error: e2 } = await supabase.rpc('definir_extensoes', { p_mesa_id: mesaId, p_extensoes: nova })
  if (e2) throw new Error(e2.message)
}

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
      if (error) setErro('Não consegui ler as extensões da mesa.')
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
