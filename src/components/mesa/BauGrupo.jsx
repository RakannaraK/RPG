import { useState } from 'react'
import { useBau } from '../../hooks/useBau'
import { fichasQueUso, validarItemBau } from '../../lib/bau'
import Botao from '../ui/Botao'
import Ilustra from '../arte/Ilustra'

const CAMPO = 'px-3 py-2 rounded-lg bg-void border border-border text-ink text-sm placeholder:text-ink-dim focus:outline-none focus:ring-1 focus:ring-accent-500'

/**
 * Fase 49 — baú do grupo: o que ninguém está carregando. Jogador guarda pela
 * ficha e pega daqui; o mestre também põe o saque direto.
 */
export default function BauGrupo({ mesaId, meuId, isGestor, podeEscrever, fichas }) {
  const bau = useBau(mesaId)
  const minhas = fichasQueUso(fichas, meuId)
  const [destino, setDestino] = useState('')
  const [novo, setNovo] = useState(null) // { nome, descricao }
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState('')

  if (bau.indisponivel) return null
  const fichaAlvo = destino || minhas[0]?.id || ''

  async function acao(chave, fn) {
    setOcupado(chave); setErro('')
    try { await fn() } catch (e) { setErro(e.message) } finally { setOcupado('') }
  }

  function porSaque(e) {
    e.preventDefault()
    const v = validarItemBau(novo)
    if (!v.ok) { setErro(v.erro); return }
    acao('saque', async () => { await bau.porSaque(v.linha); setNovo(null) })
  }

  return (
    <section className="rounded-xl border border-border bg-raised p-5 space-y-3" aria-labelledby="titulo-bau">
      <div className="flex flex-wrap items-center gap-3">
        <Ilustra nome="bau" tamanho={28} className="shrink-0" />
        <div className="flex-1 min-w-[12rem]">
          <h2 id="titulo-bau" className="text-ink font-semibold">Baú do grupo</h2>
          <p className="text-ink-dim text-xs">O que ninguém está carregando. Guarde pelo inventário da ficha e pegue daqui.</p>
        </div>
        {isGestor && !novo && <Botao variante="secundario" tamanho="sm" onClick={() => setNovo({ nome: '', descricao: '' })}>+ Pôr no baú</Botao>}
      </div>

      {novo && (
        <form onSubmit={porSaque} className="flex flex-wrap items-center gap-2">
          <input value={novo.nome} onChange={e => setNovo(n => ({ ...n, nome: e.target.value }))} maxLength={120} placeholder="Ex.: Poção de cura" aria-label="Nome do item" className={`${CAMPO} flex-1 min-w-[10rem]`} autoFocus />
          <input value={novo.descricao} onChange={e => setNovo(n => ({ ...n, descricao: e.target.value }))} placeholder="Descrição (opcional)" aria-label="Descrição do item" className={`${CAMPO} flex-[2] min-w-[12rem]`} />
          <Botao type="submit" variante="primario" tamanho="sm" disabled={ocupado === 'saque'}>Pôr</Botao>
          <Botao variante="fantasma" tamanho="sm" onClick={() => setNovo(null)}>Cancelar</Botao>
        </form>
      )}

      {podeEscrever && minhas.length > 1 && bau.itens.length > 0 && (
        <label className="flex items-center gap-2 text-xs text-ink-dim">Pegar para
          <select value={fichaAlvo} onChange={e => setDestino(e.target.value)} className={`${CAMPO} py-1.5`}>
            {minhas.map(f => <option key={f.id} value={f.id}>{f.nome_personagem}</option>)}
          </select>
        </label>
      )}

      {bau.itens.length === 0 ? (
        <p className="text-ink-dim text-sm italic">O baú está vazio.</p>
      ) : (
        <ul className="divide-y divide-border/60">
          {bau.itens.map(item => (
            <li key={item.id} className="flex flex-wrap items-center gap-2 py-2">
              <div className="flex-1 min-w-[10rem]">
                <p className="text-ink text-sm font-medium">{item.nome}</p>
                {item.descricao && <p className="text-ink-dim text-xs">{item.descricao}</p>}
              </div>
              {podeEscrever && fichaAlvo && (
                <Botao
                  variante="contorno" tamanho="sm" disabled={ocupado === item.id}
                  onClick={() => acao(item.id, () => bau.pegar(item.id, fichaAlvo))}
                >{ocupado === item.id ? 'Pegando…' : minhas.length > 1 ? 'Pegar' : `Pegar para ${minhas[0].nome_personagem}`}</Botao>
              )}
              {isGestor && (
                <button
                  type="button" aria-label={`Tirar "${item.nome}" do baú`} title="Tirar do baú"
                  onClick={() => window.confirm(`Tirar "${item.nome}" do baú? Ele deixa de existir.`) && acao(`t${item.id}`, () => bau.tirar(item.id))}
                  className="min-w-[28px] min-h-[28px] rounded-lg text-ink-dim hover:text-ink hover:bg-slate-700 inline-flex items-center justify-center"
                ><Ilustra nome="lixeira" tamanho={14} /></button>
              )}
            </li>
          ))}
        </ul>
      )}
      {podeEscrever && !minhas.length && bau.itens.length > 0 && (
        <p className="text-ink-dim text-xs">Crie um personagem para poder pegar itens do baú.</p>
      )}
      {erro && <p className="text-harm text-xs" role="alert">{erro}</p>}
    </section>
  )
}
