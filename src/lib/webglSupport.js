// Detecção de WebGL — módulo leve, SEM importar three.js, para que o bundle
// inicial não carregue o three só para decidir entre dado 3D e fallback CSS.

let _cache = null

export function isWebGLAvailable() {
  if (_cache !== null) return _cache
  try {
    const canvas = document.createElement('canvas')
    _cache = !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
  } catch {
    _cache = false
  }
  return _cache
}
