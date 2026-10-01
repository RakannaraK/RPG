import { useEffect, useRef } from 'react'

/**
 * Fase 52 — menu/popover aberto fecha ao clicar fora dele ou com Esc
 * (e o foco volta para o botão que abriu). Substitui a camada invisível
 * `fixed inset-0` que cada menu tinha.
 */
export function useFechaFora(ref, aberto, fechar, botaoRef = null) {
  const fecharRef = useRef(fechar)
  useEffect(() => { fecharRef.current = fechar })

  useEffect(() => {
    if (!aberto) return
    function fora(e) {
      if (ref.current?.contains(e.target) || botaoRef?.current?.contains(e.target)) return
      fecharRef.current()
    }
    function tecla(e) {
      if (e.key !== 'Escape') return
      fecharRef.current()
      botaoRef?.current?.focus()
    }
    document.addEventListener('mousedown', fora)
    document.addEventListener('touchstart', fora, { passive: true })
    document.addEventListener('keydown', tecla)
    return () => {
      document.removeEventListener('mousedown', fora)
      document.removeEventListener('touchstart', fora)
      document.removeEventListener('keydown', tecla)
    }
  }, [aberto, ref, botaoRef])
}
