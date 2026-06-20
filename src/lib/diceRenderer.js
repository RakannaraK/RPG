import * as THREE from 'three'

// Singleton WebGL renderer — one GL context shared by all Dice3D instances.
// Each die gets its own visible <canvas> (2D context); this renderer draws
// into its internal offscreen buffer and copies pixels via drawImage().
//
// Importado apenas pelo chunk lazy (Dice3DWebGL) — assim o three.js não entra
// no bundle inicial. A detecção de WebGL fica em lib/webglSupport.js (sem three).
let renderer = null

function getRenderer() {
  if (renderer) return renderer
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true, // needed for drawImage() copy after render
  })
  renderer.setSize(64, 64)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(0x000000, 0)
  return renderer
}

/**
 * Renders one die's scene into its visible 2D canvas.
 * Sequential calls are safe — JS is single-threaded.
 */
export function renderDie(scene, camera, targetCanvas) {
  const r = getRenderer()
  r.render(scene, camera)
  const ctx = targetCanvas.getContext('2d')
  ctx.clearRect(0, 0, 64, 64)
  ctx.drawImage(r.domElement, 0, 0)
}
