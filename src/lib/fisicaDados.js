import * as THREE from 'three'
import * as CANNON from 'cannon-es'

/**
 * Fase 27 — física da bandeja de dados (three.js + cannon-es).
 * Importado SÓ pelo chunk lazy da bandeja: nada disto entra no bundle inicial.
 *
 * Mundo: chão no plano XZ (y para cima), paredes nas bordas da tela e teto.
 * O corpo de cada dado é gerado dos MESMOS vértices da geometria desenhada —
 * o que se vê é o que colide.
 */

export const PROFUNDIDADE_BANDEJA = 12 // unidades de mundo na altura da tela
const ALTURA_TETO = 14

export function criarGeometriaDado(lados) {
  switch (lados) {
    case 4: return new THREE.TetrahedronGeometry(0.8)
    case 6: return new THREE.BoxGeometry(0.95, 0.95, 0.95)
    case 8: return new THREE.OctahedronGeometry(0.72)
    case 12: return new THREE.DodecahedronGeometry(0.66)
    default: return new THREE.IcosahedronGeometry(0.72) // d20, d10, d100
  }
}

/**
 * Poliedro convexo do cannon a partir de uma geometria three: funde vértices e
 * junta triângulos do mesmo plano numa face só (o pentágono do d12 vira UMA
 * face, não três). Com faces trianguladas o contato alterna entre triângulos
 * coplanares e o dado nunca para de tremer.
 */
export function formaConvexa(geometry) {
  const pos = geometry.getAttribute('position')
  const idx = geometry.getIndex()
  const vertices = []
  const porChave = new Map()
  const indiceDe = i => {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i)
    const chave = `${Math.round(x * 1e4)},${Math.round(y * 1e4)},${Math.round(z * 1e4)}`
    if (!porChave.has(chave)) {
      porChave.set(chave, vertices.length)
      vertices.push(new CANNON.Vec3(x, y, z))
    }
    return porChave.get(chave)
  }
  // Triângulos agrupados por plano (normal arredondada)
  const planos = new Map()
  const total = idx ? idx.count : pos.count
  for (let t = 0; t + 2 < total; t += 3) {
    const a = indiceDe(idx ? idx.getX(t) : t)
    const b = indiceDe(idx ? idx.getX(t + 1) : t + 1)
    const c = indiceDe(idx ? idx.getX(t + 2) : t + 2)
    if (a === b || b === c || a === c) continue
    const n = new CANNON.Vec3()
    vertices[b].vsub(vertices[a]).cross(vertices[c].vsub(vertices[a]), n)
    n.normalize()
    const chave = `${Math.round(n.x * 1e3)},${Math.round(n.y * 1e3)},${Math.round(n.z * 1e3)}`
    if (!planos.has(chave)) planos.set(chave, { normal: n, indices: new Set() })
    const p = planos.get(chave)
    p.indices.add(a).add(b).add(c)
  }

  // Cada plano vira um polígono em ordem anti-horária vista de fora
  const faces = [...planos.values()].map(({ normal, indices }) => {
    const ids = [...indices]
    const centro = ids.reduce((s, i) => s.vadd(vertices[i]), new CANNON.Vec3()).scale(1 / ids.length)
    const u = vertices[ids[0]].vsub(centro)
    u.normalize()
    const w = normal.cross(u)
    const angulo = i => {
      const d = vertices[i].vsub(centro)
      return Math.atan2(d.dot(w), d.dot(u))
    }
    return ids.sort((i, j) => angulo(i) - angulo(j))
  })
  return new CANNON.ConvexPolyhedron({ vertices, faces })
}

function criarParede(world, material) {
  const corpo = new CANNON.Body({ mass: 0, material, shape: new CANNON.Plane() })
  world.addBody(corpo)
  return corpo
}

/** Mundo com gravidade, materiais de contato, chão, 4 paredes e teto. */
export function criarMundo(largura, profundidade = PROFUNDIDADE_BANDEJA) {
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -42, 0), allowSleep: true })
  world.broadphase = new CANNON.SAPBroadphase(world)
  // Com as 10 iterações padrão, faces grandes (pentágono do d12) perdem e
  // recuperam o contato com o chão e o dado leva "chutes" sem nunca dormir.
  world.solver.iterations = 30

  const matMesa = new CANNON.Material('mesa')
  const matDado = new CANNON.Material('dado')
  world.addContactMaterial(new CANNON.ContactMaterial(matMesa, matDado, { friction: 0.3, restitution: 0.42 }))
  world.addContactMaterial(new CANNON.ContactMaterial(matDado, matDado, { friction: 0.15, restitution: 0.35 }))

  const chao = criarParede(world, matMesa)
  chao.quaternion.setFromEuler(-Math.PI / 2, 0, 0) // normal +y
  const teto = criarParede(world, matMesa)
  teto.quaternion.setFromEuler(Math.PI / 2, 0, 0) // normal -y
  teto.position.set(0, ALTURA_TETO, 0)
  const paredes = { fundo: criarParede(world, matMesa), frente: criarParede(world, matMesa), esquerda: criarParede(world, matMesa), direita: criarParede(world, matMesa) }
  paredes.frente.quaternion.setFromEuler(0, Math.PI, 0) // normal -z
  paredes.esquerda.quaternion.setFromEuler(0, Math.PI / 2, 0) // normal +x
  paredes.direita.quaternion.setFromEuler(0, -Math.PI / 2, 0) // normal -x

  const mundo = { world, matDado, paredes }
  ajustarParedes(mundo, largura, profundidade)
  return mundo
}

/** Reposiciona as paredes quando a tela muda de tamanho. */
export function ajustarParedes({ paredes }, largura, profundidade = PROFUNDIDADE_BANDEJA) {
  paredes.fundo.position.set(0, 0, -profundidade / 2)
  paredes.frente.position.set(0, 0, profundidade / 2)
  paredes.esquerda.position.set(-largura / 2, 0, 0)
  paredes.direita.position.set(largura / 2, 0, 0)
}

/** Corpo físico de um dado já posicionado e arremessado conforme o plano (bandejaDados). */
export function criarCorpoDado(mundo, lados, plano, geometry = criarGeometriaDado(lados)) {
  const shape = lados === 6 ? new CANNON.Box(new CANNON.Vec3(0.475, 0.475, 0.475)) : formaConvexa(geometry)
  const body = new CANNON.Body({
    mass: 1,
    material: mundo.matDado,
    shape,
    allowSleep: true,
    sleepSpeedLimit: 0.2,
    sleepTimeLimit: 0.35,
    linearDamping: 0.08,
    angularDamping: 0.12,
  })
  body.position.set(plano.posicao.x, plano.posicao.y, plano.posicao.z)
  body.velocity.set(plano.velocidade.x, plano.velocidade.y, plano.velocidade.z)
  body.angularVelocity.set(plano.giro.x, plano.giro.y, plano.giro.z)
  body.quaternion.setFromEuler(plano.rotacao.x, plano.rotacao.y, plano.rotacao.z)
  mundo.world.addBody(body)
  return body
}

export const estaParado = body => body.sleepState === CANNON.Body.SLEEPING
