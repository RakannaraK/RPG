import { useLocation } from 'react-router-dom'
import { useEffect, useRef } from 'react'

// Reinicia a animação de entrada (fade + subida) a cada troca de pathname,
// SEM desmontar a árvore de filhos — evita derrubar componentes de página
// (e suas subscriptions) em navegações que só trocam parâmetros de rota.
export default function PageTransition({ children }) {
  const location = useLocation()
  const ref = useRef(null)
  const firstRender = useRef(true)

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    const el = ref.current
    if (!el) return
    el.classList.remove('page-transition')
    void el.offsetWidth
    el.classList.add('page-transition')
  }, [location.pathname])

  return (
    <div ref={ref} className="page-transition">
      {children}
    </div>
  )
}
