import { useEffect, useRef, useState } from 'react'
import { useMembrosMesa } from '../../hooks/useMembrosMesa'
import { useRolagem } from '../../hooks/useRolagem'
import { destinatarios, interpretarEntrada, opcoesDestino, rotuloSussurro, TAMANHO_MAX_MENSAGEM } from '../../lib/chatMesa'

function hora(iso) {
  const d = new Date(iso)
  const hm = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return d.toDateString() === new Date().toDateString() ? hm : `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} ${hm}`
}

/**
 * Fase 29.2 — chat da mesa. `chat` vem de useChatMesa na página (as não lidas
 * contam mesmo com o painel fechado). Enquanto montado, marca tudo como lido.
 * `className` define a altura (o painel ocupa o que receber).
 */
export default function PainelChat({ chat, mesaId, meuId, isGestor, podeFalar = true, podeRolar = true, sessaoId = null, className = 'h-[60vh]' }) {
  const { mensagens, indisponivel, enviar, apagar, marcarLidas } = chat
  const { membros, nomeDe } = useMembrosMesa(mesaId)
  const { registrarRolagem, erro: erroRolagem } = useRolagem()
  const [texto, setTexto] = useState('')
  const [destino, setDestino] = useState('todos')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const listaRef = useRef(null)
  const noFimRef = useRef(true)

  useEffect(() => { marcarLidas() }, [marcarLidas])

  // Desce para a última mensagem se já estava lá embaixo (não arranca quem está lendo o histórico)
  useEffect(() => {
    const el = listaRef.current
    if (el && noFimRef.current) el.scrollTop = el.scrollHeight
  }, [mensagens.length])

  const opcoes = opcoesDestino(membros, meuId)

  async function aoEnviar() {
    const entrada = interpretarEntrada(texto)
    if (!entrada) return
    if (entrada.tipo === 'erro') { setErro(entrada.erro); return }
    if (entrada.tipo === 'rolagem' && !podeRolar) { setErro('Como espectador, você não rola dados.'); return }
    setEnviando(true); setErro('')
    try {
      if (entrada.tipo === 'rolagem') {
        await registrarRolagem({ mesaId, notacao: entrada.notacao, rotulo: entrada.rotulo, sessaoId })
      } else {
        noFimRef.current = true
        await enviar(entrada.texto, destinatarios(destino, membros, meuId))
      }
      setTexto('')
    } catch (e) {
      setErro(e.message || 'Não foi possível enviar.')
    } finally {
      setEnviando(false)
    }
  }

  async function aoApagar(id) {
    try { await apagar(id) } catch (e) { setErro(e.message) }
  }

  if (indisponivel) {
    return <p className="text-ink-dim text-sm italic">Chat ainda não ativado neste banco (sql/fase29_chat_notas_calendario.sql).</p>
  }

  return (
    <div className={`flex flex-col min-h-0 ${className}`}>
      <ul
        ref={listaRef}
        onScroll={e => { const el = e.currentTarget; noFimRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40 }}
        className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1"
        aria-live="polite"
      >
        {mensagens.length === 0 && <li className="text-ink-dim text-sm italic">Nenhuma mensagem ainda. Diga oi!</li>}
        {mensagens.map(m => {
          const minha = m.autor_id === meuId
          const sussurro = rotuloSussurro(m, meuId, nomeDe)
          return (
            <li key={m.id} className={`group ${minha ? 'ml-6' : 'mr-6'}`}>
              <div className={`flex items-baseline gap-2 text-xs ${minha ? 'justify-end' : ''}`}>
                <span className="text-ink font-semibold">{minha ? 'Você' : nomeDe(m.autor_id)}</span>
                <span className="text-ink-dim">{hora(m.created_at)}</span>
                {sussurro && (
                  <button
                    type="button"
                    // Responder o sussurro: quem recebeu responde só para o autor
                    onClick={() => !minha && setDestino(m.autor_id)}
                    className="text-violet-300 hover:underline"
                    title={minha ? undefined : 'Responder em sussurro'}
                  >{sussurro}</button>
                )}
                {(minha || isGestor) && (
                  <button
                    type="button" onClick={() => aoApagar(m.id)}
                    className="text-ink-dim hover:text-red-400 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                    title="Apagar mensagem" aria-label="Apagar mensagem"
                  >✕</button>
                )}
              </div>
              <p className={`mt-0.5 rounded-xl px-3 py-2 text-sm whitespace-pre-wrap break-words ${
                sussurro ? 'bg-violet-950/70 border border-violet-800 text-violet-100 italic'
                  : minha ? 'bg-accent-600 text-sobre-acento' : 'bg-raised text-sobre-acento'
              }`}>{m.texto}</p>
            </li>
          )
        })}
      </ul>

      {podeFalar ? (
        <div className="pt-3 space-y-2 border-t border-border mt-2">
          {opcoes.length > 1 && (
            <select
              value={opcoes.some(o => o.valor === destino) ? destino : 'todos'}
              onChange={e => setDestino(e.target.value)}
              className="w-full px-2 py-1.5 rounded-lg bg-void border border-border text-ink text-sm"
              aria-label="Para quem"
            >
              {opcoes.map(o => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
            </select>
          )}
          <div className="flex gap-2 items-end">
            <textarea
              value={texto}
              onChange={e => { setTexto(e.target.value); if (erro) setErro('') }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); aoEnviar() } }}
              rows={2}
              maxLength={TAMANHO_MAX_MENSAGEM + 50}
              placeholder={destino === 'todos' ? 'Mensagem para a mesa… (/r 1d20+5 rola)' : 'Sussurro…'}
              className="flex-1 resize-none px-3 py-2 rounded-lg bg-void border border-border text-ink text-sm placeholder:text-ink-dim focus:outline-none focus:ring-1 focus:ring-accent-500"
              aria-label="Mensagem"
            />
            <button
              type="button" onClick={aoEnviar} disabled={enviando || !texto.trim()}
              className="px-3 py-2 rounded-lg bg-accent-600 hover:bg-accent-500 disabled:opacity-50 text-sobre-acento text-sm font-semibold"
            >{enviando ? '…' : 'Enviar'}</button>
          </div>
          {(erro || erroRolagem) && <p className="text-red-400 text-xs">{erro || erroRolagem}</p>}
          <p className="text-ink-dim text-xs">Enter envia · Shift+Enter quebra linha · /r 2d6+3 rótulo rola no feed</p>
        </div>
      ) : (
        <p className="text-ink-dim text-xs italic pt-3">Mesa arquivada — o chat é só leitura.</p>
      )}
    </div>
  )
}
