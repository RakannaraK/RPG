import { useState } from 'react'
import { useSeguranca } from '../../hooks/useSeguranca'
import { LIMITE_TEXTO, TIPOS_LIMITE, agruparLimites } from '../../lib/seguranca'
import Botao from '../ui/Botao'
import Ilustra from '../arte/Ilustra'

const CAMPO = 'flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-void border border-border text-ink text-sm placeholder:text-ink-dim focus:outline-none focus:ring-1 focus:ring-accent-500'

function Coluna({ tipo, itens, isGestor, onAcrescentar, onTirar }) {
  const [texto, setTexto] = useState('')
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)

  async function enviar(e) {
    e.preventDefault()
    setOcupado(true); setErro('')
    try { await onAcrescentar(tipo.id, texto); setTexto('') } catch (err) { setErro(err.message) } finally { setOcupado(false) }
  }

  return (
    <div className="rounded-xl border border-border bg-void/40 p-3 space-y-2">
      <div>
        <p className="text-ink text-sm font-semibold">{tipo.nome}</p>
        <p className="text-ink-dim text-xs">{tipo.explica}</p>
      </div>
      <ul className="space-y-1">
        {itens.length === 0 && <li className="text-ink-dim text-xs italic">Nada ainda.</li>}
        {itens.map(l => (
          <li key={l.id} className="flex items-start gap-2 text-sm text-ink">
            <span className="flex-1 min-w-0 break-words">{l.texto}</span>
            {isGestor && (
              <button
                type="button" onClick={() => onTirar(l.id)} aria-label={`Tirar "${l.texto}"`}
                className="shrink-0 min-w-[24px] min-h-[24px] rounded-lg text-ink-dim hover:text-ink hover:bg-slate-700 inline-flex items-center justify-center"
              ><Ilustra nome="lixeira" tamanho={14} /></button>
            )}
          </li>
        ))}
      </ul>
      <form onSubmit={enviar} className="flex gap-1">
        <input
          value={texto} onChange={e => setTexto(e.target.value)} maxLength={LIMITE_TEXTO}
          placeholder="Acrescentar…" aria-label={`Acrescentar em ${tipo.nome}`} className={CAMPO}
        />
        <Botao type="submit" variante="secundario" tamanho="sm" disabled={ocupado || !texto.trim()}>Pôr</Botao>
      </form>
      {erro && <p className="text-harm text-xs" role="alert">{erro}</p>}
    </div>
  )
}

/**
 * Fase 44 — linhas, véus e combinados da mesa. Qualquer participante acrescenta,
 * sem nome; quem gere tira duplicatas.
 */
export default function PainelLimites({ mesaId, isGestor }) {
  const { limites, indisponivel, acrescentar, tirar } = useSeguranca(mesaId)
  const [erro, setErro] = useState('')
  if (indisponivel) return null
  const grupos = agruparLimites(limites)

  async function tirarComConfirmacao(id) {
    if (!window.confirm('Tirar este item? Quem acrescentou não fica sabendo.')) return
    setErro('')
    try { await tirar(id) } catch (e) { setErro(e.message) }
  }

  return (
    <section className="rounded-xl border border-border bg-raised p-5 space-y-3" aria-labelledby="titulo-limites">
      <div className="flex items-start gap-3">
        <Ilustra nome="escudo" tamanho={28} className="shrink-0" />
        <div>
          <h2 id="titulo-limites" className="text-ink font-semibold">Combinados e limites</h2>
          <p className="text-ink-dim text-xs">
            Tudo aqui é <strong className="text-ink">anônimo</strong>: nem o mestre sabe quem escreveu. Uma linha não se discute — se alguém pôs, vale para a mesa.
            Na sessão, o botão <strong className="text-ink">X-Card</strong> corta a cena na hora, sem precisar explicar.
          </p>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {TIPOS_LIMITE.map(t => (
          <Coluna key={t.id} tipo={t} itens={grupos[t.id]} isGestor={isGestor} onAcrescentar={acrescentar} onTirar={tirarComConfirmacao} />
        ))}
      </div>
      {erro && <p className="text-harm text-xs" role="alert">{erro}</p>}
    </section>
  )
}
