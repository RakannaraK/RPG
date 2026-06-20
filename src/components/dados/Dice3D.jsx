import { lazy, Suspense } from 'react'
import { isWebGLAvailable } from '../../lib/webglSupport'
import { SKIN_PADRAO } from '../../lib/diceSkins'
import Dice3DCSS from './Dice3DCSS'

// O componente three.js fica num chunk separado, carregado sob demanda.
// Enquanto carrega (ou se faltar WebGL), mostra o dado CSS da Fase 7.
const Dice3DWebGL = lazy(() => import('./Dice3DWebGL'))

const webglOk = typeof document !== 'undefined' && isWebGLAvailable()

/**
 * Dado 3D — poliedro three.js (lazy) com fallback para o CSS da Fase 7.
 *
 * Props (compatíveis com a Fase 7 — `skin` é novo e opcional):
 *   lados      — 4 | 6 | 8 | 10 | 12 | 20 | 100
 *   resultado  — valor final (1..lados)
 *   rolando    — true enquanto a animação deve tocar
 *   descartado — true quando descartado por kh/kl (visual dimmed)
 *   skin       — id da skin (ver lib/diceSkins.js); default 'padrao'
 */
export default function Dice3D({ lados, resultado, rolando, descartado = false, skin = SKIN_PADRAO }) {
  // Sem WebGL: nunca carrega o chunk three.js, usa direto o fallback CSS.
  if (!webglOk) {
    return <Dice3DCSS lados={lados} resultado={resultado} rolando={rolando} descartado={descartado} />
  }
  return (
    <Suspense
      fallback={
        <Dice3DCSS lados={lados} resultado={resultado} rolando={rolando} descartado={descartado} />
      }
    >
      <Dice3DWebGL
        lados={lados}
        resultado={resultado}
        rolando={rolando}
        descartado={descartado}
        skin={skin}
      />
    </Suspense>
  )
}
