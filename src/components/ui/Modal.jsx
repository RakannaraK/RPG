import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Icone from './Icone'
import Botao from './Botao'
import { DUR_NORMAL, movimentoReduzido } from '../../theme/motion'

/**
 * Fase 52 — janela modal do site. Antes eram 23 modais escritos à mão, cada
 * um com o seu `fixed inset-0`; nenhum prendia o foco nem devolvia o foco ao
 * fechar, quase nenhum fechava com Esc e todos sumiam de uma vez.
 *
 * Aqui:
 *  - entra (fundo esmaece; janela sobe 12 px e cresce de 98%) e SAI do mesmo
 *    jeito ao contrário — o componente só desmonta depois da animação;
 *  - Esc, clique fora e o ✕ fecham (a não ser com `bloqueado`, ex.: salvando);
 *  - o foco fica preso dentro (Tab circula) e volta para quem abriu;
 *  - no celular vira folha que sobe de baixo, quase tela cheia;
 *  - fica num portal no <body>: nada de `backdrop-blur`/transform de quem
 *    abriu prendendo o `fixed` (aconteceu com o X-Card e a trilha).
 *
 * Dois jeitos de usar:
 *  - `{aberto && <Modal onFechar={...}>}` — entra animado; sai animado quando
 *    quem fecha é o próprio modal (Esc, fora, ✕ ou `useFecharModal()` num
 *    botão "Cancelar" lá dentro);
 *  - `<Modal aberto={aberto} onFechar={...}>` — anima também quando quem fecha
 *    é a página (ex.: depois de salvar).
 */

const pilha = [] // modais abertos; Esc e Tab só valem para o de cima
const FOCAVEIS = 'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

const ModalCtx = createContext(null)
/** Dentro de um modal: fecha com a animação de saída. */
export const useFecharModal = () => useContext(ModalCtx)

/** Botão "Cancelar" de rodapé: fecha com a animação de saída. */
export function FecharModal({ children = 'Cancelar', disabled }) {
  const fechar = useFecharModal()
  return <Botao variante="fantasma" onClick={fechar} disabled={disabled}>{children}</Botao>
}

const LARGURAS = { sm: 'sm:max-w-sm', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl', xl: 'sm:max-w-4xl' }
const TONS = { normal: 'border-border', perigo: 'border-red-800/70', aviso: 'border-amber-700/60' }

export default function Modal({
  aberto = true, onFechar, titulo, subtitulo, children, rodape,
  tamanho = 'md', tom = 'normal', fecharFora = true, bloqueado = false,
  semCabecalho = false, className = '', corpoClassName = '',
}) {
  const idTitulo = useId()
  const painelRef = useRef(null)
  const onFecharRef = useRef(onFechar)
  useEffect(() => { onFecharRef.current = onFechar })
  const bloqueadoRef = useRef(bloqueado)
  useEffect(() => { bloqueadoRef.current = bloqueado })

  // 'aberto' | 'saindo' | 'fechado' — ajustado no render quando `aberto` muda
  const [estado, setEstado] = useState(aberto ? 'aberto' : 'fechado')
  const [abertoAntes, setAbertoAntes] = useState(aberto)
  // quem tinha o foco ANTES de abrir — lido no render, antes de qualquer
  // autoFocus lá de dentro roubar o foco; é para lá que ele volta ao fechar
  const [anterior, setAnterior] = useState(() => (aberto ? document.activeElement : null))
  if (aberto !== abertoAntes) {
    setAbertoAntes(aberto)
    setEstado(e => (aberto ? 'aberto' : e === 'fechado' ? 'fechado' : 'saindo'))
    if (aberto) setAnterior(document.activeElement)
  }
  // com `aberto` controlado de fora, quem usa mantém o conteúdo até a saída
  // terminar (ex.: Confirmar guarda o último pedido em vez de zerar)
  const vis = { titulo, subtitulo, children, rodape }

  const avisarAoFim = useRef(false)
  const fechar = useCallback(() => {
    if (bloqueadoRef.current) return
    avisarAoFim.current = true
    setEstado(e => (e === 'aberto' ? 'saindo' : e))
  }, [])

  useEffect(() => {
    if (estado !== 'saindo') return
    const t = setTimeout(() => {
      setEstado('fechado')
      if (avisarAoFim.current) { avisarAoFim.current = false; onFecharRef.current?.() }
    }, movimentoReduzido() ? 0 : DUR_NORMAL)
    return () => clearTimeout(t)
  }, [estado])

  const visivel = estado !== 'fechado'

  // foco, Esc, Tab e rolagem da página — enquanto estiver na tela
  useEffect(() => {
    if (!visivel) return
    const painel = painelRef.current
    const eu = {}
    pilha.push(eu)
    // trava a rolagem da página sem ela "pular" para o lado: a largura que a
    // barra de rolagem ocupava vira margem enquanto o modal está aberto
    const html = document.documentElement
    if (pilha.length === 1) {
      const barra = window.innerWidth - html.clientWidth
      html.style.overflow = 'hidden'
      if (barra > 0) html.style.paddingRight = `${barra}px`
    }

    if (painel && !painel.contains(document.activeElement)) {
      const campo = painel.querySelector('input:not([type="hidden"]):not([disabled]),select:not([disabled]),textarea:not([disabled])')
      ;(campo || painel).focus({ preventScroll: true })
    }

    function teclado(e) {
      if (pilha[pilha.length - 1] !== eu) return
      if (e.key === 'Escape') { e.stopPropagation(); fechar(); return }
      if (e.key !== 'Tab' || !painel) return
      const lista = [...painel.querySelectorAll(FOCAVEIS)].filter(el => el.offsetParent !== null || el === document.activeElement)
      if (lista.length === 0) { e.preventDefault(); painel.focus(); return }
      const primeiro = lista[0], ultimoEl = lista[lista.length - 1]
      if (e.shiftKey && (document.activeElement === primeiro || document.activeElement === painel)) { e.preventDefault(); ultimoEl.focus() }
      else if (!e.shiftKey && document.activeElement === ultimoEl) { e.preventDefault(); primeiro.focus() }
    }
    document.addEventListener('keydown', teclado)

    return () => {
      document.removeEventListener('keydown', teclado)
      pilha.splice(pilha.indexOf(eu), 1)
      if (pilha.length === 0) { html.style.overflow = ''; html.style.paddingRight = '' }
      if (anterior && document.contains(anterior)) anterior.focus?.({ preventScroll: true })
    }
  }, [visivel, fechar, anterior])

  if (!visivel) return null
  const saindo = estado === 'saindo'

  return createPortal(
    <ModalCtx.Provider value={fechar}>
      <div className={`fixed inset-0 z-modal flex items-end sm:items-center justify-center sm:p-4 ${saindo ? 'modal-sai' : 'modal-entra'}`}>
        <div
          className="modal-fundo absolute inset-0 bg-black/65 backdrop-blur-[2px]"
          onMouseDown={fecharFora ? fechar : undefined}
          aria-hidden="true"
        />
        <div
          ref={painelRef}
          role="dialog" aria-modal="true"
          aria-labelledby={vis.titulo ? idTitulo : undefined}
          aria-label={vis.titulo ? undefined : 'Janela'}
          tabIndex={-1}
          className={`modal-painel relative w-full ${LARGURAS[tamanho] || LARGURAS.md} max-h-[92dvh] sm:max-h-[88vh] flex flex-col bg-raised border ${TONS[tom] || TONS.normal} rounded-t-2xl sm:rounded-2xl shadow-nivel-3 outline-none ${className}`}
        >
          {!semCabecalho && (
            <div className="flex items-start gap-3 px-5 sm:px-6 pt-5 pb-4 border-b border-border/70 shrink-0">
              <div className="flex-1 min-w-0">
                {vis.titulo && <h2 id={idTitulo} className="text-ink font-semibold text-lg leading-snug font-sora">{vis.titulo}</h2>}
                {vis.subtitulo && <p className="text-ink-dim text-sm mt-0.5">{vis.subtitulo}</p>}
              </div>
              {!bloqueado && (
                <button
                  type="button" onClick={fechar} aria-label="Fechar"
                  className="botao-icone -mr-2 -mt-1 shrink-0"
                ><Icone nome="x" tamanho={20} /></button>
              )}
            </div>
          )}
          {semCabecalho && vis.titulo && <h2 id={idTitulo} className="sr-only">{vis.titulo}</h2>}
          <div className={`flex-1 min-h-0 overflow-y-auto px-5 sm:px-6 py-5 ${corpoClassName}`}>{vis.children}</div>
          {vis.rodape && (
            <div className="px-5 sm:px-6 py-4 border-t border-border/70 flex flex-wrap items-center justify-end gap-2 shrink-0">{vis.rodape}</div>
          )}
        </div>
      </div>
    </ModalCtx.Provider>,
    document.body,
  )
}
