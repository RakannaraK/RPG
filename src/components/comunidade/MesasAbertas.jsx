import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { souConvidado } from '../../lib/convite'
import { filtrarMesas, situacao, textoVagas } from '../../lib/mesasAbertas'
import CapaMesa from '../mesa/CapaMesa'
import Botao from '../ui/Botao'

const CAMPO = 'px-3 py-2 rounded-lg bg-void border border-border text-ink text-sm placeholder:text-ink-dim focus:outline-none focus:ring-1 focus:ring-accent-500'

function Cartao({ m, estado, onPedir, onCancelar, onAbrir, onEntrar }) {
  const [escrevendo, setEscrevendo] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)

  async function acao(fn) {
    setOcupado(true); setErro('')
    try { await fn(); setEscrevendo(false) } catch (e) { setErro(e.message) } finally { setOcupado(false) }
  }

  return (
    <li className="rounded-xl border border-border bg-raised overflow-hidden flex flex-col">
      <CapaMesa capa={m.capa} altura={48} />
      <div className="p-4 space-y-2 flex-1 flex flex-col">
        <p className="text-ink font-semibold">{m.nome}</p>
        <p className="text-ink-dim text-xs">
          {[m.sistema, m.quando, textoVagas(m.vagas), `${m.jogadores} ${m.jogadores === 1 ? 'jogador' : 'jogadores'}`].filter(Boolean).join(' · ')}
        </p>
        {m.iniciantes && <span className="self-start text-xs px-2 py-0.5 rounded-full border border-ok text-ok">Aceita iniciantes</span>}
        <p className="text-ink text-sm whitespace-pre-wrap flex-1">{m.descricao}</p>

        {estado === 'sem-login' && <Botao variante="contorno" tamanho="sm" onClick={onEntrar}>Entre para pedir uma vaga</Botao>}
        {estado === 'convidado' && <p className="text-ink-dim text-xs">Crie uma conta para pedir vaga em outra mesa.</p>}
        {estado === 'membro' && <Botao variante="secundario" tamanho="sm" onClick={onAbrir}>Você já está nesta mesa · abrir</Botao>}
        {estado === 'recusado' && <p className="text-ink-dim text-xs">Seu pedido para esta mesa não foi aceito.</p>}
        {estado === 'pendente' && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-accent-300 text-xs">Pedido enviado — o mestre decide.</span>
            <Botao variante="fantasma" tamanho="sm" disabled={ocupado} onClick={() => acao(onCancelar)}>Cancelar pedido</Botao>
          </div>
        )}
        {estado === 'pode-pedir' && !escrevendo && <Botao variante="primario" tamanho="sm" onClick={() => setEscrevendo(true)}>Quero jogar</Botao>}
        {estado === 'pode-pedir' && escrevendo && (
          <div className="space-y-2">
            <textarea value={mensagem} onChange={e => setMensagem(e.target.value)} maxLength={500} rows={2} placeholder="Conte um pouco sobre você (opcional)" aria-label="Mensagem para o mestre" className={`${CAMPO} w-full`} />
            <div className="flex gap-2">
              <Botao variante="primario" tamanho="sm" disabled={ocupado} onClick={() => acao(() => onPedir(mensagem))}>{ocupado ? 'Enviando…' : 'Enviar pedido'}</Botao>
              <Botao variante="fantasma" tamanho="sm" onClick={() => setEscrevendo(false)}>Cancelar</Botao>
            </div>
          </div>
        )}
        {erro && <p className="text-harm text-xs" role="alert">{erro}</p>}
      </div>
    </li>
  )
}

/**
 * Fase 51 — vitrine de mesas procurando jogadores (na Comunidade). Aparece até
 * para quem não tem conta; pedir vaga precisa de conta.
 */
export default function MesasAbertas() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [mesas, setMesas] = useState(null)
  const [meusPedidos, setMeusPedidos] = useState([])
  const [minhasMesas, setMinhasMesas] = useState([])
  const [busca, setBusca] = useState('')
  const [iniciantes, setIniciantes] = useState(false)
  const meuId = session?.user?.id

  const recarregar = useCallback(async () => {
    const { data, error } = await supabase.rpc('mesas_abertas')
    if (error) { setMesas([]); return }
    setMesas(data || [])
    if (meuId) {
      const [p, mm] = await Promise.all([
        supabase.from('pedidos_mesa').select('mesa_id, status').eq('usuario_id', meuId),
        supabase.from('membros_mesa').select('mesa_id').eq('usuario_id', meuId),
      ])
      setMeusPedidos(p.data || [])
      setMinhasMesas((mm.data || []).map(x => x.mesa_id))
    }
  }, [meuId])

  useEffect(() => { recarregar() }, [recarregar])

  if (!mesas?.length) return null
  const lista = filtrarMesas(mesas, { busca, iniciantes })
  const ctx = { logado: !!session, convidado: souConvidado(session), minhasMesas, meusPedidos }

  return (
    <section className="space-y-3" aria-labelledby="titulo-mesas-abertas">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="titulo-mesas-abertas" className="text-ink font-semibold text-lg flex-1">Mesas procurando jogadores</h2>
        <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar sistema, horário, tema…" aria-label="Buscar mesas abertas" className={`${CAMPO} min-w-[12rem]`} />
        <label className="flex items-center gap-2 text-sm text-ink min-h-[24px]">
          <input type="checkbox" checked={iniciantes} onChange={e => setIniciantes(e.target.checked)} /> Aceita iniciantes
        </label>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {lista.map(m => (
          <Cartao
            key={m.mesa_id} m={m} estado={situacao(m.mesa_id, ctx)}
            onEntrar={() => navigate('/')}
            onAbrir={() => navigate(`/mesa/${m.mesa_id}`)}
            onPedir={async mensagem => {
              const { error } = await supabase.rpc('pedir_vaga', { p_mesa_id: m.mesa_id, p_mensagem: mensagem || null })
              if (error) throw new Error(error.message)
              await recarregar()
            }}
            onCancelar={async () => {
              const { error } = await supabase.from('pedidos_mesa').delete().eq('mesa_id', m.mesa_id).eq('usuario_id', meuId)
              if (error) throw new Error(error.message)
              await recarregar()
            }}
          />
        ))}
      </ul>
      {!lista.length && <p className="text-ink-dim text-sm">Nenhuma mesa com esse filtro.</p>}
    </section>
  )
}
