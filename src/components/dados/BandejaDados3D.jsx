import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import * as THREE from 'three'
import { getSkin } from '../../lib/diceSkins'
import { criarMaterialSkin } from '../../lib/materialDado'
import { PROFUNDIDADE_BANDEJA, ajustarParedes, criarCorpoDado, criarGeometriaDado, criarMundo, estaParado } from '../../lib/fisicaDados'
import { planejarLancamento } from '../../lib/bandejaDados'

// Em segundos de FÍSICA (não de relógio): num aparelho lento a simulação anda
// mais devagar e o valor não pode aparecer com o dado ainda no ar.
const TEMPO_MAX_ROLANDO = 4 // se algum dado não dormir, mostra o valor assim mesmo
const TEMPO_EXIBINDO = 2400
const TEMPO_SAINDO = 450
const SOMBRA_TEXTO = '0 2px 8px rgba(0,0,0,.95), 0 0 18px rgba(0,0,0,.8)'

/**
 * Fase 27 — bandeja de dados em tela cheia (chunk lazy: three.js + cannon-es).
 *
 * Canvas transparente por cima de tudo, sem capturar clique. Cada lançamento
 * cria corpos físicos + malhas; ao todos pararem aparecem os valores OFICIAIS
 * (vindos da rolagem, nunca da face de cima), ficam um instante e somem.
 * A física roda só enquanto há dados na tela (ocioso = zero GPU).
 *
 * Props: lancamentos [{ id, dados:[{lados,valor,descartado}], skin, excedente, autor }]
 *        onTerminou(id) — o lançamento saiu da tela
 */
export default function BandejaDados3D({ lancamentos, onTerminou }) {
  const canvasRef = useRef(null)
  const motorRef = useRef(null)
  const rotulosRef = useRef(new Map())
  const onTerminouRef = useRef(onTerminou)
  const [rotulos, setRotulos] = useState([]) // [{ chave, lancamentoId, valor, descartado }]
  const [selos, setSelos] = useState([])     // [{ id, texto }]

  useEffect(() => { onTerminouRef.current = onTerminou }, [onTerminou])

  // Renderer, cena, câmera e mundo: montados uma vez, desmontados com dispose.
  useEffect(() => {
    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: true, alpha: true })
    renderer.setClearColor(0x000000, 0)
    renderer.shadowMap.enabled = true

    const scene = new THREE.Scene()
    scene.add(new THREE.AmbientLight(0xffffff, 0.65))
    const luz = new THREE.DirectionalLight(0xffffff, 1.5)
    luz.position.set(-6, 22, 9)
    luz.castShadow = true
    luz.shadow.mapSize.set(1024, 1024)
    Object.assign(luz.shadow.camera, { left: -24, right: 24, top: 14, bottom: -14, near: 1, far: 70 })
    scene.add(luz)
    const chao = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.ShadowMaterial({ opacity: 0.35 }))
    chao.rotation.x = -Math.PI / 2
    chao.receiveShadow = true
    scene.add(chao)

    // Câmera olhando de cima; topo da tela = fundo da bandeja (-z)
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 300)
    camera.up.set(0, 0, -1)
    const mundo = criarMundo(20)
    const ativos = new Map() // id → { dados, material, arestaMat, opacidadeBase, tMundo0, fase, tFase }
    const projetado = new THREE.Vector3()
    let largura = 20
    let profundidade = PROFUNDIDADE_BANDEJA
    let raf = 0
    let anterior = 0
    let telaW = 1
    let telaH = 1

    function redimensionar() {
      // Tamanho real da camada (sem a barra de rolagem), igual para desenho e rótulos
      const w = (telaW = canvasRef.current.clientWidth || window.innerWidth)
      const h = (telaH = canvasRef.current.clientHeight || window.innerHeight)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, w < 768 ? 1.5 : 2))
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      // O LADO MENOR da tela mede N unidades (dado ≈ 1 unidade): no celular em pé
      // a bandeja fica alta em vez de estreita, e o dado não ocupa 1/5 da tela.
      const menorLado = Math.min(w, h) < 600 ? 9 : PROFUNDIDADE_BANDEJA
      largura = w >= h ? menorLado * camera.aspect : menorLado
      profundidade = w >= h ? menorLado : menorLado / camera.aspect
      const distancia = profundidade / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
      camera.position.set(0, distancia, 0)
      camera.lookAt(0, 0, 0)
      camera.updateProjectionMatrix()
      ajustarParedes(mundo, largura, profundidade)
    }

    function lancar(l) {
      const material = criarMaterialSkin(getSkin(l.skin))
      const arestaMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 })
      const planos = planejarLancamento(l.dados.length, { largura, profundidade })
      const dados = l.dados.map((d, i) => {
        const geometry = criarGeometriaDado(d.lados)
        const arestas = new THREE.EdgesGeometry(geometry)
        const body = criarCorpoDado(mundo, d.lados, planos[i], geometry)
        const mesh = new THREE.Mesh(geometry, material)
        mesh.castShadow = true
        mesh.add(new THREE.LineSegments(arestas, arestaMat))
        scene.add(mesh)
        return { body, mesh, geometry, arestas, valor: d.valor, descartado: !!d.descartado, chave: `${l.id}:${i}` }
      })
      ativos.set(l.id, { dados, material, arestaMat, opacidadeBase: material.opacity, tMundo0: mundo.world.time, fase: 'rolando', tFase: 0 })
      if (l.excedente) {
        setSelos(s => [...s, { id: l.id, texto: `${l.autor ? `${l.autor}: ` : ''}+${l.excedente.qtd} dados (soma ${l.excedente.soma})` }])
      }
    }

    function remover(id, avisar) {
      const a = ativos.get(id)
      if (!a) return
      for (const d of a.dados) {
        mundo.world.removeBody(d.body)
        scene.remove(d.mesh)
        d.geometry.dispose()
        d.arestas.dispose()
      }
      a.material.dispose()
      a.arestaMat.dispose()
      ativos.delete(id)
      setRotulos(r => r.filter(x => x.lancamentoId !== id))
      setSelos(s => s.filter(x => x.id !== id))
      if (avisar) onTerminouRef.current?.(id)
    }

    function posicionarRotulo(d, opacidade) {
      const el = rotulosRef.current.get(d.chave)
      if (!el) return
      projetado.set(d.body.position.x, d.body.position.y + 0.9, d.body.position.z).project(camera)
      const x = ((projetado.x + 1) / 2) * telaW
      const y = ((1 - projetado.y) / 2) * telaH
      el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`
      el.style.opacity = String((d.descartado ? 0.45 : 1) * opacidade)
    }

    function quadro(agora) {
      mundo.world.step(1 / 60, Math.min(0.05, (agora - (anterior || agora)) / 1000), 5)
      anterior = agora
      for (const [id, a] of ativos) {
        for (const d of a.dados) {
          d.mesh.position.copy(d.body.position)
          d.mesh.quaternion.copy(d.body.quaternion)
        }
        if (a.fase === 'rolando' && (a.dados.every(d => estaParado(d.body)) || mundo.world.time - a.tMundo0 > TEMPO_MAX_ROLANDO)) {
          a.fase = 'parado'
          a.tFase = agora
          setRotulos(r => [...r, ...a.dados.map(d => ({ chave: d.chave, lancamentoId: id, valor: d.valor, descartado: d.descartado }))])
        } else if (a.fase === 'parado' && agora - a.tFase > TEMPO_EXIBINDO) {
          a.fase = 'saindo'
          a.tFase = agora
          a.material.transparent = true
          a.material.needsUpdate = true
        }
        const k = a.fase === 'saindo' ? Math.min(1, (agora - a.tFase) / TEMPO_SAINDO) : 0
        if (a.fase === 'saindo') {
          a.material.opacity = a.opacidadeBase * (1 - k)
          a.arestaMat.opacity = 0.3 * (1 - k)
        }
        if (a.fase !== 'rolando') for (const d of a.dados) posicionarRotulo(d, 1 - k)
        if (k >= 1) remover(id, true)
      }
      renderer.render(scene, camera)
      if (ativos.size) raf = requestAnimationFrame(quadro)
      else {
        raf = 0
        anterior = 0
      }
    }

    motorRef.current = {
      /** Deixa a cena igual à fila: lança os novos, tira os que saíram da fila. */
      sincronizar(fila) {
        const ids = new Set(fila.map(l => l.id))
        for (const id of [...ativos.keys()]) if (!ids.has(id)) remover(id, false)
        for (const l of fila) if (!ativos.has(l.id)) lancar(l)
        if (ativos.size && !raf) raf = requestAnimationFrame(quadro)
      },
    }

    redimensionar()
    window.addEventListener('resize', redimensionar)
    return () => {
      window.removeEventListener('resize', redimensionar)
      cancelAnimationFrame(raf)
      for (const id of [...ativos.keys()]) remover(id, false)
      chao.geometry.dispose()
      chao.material.dispose()
      renderer.dispose()
      motorRef.current = null
    }
  }, [])

  useEffect(() => { motorRef.current?.sincronizar(lancamentos) }, [lancamentos])

  // Portal no <body>: um `transform` em qualquer ancestral (a transição de página
  // tem) faria o `fixed` se prender à página inteira em vez da tela.
  return createPortal(
    <div className="fixed inset-0 pointer-events-none z-[60]" aria-hidden="true">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      {rotulos.map(r => (
        <span
          key={r.chave}
          ref={el => {
            if (el) rotulosRef.current.set(r.chave, el)
            else rotulosRef.current.delete(r.chave)
          }}
          className="absolute left-0 top-0 text-2xl font-bold text-white tabular-nums"
          style={{ transform: 'translate(-9999px, 0)', textShadow: SOMBRA_TEXTO, textDecoration: r.descartado ? 'line-through' : 'none' }}
        >
          {r.valor}
        </span>
      ))}
      {selos.length > 0 && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
          {selos.map(s => (
            <span key={s.id} className="rounded-full border border-border bg-bg/90 px-3 py-1 text-sm text-ink">{s.texto}</span>
          ))}
        </div>
      )}
    </div>,
    document.body
  )
}
