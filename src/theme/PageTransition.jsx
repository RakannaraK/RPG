import { useLocation } from 'react-router-dom'
import { useLayoutEffect, useRef } from 'react'

// Transição de página (F52). A classe `pagina-entra` fica sempre ligada: todo
// conteúdo de página que MONTA já entra animado (theme/motion.css). Quando a
// rota muda mas a página é a mesma (/mesa/1 → /mesa/2), nada monta de novo —
// aí a animação é reiniciada aqui, antes de pintar (layout effect), sem
// desmontar a árvore (as subscriptions da página continuam vivas).
export default function PageTransition({ children }) {
  const { pathname } = useLocation()
  const ref = useRef(null)
  const anterior = useRef(pathname)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el || anterior.current === pathname) return
    anterior.current = pathname
    el.classList.remove('pagina-entra')
    void el.offsetWidth
    el.classList.add('pagina-entra')
  }, [pathname])

  return (
    <div ref={ref} className="pagina pagina-entra">
      {children}
    </div>
  )
}
