import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { renderDie } from '../../lib/diceRenderer'
import { getSkin } from '../../lib/diceSkins'

// Este componente concentra TODO o código three.js. É carregado via lazy() pelo
// Dice3D, então o three.js fica num chunk separado fora do bundle inicial.

function criarGeometria(lados) {
  switch (lados) {
    case 4:  return new THREE.TetrahedronGeometry(1.5)
    case 6:  return new THREE.BoxGeometry(1.8, 1.8, 1.8)
    case 8:  return new THREE.OctahedronGeometry(1.5)
    case 12: return new THREE.DodecahedronGeometry(1.1)
    case 20: return new THREE.IcosahedronGeometry(1.3)
    default: return new THREE.IcosahedronGeometry(1.3) // d10, d100, etc.
  }
}

// Material three.js a partir de uma skin (ver lib/diceSkins.js).
// MeshPhysicalMaterial cobre metal, brilho emissivo e transmissão (cristal/gelo).
function criarMaterialSkin(skin) {
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

function criarCena(lados, skin) {
  const scene = new THREE.Scene()

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100)
  camera.position.z = 4.5

  scene.add(new THREE.AmbientLight(0xffffff, 0.55))
  const dir1 = new THREE.DirectionalLight(0xffffff, 1.2)
  dir1.position.set(5, 8, 5)
  scene.add(dir1)
  const dir2 = new THREE.DirectionalLight(0x8899ff, 0.3)
  dir2.position.set(-4, -3, 4)
  scene.add(dir2)

  const geometry = criarGeometria(lados)
  const material = criarMaterialSkin(skin)
  const mesh = new THREE.Mesh(geometry, material)
  mesh.rotation.set(0.4, 0.6, 0.15)
  scene.add(mesh)

  const edges = new THREE.EdgesGeometry(geometry)
  const edgeMat = new THREE.LineBasicMaterial({ color: 0xffffff, opacity: 0.25, transparent: true })
  mesh.add(new THREE.LineSegments(edges, edgeMat))

  return { scene, camera, mesh, geometry, material, edges, edgeMat }
}

function prefereReduzirMovimento() {
  return typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

export default function Dice3DWebGL({ lados, resultado, rolando, descartado, skin }) {
  const canvasRef = useRef(null)
  const threeRef = useRef(null)
  const frameRef = useRef(null)
  const skinFirstRun = useRef(true)
  const [showNum, setShowNum] = useState(true)

  // Build scene when component mounts or lados changes (geometry rebuild)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    if (threeRef.current) {
      const prev = threeRef.current
      prev.geometry.dispose()
      prev.material.dispose()
      prev.edges.dispose()
      prev.edgeMat.dispose()
    }

    const three = criarCena(lados, getSkin(skin))
    threeRef.current = three
    renderDie(three.scene, three.camera, canvas)

    return () => {
      cancelAnimationFrame(frameRef.current)
      three.geometry.dispose()
      three.material.dispose()
      three.edges.dispose()
      three.edgeMat.dispose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lados])

  // Skin change — swap only the material, keep geometry & running animation intact
  useEffect(() => {
    if (skinFirstRun.current) {
      skinFirstRun.current = false
      return
    }
    const three = threeRef.current
    const canvas = canvasRef.current
    if (!three || !canvas) return

    three.material.dispose()
    const mat = criarMaterialSkin(getSkin(skin))
    three.mesh.material = mat
    three.material = mat

    if (!rolando) renderDie(three.scene, three.camera, canvas)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skin])

  // Rolling animation — RAF loop runs only while the die is in motion
  useEffect(() => {
    const three = threeRef.current
    const canvas = canvasRef.current
    if (!three || !canvas || !rolando) return

    setShowNum(false)
    cancelAnimationFrame(frameRef.current)

    const reduzir = prefereReduzirMovimento()
    const start = performance.now()
    const duration = reduzir ? 400 : 1350
    const startRot = {
      x: three.mesh.rotation.x,
      y: three.mesh.rotation.y,
      z: three.mesh.rotation.z,
    }
    // Reduced motion: giro curto e sutil; normal: vários giros aleatórios
    const totalRot = reduzir
      ? { x: Math.PI, y: 2 * Math.PI, z: 0 }
      : {
          x: (Math.random() * 6 + 10) * Math.PI,
          y: (Math.random() * 6 + 10) * Math.PI,
          z: (Math.random() * 3 + 3)  * Math.PI,
        }

    function animate(now) {
      const t = Math.min((now - start) / duration, 1)
      const e = 1 - Math.pow(1 - t, 3) // ease-out cubic

      three.mesh.rotation.x = startRot.x + totalRot.x * e
      three.mesh.rotation.y = startRot.y + totalRot.y * e
      three.mesh.rotation.z = startRot.z + totalRot.z * e

      renderDie(three.scene, three.camera, canvas)

      if (t < 1) {
        frameRef.current = requestAnimationFrame(animate)
      } else {
        setShowNum(true)
      }
    }

    frameRef.current = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(frameRef.current)
      renderDie(three.scene, three.camera, canvas)
      setShowNum(true)
    }
  }, [rolando])

  const fontSize = resultado >= 100 ? 13 : resultado >= 10 ? 18 : 22

  return (
    <div
      role="img"
      aria-label={`Dado d${lados}, resultado ${resultado}${descartado ? ' (descartado)' : ''}`}
      className="relative inline-flex items-center justify-center"
      style={{ width: 64, height: 64, opacity: descartado ? 0.35 : 1 }}
    >
      <canvas ref={canvasRef} width={64} height={64} aria-hidden="true" />
      {/* Número visível para usuários com visão; o nome acessível vem do wrapper */}
      <span
        aria-hidden="true"
        className="absolute inset-0 flex items-center justify-center text-ink font-bold pointer-events-none select-none"
        style={{
          fontSize,
          opacity: showNum ? 1 : 0,
          transition: 'opacity 0.12s',
          textShadow: '0 1px 6px rgba(0,0,0,0.9), 0 0 14px rgba(0,0,0,0.7)',
        }}
      >
        {resultado}
      </span>
    </div>
  )
}
