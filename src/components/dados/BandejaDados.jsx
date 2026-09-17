import { lazy, Suspense, useState } from 'react'
import { isWebGLAvailable } from '../../lib/webglSupport'

// three.js + cannon-es num chunk separado, baixado só no primeiro lançamento.
const BandejaDados3D = lazy(() => import('./BandejaDados3D'))

/** Sem WebGL ou com "reduzir movimento" a bandeja não aparece (os dados dos cards bastam). */
export const bandejaSuportada = typeof window !== 'undefined'
  && isWebGLAvailable()
  && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * Fase 27 — invólucro leve da bandeja (fica no bundle inicial).
 * Depois do primeiro lançamento a bandeja fica montada e ociosa: recriar o
 * contexto WebGL a cada rolagem custaria mais do que mantê-lo parado.
 */
export default function BandejaDados({ lancamentos, onTerminou }) {
  const [montada, setMontada] = useState(false)
  if (!bandejaSuportada) return null
  if (!montada && lancamentos.length > 0) setMontada(true)
  if (!montada) return null
  return (
    <Suspense fallback={null}>
      <BandejaDados3D lancamentos={lancamentos} onTerminou={onTerminou} />
    </Suspense>
  )
}
