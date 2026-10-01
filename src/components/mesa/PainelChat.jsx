import { useEffect, useRef, useState } from 'react'
import { useMembrosMesa } from '../../hooks/useMembrosMesa'
import { useRolagem } from '../../hooks/useRolagem'
import { agruparMensagens, destinatarios, interpretarEntrada, opcoesDestino, rotuloSussurro, TAMANHO_MAX_MENSAGEM } from '../../lib/chatMesa'
import Avatar from '../ui/Avatar'
import Botao from '../ui/Botao'
import Icone from '../ui/Icone'
import Ilustra from '../arte/Ilustra'

function dia(iso) {
  const d = new Date(iso)
  const hoje = new Date()
  const ontem = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 1)
  if (d.toDateString() === hoje.toDateString()) return 'Hoje'
  if (d.toDateString() === ontem.toDateString()) return 'Ontem'
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })
}

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
  const { membros, nomeDe, avatarDe } = useMembrosMesa(mesaId)
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
        className="flex-1 min-h-0 overflow-y-auto pr-1"
        aria-live="polite"
      >
        {mensagens.length === 0 && (
          <li className="h-full flex flex-col items-center justify-center text-center px-6 py-10">
            <Ilustra nome="pergaminho" tamanho={56} className="opacity-80 mb-3" />
            <p className="text-ink font-medium">Nenhuma mensagem ainda</p>
            <p className="text-ink-dim text-sm mt-1">Diga oi para a mesa. Comece com <span className="font-mono text-ink">/r 1d20</span> para rolar daqui.</p>
          </li>
        )}
        {agruparMensagens(mensagens).map(({ m, inicioGrupo, novoDia }) => {
          const minha = m.autor_id === meuId
          const sussurro = rotuloSussurro(m, meuId, nomeDe)
          const nome = minha ? 'Você' : nomeDe(m.autor_id)
          return (
            <li key={m.id} className={`group relative ${inicioGrupo ? 'mt-3 first:mt-0' : ''}`}>
              {novoDia && (
                <div className="flex items-center gap-3 my-3 text-xs text-ink-dim" role="separator">
                  <span className="flex-1 h-px bg-border/70" />{dia(m.created_at)}<span className="flex-1 h-px bg-border/70" />
                </div>
              )}
              <div className={`flex gap-3 rounded-lg px-2 py-1 transition-colors duration-rapida hover:bg-hover/40 ${sussurro ? 'border-l-2 border-accent-400 bg-accent-800/15' : ''}`}>
                <div className="w-8 shrink-0">
                  {inicioGrupo
                    ? <Avatar url={avatarDe(m.autor_id)} nome={nomeDe(m.autor_id)} tamanho="sm" />
                    : <span className="block text-xs leading-6 text-ink-dim text-right opacity-0 group-hover:opacity-100 tabular-nums">{hora(m.created_at).slice(-5)}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  {inicioGrupo && (
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className={`text-sm font-semibold ${minha ? 'text-accent-300' : 'text-ink'}`}>{nome}</span>
                      <span className="text-ink-dim text-xs tabular-nums">{hora(m.created_at)}</span>
                      {sussurro && (
                        <button
                          type="button"
                          // Responder o sussurro: quem recebeu responde só para o autor
                          onClick={() => !minha && setDestino(m.autor_id)}
                          className="text-accent-300 text-xs hover:underline min-h-[24px] inline-flex items-center"
                          title={minha ? undefined : 'Responder em sussurro'}
                        >{sussurro}</button>
                      )}
                    </div>
                  )}
                  <p className={`text-sm text-ink whitespace-pre-wrap break-words leading-relaxed ${sussurro ? 'italic' : ''}`}>{m.texto}</p>
                </div>
                {(minha || isGestor) && (
                  <button
                    type="button" onClick={() => aoApagar(m.id)}
                    className="botao-icone !min-w-[28px] !min-h-[28px] self-start opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:!text-harm"
                    aria-label="Apagar mensagem" data-dica="Apagar"
                  ><Icone nome="lixeira" tamanho={15} /></button>
                )}
              </div>
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
              className="campo w-full !min-h-[36px] !py-1.5"
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
              className="campo flex-1 resize-none"
              aria-label="Mensagem"
            />
            <Botao variante="primario" onClick={aoEnviar} disabled={enviando || !texto.trim()} aria-label="Enviar mensagem" className="!min-h-[44px] !px-4">
              <Icone nome="seta-dir" tamanho={18} className={enviando ? 'opacity-50' : ''} />
            </Botao>
          </div>
          {(erro || erroRolagem) && <p className="aviso-erro !text-xs" role="alert">{erro || erroRolagem}</p>}
          <p className="text-ink-dim text-xs">Enter envia · Shift+Enter quebra linha · /r 2d6+3 rótulo rola no feed</p>
        </div>
      ) : (
        <p className="text-ink-dim text-xs italic pt-3">Mesa arquivada — o chat é só leitura.</p>
      )}
    </div>
  )
}
