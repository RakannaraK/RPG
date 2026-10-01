import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Icone from './Icone'
import { DUR_NORMAL, movimentoReduzido } from '../../theme/motion'

/**
 * Fase 52 — aviso curto de resultado de ação ("Mesa criada", "Código copiado",
 * "Não foi possível salvar"). Entra deslizando, some sozinho (pausa com o
 * mouse em cima), tem ✕ e é lido pelo leitor de tela.
 *
 *   const toast = useToast()
 *   toast.ok('Ficha salva')      toast.erro('Não foi possível conectar')
 */
const Ctx = createContext(null)
const TIPOS = {
  ok:    { icone: 'ok',     cor: 'text-ok',     borda: 'border-ok/40',     duracao: 3200 },
  info:  { icone: 'info',   cor: 'text-accent-300', borda: 'border-accent-500/40', duracao: 3600 },
  aviso: { icone: 'alerta', cor: 'text-warn',   borda: 'border-warn/40',   duracao: 5000 },
  erro:  { icone: 'erro',   cor: 'text-harm',   borda: 'border-harm/50',   duracao: 6500 },
}
const MAXIMO = 4

export function useToast() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useToast precisa do ToastProvider')
  return ctx
}

function Aviso({ item, onSumir }) {
  const t = TIPOS[item.tipo] || TIPOS.info
  const [saindo, setSaindo] = useState(false)
  const timer = useRef(null)

  const sair = useCallback(() => {
    setSaindo(true)
    setTimeout(() => onSumir(item.id), movimentoReduzido() ? 0 : DUR_NORMAL)
  }, [item.id, onSumir])

  const armar = useCallback(() => {
    clearTimeout(timer.current)
    timer.current = setTimeout(sair, item.duracao ?? t.duracao)
  }, [sair, item.duracao, t.duracao])

  useEffect(() => { armar(); return () => clearTimeout(timer.current) }, [armar])

  return (
    <div
      role={item.tipo === 'erro' ? 'alert' : 'status'}
      onMouseEnter={() => clearTimeout(timer.current)} onMouseLeave={armar}
      className={`toast pointer-events-auto w-full sm:w-[22rem] flex items-start gap-3 rounded-xl border ${t.borda} bg-raised/95 shadow-nivel-2 px-4 py-3 ${saindo ? 'toast-sai' : ''}`}
    >
      <Icone nome={t.icone} tamanho={20} className={`${t.cor} mt-px`} />
      <div className="flex-1 min-w-0">
        <p className="text-ink text-sm font-medium">{item.mensagem}</p>
        {item.detalhe && <p className="text-ink-dim text-sm mt-0.5">{item.detalhe}</p>}
      </div>
      <button type="button" onClick={sair} aria-label="Fechar aviso" className="botao-icone -mr-2 -my-1.5 !min-w-[32px] !min-h-[32px]">
        <Icone nome="x" tamanho={16} />
      </button>
    </div>
  )
}

export function ToastProvider({ children }) {
  const [itens, setItens] = useState([])
  const seq = useRef(0)

  const sumir = useCallback(id => setItens(lista => lista.filter(i => i.id !== id)), [])

  const toast = useMemo(() => {
    const mostrar = (mensagem, opcoes = {}) => {
      const id = ++seq.current
      setItens(lista => [...lista, { id, mensagem, tipo: 'info', ...opcoes }].slice(-MAXIMO))
      return id
    }
    mostrar.ok = (m, o) => mostrar(m, { ...o, tipo: 'ok' })
    mostrar.info = (m, o) => mostrar(m, { ...o, tipo: 'info' })
    mostrar.aviso = (m, o) => mostrar(m, { ...o, tipo: 'aviso' })
    mostrar.erro = (m, o) => mostrar(m, { ...o, tipo: 'erro' })
    return mostrar
  }, [])

  return (
    <Ctx.Provider value={toast}>
      {children}
      {createPortal(
        <div className="avisos fixed z-toast top-3 inset-x-3 sm:inset-x-auto sm:top-auto sm:right-4 sm:bottom-4 flex flex-col items-stretch sm:items-end gap-2 pointer-events-none print:hidden">
          {itens.map(i => <Aviso key={i.id} item={i} onSumir={sumir} />)}
        </div>,
        document.body,
      )}
    </Ctx.Provider>
  )
}
