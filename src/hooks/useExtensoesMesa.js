import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { conteudoInstalado, validarPacote } from '../lib/extensoes'

/** Fase 62 — instala um pacote (validado aqui) na mesa, sem o hook montado. O servidor trava a mesa e exige mestre/co-mestre. */
export async function instalarNaMesa(mesaId, pacoteBruto) {
  const v = validarPacote(pacoteBruto)
  if (!v.ok) throw new Error(v.erros[0])
  const { error } = await supabase.rpc('instalar_extensao', { p_mesa_id: mesaId, p_item: v.pacote })
  if (error) throw new Error(error.message)
}

/** Fase 60 — lê `mesas.extensoes` e instala/remove pelas RPCs do servidor (só mestre/co-mestre). */
export function useExtensoesMesa(mesaId) {
  const [extensoes, setExtensoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const gravou = useRef(false) // uma RPC já respondeu: a leitura inicial atrasada não pode repor a lista velha

  useEffect(() => {
    if (!mesaId) return
    let vivo = true
    supabase.from('mesas').select('extensoes').eq('id', mesaId).single().then(({ data, error }) => {
      if (!vivo) return
      if (error) setErro('Não consegui ler as extensões da mesa.')
      else if (!gravou.current) setExtensoes(Array.isArray(data?.extensoes) ? data.extensoes : [])
      setLoading(false)
    })
    return () => { vivo = false }
  }, [mesaId])

  const chamar = useCallback(async (rpc, args) => {
    setErro('')
    const { data, error } = await supabase.rpc(rpc, { p_mesa_id: mesaId, ...args })
    if (error) { setErro(error.message); throw new Error(error.message) }
    if (Array.isArray(data)) { gravou.current = true; setExtensoes(data) }
  }, [mesaId])
  const instalar = useCallback(item => chamar('instalar_extensao', { p_item: item }), [chamar])
  const remover = useCallback(id => chamar('remover_extensao', { p_id: id }), [chamar])

  const conteudo = useMemo(() => conteudoInstalado(extensoes), [extensoes])
  return { extensoes, conteudo, instalar, remover, loading, erro }
}
