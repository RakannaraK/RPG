import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { textoVagas, validarAnuncio } from '../../lib/mesasAbertas'
import Botao from '../ui/Botao'
import Ilustra from '../arte/Ilustra'

const CAMPO = 'px-3 py-2 rounded-lg bg-void border border-border text-ink text-sm placeholder:text-ink-dim focus:outline-none focus:ring-1 focus:ring-accent-500'

/**
 * Fase 51 — (só quem gere) anunciar a mesa na Comunidade e responder os pedidos
 * de vaga. O código de convite nunca vai para a vitrine.
 */
export default function AnuncioMesa({ mesaId }) {
  const [anuncio, setAnuncio] = useState(undefined) // undefined = carregando, null = sem anúncio
  const [pedidos, setPedidos] = useState([])
  const [editando, setEditando] = useState(null)
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState('')
  const [indisponivel, setIndisponivel] = useState(false)

  const recarregar = useCallback(async () => {
    const [a, p] = await Promise.all([
      supabase.from('anuncios_mesa').select('*').eq('mesa_id', mesaId).maybeSingle(),
      supabase.from('pedidos_mesa').select('*').eq('mesa_id', mesaId).eq('status', 'pendente').order('created_at'),
    ])
    if (a.error) { setIndisponivel(true); return }
    setAnuncio(a.data)
    setPedidos(p.data || [])
  }, [mesaId])

  useEffect(() => { recarregar() }, [recarregar])

  if (indisponivel || anuncio === undefined) return null

  async function acao(chave, fn) {
    setOcupado(chave); setErro('')
    try { await fn(); await recarregar() } catch (e) { setErro(e.message) } finally { setOcupado('') }
  }

  function salvar(e) {
    e.preventDefault()
    const v = validarAnuncio(editando)
    if (!v.ok) { setErro(v.erro); return }
    acao('salvar', async () => {
      const { error } = await supabase.from('anuncios_mesa').upsert({ mesa_id: mesaId, ...v.linha, ativo: true, updated_at: new Date().toISOString() })
      if (error) throw new Error(error.message)
      setEditando(null)
    })
  }

  async function responder(pedido, aceitar) {
    await acao(pedido.id, async () => {
      const { error } = await supabase.rpc('responder_pedido', { p_pedido_id: pedido.id, p_aceitar: aceitar })
      if (error) throw new Error(error.message)
    })
  }

  return (
    <section className="rounded-xl border border-border bg-raised p-5 space-y-3" aria-labelledby="titulo-anuncio">
      <div className="flex flex-wrap items-center gap-3">
        <Ilustra nome="pessoas" tamanho={28} className="shrink-0" />
        <div className="flex-1 min-w-[12rem]">
          <h2 id="titulo-anuncio" className="text-ink font-semibold">Procurar jogadores</h2>
          <p className="text-ink-dim text-xs">
            {anuncio?.ativo
              ? `Anunciada na Comunidade · ${textoVagas(anuncio.vagas)}`
              : anuncio?.vagas === 0 ? 'As vagas foram preenchidas e o anúncio saiu da Comunidade. Edite para abrir mais.'
                : anuncio ? 'Anúncio pausado (não aparece na Comunidade).' : 'Anuncie a mesa na Comunidade; quem se interessar pede uma vaga e você decide.'}
          </p>
        </div>
        {!editando && (
          <div className="flex flex-wrap gap-2">
            <Botao variante={anuncio ? 'contorno' : 'primario'} tamanho="sm"
              onClick={() => setEditando({ sistema: anuncio?.sistema || '', quando: anuncio?.quando || '', vagas: anuncio?.vagas || 1, iniciantes: !!anuncio?.iniciantes, descricao: anuncio?.descricao || '' })}
            >{anuncio ? 'Editar anúncio' : 'Anunciar na Comunidade'}</Botao>
            {anuncio && anuncio.vagas > 0 && (
              <Botao variante="secundario" tamanho="sm" disabled={ocupado === 'pausar'}
                onClick={() => acao('pausar', async () => {
                  const { error } = await supabase.from('anuncios_mesa').update({ ativo: !anuncio.ativo, updated_at: new Date().toISOString() }).eq('mesa_id', mesaId)
                  if (error) throw new Error(error.message)
                })}
              >{anuncio.ativo ? 'Pausar' : 'Retomar'}</Botao>
            )}
          </div>
        )}
      </div>

      {editando && (
        <form onSubmit={salvar} className="space-y-2">
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_6rem]">
            <input value={editando.sistema} onChange={e => setEditando(x => ({ ...x, sistema: e.target.value }))} maxLength={60} placeholder="Sistema (ex.: D&D 5e, Tormenta20)" aria-label="Sistema" className={CAMPO} />
            <input value={editando.quando} onChange={e => setEditando(x => ({ ...x, quando: e.target.value }))} maxLength={120} placeholder="Quando (ex.: sábados 20h, quinzenal)" aria-label="Quando" className={CAMPO} />
            <input type="number" min={1} max={20} value={editando.vagas} onChange={e => setEditando(x => ({ ...x, vagas: e.target.value }))} aria-label="Vagas" className={CAMPO} />
          </div>
          <textarea value={editando.descricao} onChange={e => setEditando(x => ({ ...x, descricao: e.target.value }))} maxLength={1000} rows={3} placeholder="Como é a campanha: tom, tema, o que você espera de quem entrar…" aria-label="Descrição da campanha" className={`${CAMPO} w-full`} />
          <label className="flex items-center gap-2 text-sm text-ink min-h-[24px]">
            <input type="checkbox" checked={editando.iniciantes} onChange={e => setEditando(x => ({ ...x, iniciantes: e.target.checked }))} /> Aceita iniciantes
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <Botao type="submit" variante="primario" tamanho="sm" disabled={ocupado === 'salvar'}>{ocupado === 'salvar' ? 'Salvando…' : 'Publicar anúncio'}</Botao>
            <Botao variante="fantasma" tamanho="sm" onClick={() => setEditando(null)}>Cancelar</Botao>
          </div>
        </form>
      )}

      {pedidos.length > 0 && (
        <div className="space-y-2 border-t border-border pt-3">
          <p className="text-xs uppercase tracking-wider font-semibold text-ink-dim">Pedidos de vaga ({pedidos.length})</p>
          <ul className="space-y-2">
            {pedidos.map(p => (
              <li key={p.id} className="rounded-lg border border-border bg-void/40 p-3 flex flex-wrap items-start gap-2">
                <div className="flex-1 min-w-[12rem]">
                  <p className="text-ink text-sm font-medium">{p.nome}</p>
                  {p.mensagem && <p className="text-ink-dim text-sm whitespace-pre-wrap">{p.mensagem}</p>}
                </div>
                <Botao variante="primario" tamanho="sm" disabled={ocupado === p.id} onClick={() => responder(p, true)}>Aceitar</Botao>
                <Botao variante="fantasma" tamanho="sm" disabled={ocupado === p.id} onClick={() => responder(p, false)}>Recusar</Botao>
              </li>
            ))}
          </ul>
        </div>
      )}
      {erro && <p className="text-harm text-xs" role="alert">{erro}</p>}
    </section>
  )
}
