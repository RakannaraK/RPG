import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSeguranca } from '../../hooks/useSeguranca'
import { xcardAtivo } from '../../lib/seguranca'
import Botao from '../ui/Botao'

/**
 * Fase 44 — X-Card: qualquer participante toca, a mesa inteira vê que foi tocado,
 * ninguém vê quem. O aviso some quando cada um dispensa (ou depois de 10 min).
 */
export default function XCard({ mesaId, isGestor, className = '' }) {
  const { toques, indisponivel, tocarX } = useSeguranca(mesaId)
  const chave = `dp-xcard-visto-${mesaId}`
  const [vistoAte, setVistoAte] = useState(() => { try { return Number(localStorage.getItem(chave)) || 0 } catch { return 0 } })
  const [confirmando, setConfirmando] = useState(false)
  const [erro, setErro] = useState('')
  const [agora, setAgora] = useState(() => Date.now())

  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 30 * 1000)
    return () => clearInterval(t)
  }, [])

  if (indisponivel) return null
  const ativo = xcardAtivo(toques, vistoAte, agora)

  async function tocar() {
    setErro('')
    try { await tocarX(); setConfirmando(false) } catch (e) { setErro(e.message) }
  }

  function dispensar() {
    const ate = Date.parse(ativo.created_at)
    setVistoAte(ate)
    try { localStorage.setItem(chave, String(ate)) } catch { /* vale só nesta visita */ }
  }

  return (
    <div className={`shrink-0 ${className}`}>
      <Botao
        variante="perigo" tamanho="sm" aria-expanded={confirmando} aria-label="X-Card: cortar a cena, sem dizer quem"
        onClick={() => setConfirmando(c => !c)}
      ><span className="sm:hidden">X</span><span className="hidden sm:inline">X-Card</span></Botao>

      {confirmando && createPortal(
        <div role="dialog" aria-label="Tocar o X-Card?" className="fixed top-16 inset-x-4 mx-auto max-w-xs z-[60] rounded-xl border border-border bg-raised shadow-2xl p-4 space-y-2 text-left">
          <p className="text-ink text-sm font-semibold">Tocar o X-Card?</p>
          <p className="text-ink-dim text-xs">A cena atual sai do jogo. Ninguém — nem o mestre — fica sabendo que foi você, e ninguém vai perguntar por quê.</p>
          <div className="flex gap-2">
            <Botao variante="perigo" tamanho="sm" onClick={tocar}>Tocar o X</Botao>
            <Botao variante="fantasma" tamanho="sm" onClick={() => setConfirmando(false)}>Cancelar</Botao>
          </div>
          {erro && <p className="text-harm text-xs" role="alert">{erro}</p>}
        </div>,
        document.body,
      )}

      {/* portal: o cabeçalho tem backdrop-blur, que prenderia o `fixed` dentro dele */}
      {ativo && createPortal(
        <div role="alert" className="fixed top-4 inset-x-4 mx-auto max-w-md z-[60] rounded-2xl border-2 border-red-700 bg-raised shadow-2xl p-5 text-center space-y-3">
          <div aria-hidden className="mx-auto w-12 h-12 rounded-full bg-red-800 text-white text-2xl font-bold flex items-center justify-center">✕</div>
          <p className="text-ink text-lg font-semibold">Alguém tocou o X-Card</p>
          <p className="text-ink-dim text-sm">
            {isGestor
              ? 'Corte ou mude a cena agora. Não pergunte quem foi nem por quê.'
              : 'A cena atual sai do jogo. O mestre vai cortar ou mudar — sem perguntas.'}
          </p>
          <Botao variante="primario" onClick={dispensar}>Entendi</Botao>
        </div>,
        document.body,
      )}
    </div>
  )
}
