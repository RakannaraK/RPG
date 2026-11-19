import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePreferencias } from '../../context/PreferenciasContext'
import { criarSomAmbiente } from '../../audio/somAmbiente'
import { trechoDigitado } from '../../lib/cinematica'
import Botao from '../ui/Botao'
import { t } from '../../i18n'

/** Conteúdo de um quadro: desvanece ao entrar (a troca remonta pelo `key`) e digita o texto. */
function Quadro({ quadro, reduzido }) {
  const [visivel, setVisivel] = useState(reduzido)
  const [ms, setMs] = useState(0)
  useEffect(() => {
    const r = requestAnimationFrame(() => setVisivel(true))
    return () => cancelAnimationFrame(r)
  }, [])
  const total = quadro.titulo.length + quadro.texto.length
  useEffect(() => {
    if (reduzido) return
    const ini = performance.now()
    const timer = setInterval(() => {
      const d = performance.now() - ini
      setMs(d)
      if ((d / 1000) * 40 >= total) clearInterval(timer)
    }, 50)
    return () => clearInterval(timer)
  }, [reduzido, total])

  // título primeiro, depois o texto (mesma velocidade)
  const titulo = reduzido ? quadro.titulo : trechoDigitado(quadro.titulo, ms)
  const corpo = reduzido ? quadro.texto : trechoDigitado(quadro.texto, Math.max(0, ms - (quadro.titulo.length / 40) * 1000))

  return (
    // cores cruas de propósito: faixas e texto de cinema são sempre preto e branco, em qualquer tema
    <div className={`absolute inset-0 transition-opacity duration-700 motion-reduce:transition-none ${visivel ? 'opacity-100' : 'opacity-0'}`}>
      {quadro.imagem_url && (
        <div className="absolute inset-0 overflow-hidden">
          <img src={quadro.imagem_url} alt="" referrerPolicy="no-referrer" className="cinematica-zoom w-full h-full object-cover" />
        </div>
      )}
      {(quadro.titulo || quadro.texto) && (
        <div className="absolute inset-x-0 bottom-[12vh] px-6 pt-16 pb-4 bg-gradient-to-t from-black/85 to-transparent">
          <div className="max-w-3xl mx-auto text-center text-white">
            {quadro.titulo && <h2 className="font-sora text-2xl sm:text-4xl font-semibold mb-2"><span className="sr-only" aria-live="polite">{quadro.titulo}</span><span aria-hidden="true">{titulo}</span></h2>}
            {quadro.texto && <p className="text-base sm:text-xl whitespace-pre-wrap"><span className="sr-only" aria-live="polite">{quadro.texto}</span><span aria-hidden="true">{corpo}</span></p>}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Fase 64 — tela cheia da cinemática, em portal acima de tudo.
 * `controles` (só gestor): { onAnterior, onProximo, onEncerrar }; quem joga só fecha para si.
 */
export default function CinematicaAoVivo({ aoVivo, controles = null, onFechar }) {
  const { preferencias, reduzido } = usePreferencias()
  const { quadro, indice, total } = aoVivo
  const raiz = useRef(null)
  const onFecharRef = useRef(onFechar)
  useEffect(() => { onFecharRef.current = onFechar })

  // foco: entra na tela cheia e volta a quem abriu; Esc fecha só para mim (o mestre usa "Encerrar").
  // `inert` no #root prende Tab e atalhos da página; a cena e os portais (Modal, Toast) ficam no body.
  const ehMestre = !!controles
  useEffect(() => {
    const anterior = document.activeElement
    const root = document.getElementById('root')
    root?.setAttribute('inert', '')
    raiz.current?.focus({ preventScroll: true })
    const tecla = e => {
      if (e.key === 'Escape' && !ehMestre) { e.stopPropagation(); onFecharRef.current() }
      // a busca global (Ctrl+K) abriria escondida sob a cena e capturaria o teclado
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); e.stopPropagation() }
    }
    document.addEventListener('keydown', tecla, true)
    return () => {
      document.removeEventListener('keydown', tecla, true)
      root?.removeAttribute('inert')
      if (anterior && document.contains(anterior)) anterior.focus?.({ preventScroll: true })
    }
  }, [ehMestre])

  // som ambiente do quadro, com as mesmas preferências do mapa
  const somRef = useRef(null)
  const volume = preferencias.som_acao_ativo ? preferencias.som_acao_volume : 0
  useEffect(() => {
    somRef.current = criarSomAmbiente()
    return () => { somRef.current.parar(); somRef.current = null }
  }, [])
  useEffect(() => {
    somRef.current?.atualizar(quadro.som ? { [quadro.som]: 0.8 * (volume || 0) } : {})
  }, [quadro.som, volume])

  // avanço automático: só no navegador do gestor (ponytail: precisa da aba do mestre aberta)
  const proximoRef = useRef(null)
  useEffect(() => { proximoRef.current = controles?.onProximo })
  const auto = !!controles && quadro.segundos > 0 && indice < total - 1
  useEffect(() => {
    if (!auto) return
    const timer = setTimeout(() => proximoRef.current?.(), quadro.segundos * 1000)
    return () => clearTimeout(timer)
  }, [auto, quadro.id, quadro.segundos])

  return createPortal(
    <div
      ref={raiz} role="dialog" aria-modal="true" aria-label={quadro.titulo || t('Cinemática')} tabIndex={-1}
      className="fixed inset-0 z-cinema bg-black outline-none overflow-hidden"
    >
      <Quadro key={quadro.id} quadro={quadro} reduzido={reduzido} />
      <div className="absolute inset-x-0 top-0 h-[10vh] min-h-12 bg-black flex items-center justify-end px-4">
        {!controles && <Botao variante="contorno" tamanho="sm" onClick={onFechar}>{t('Fechar para mim (Esc)')}</Botao>}
      </div>
      <div className="absolute inset-x-0 bottom-0 h-[10vh] min-h-12 bg-black flex items-center justify-center gap-3 px-4">
        {controles ? (
          <>
            <Botao variante="contorno" tamanho="sm" onClick={controles.onAnterior} disabled={indice <= 0}>{t('Anterior')}</Botao>
            <span className="text-white text-sm tabular-nums" aria-live="polite">{t('{n} de {total}', { n: indice + 1, total })}</span>
            <Botao variante="contorno" tamanho="sm" onClick={controles.onProximo} disabled={indice >= total - 1}>{t('Próximo')}</Botao>
            <Botao variante="perigo" tamanho="sm" onClick={controles.onEncerrar}>{t('Encerrar')}</Botao>
          </>
        ) : total > 1 && <span className="text-white/70 text-sm tabular-nums">{t('{n} de {total}', { n: indice + 1, total })}</span>}
      </div>
    </div>,
    document.body,
  )
}
