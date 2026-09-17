import * as THREE from 'three'

// Material three.js a partir de uma skin (ver lib/diceSkins.js).
// MeshPhysicalMaterial cobre metal, brilho emissivo e transmissão (cristal/gelo).
// Importado só por módulos lazy (Dice3DWebGL, BandejaDados3D) — three fora do bundle inicial.
export function criarMaterialSkin(skin) {
  const mat = new THREE.MeshPhysicalMaterial({
    color: skin.cor,
    metalness: skin.metalness ?? 0.3,
    roughness: skin.roughness ?? 0.5,
    emissive: skin.emissive ?? 0x000000,
  })

  if ((skin.emissive ?? 0x000000) !== 0x000000) {
    mat.emissiveIntensity = 0.85
  }

  if (skin.transmissivo) {
    mat.transmission = 0.9
    mat.thickness = 1.5
    mat.ior = 1.4
    mat.transparent = true
    mat.opacity = skin.opacity ?? 1
  } else if ((skin.opacity ?? 1) < 1) {
    mat.transparent = true
    mat.opacity = skin.opacity
  }

  return mat
}
