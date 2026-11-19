import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { MAX_PARTICIPANTES, servidoresIce, quemOferece, normalizarSinal, participantesDaPresenca } from '../lib/chamada'
import { t } from '../i18n'

const ICE = servidoresIce(import.meta.env.VITE_ICE_SERVERS)
const AUDIO = { echoCancellation: true, noiseSuppression: true, autoGainControl: true }

/**
 * Fase 65 — chamada de voz e vídeo da mesa: WebRTC em malha, sinalização por um
 * canal privado `chamada:<mesa>` (exceção ao sufixo useId: o tópico é fixo).
 * Quem só olha escuta a presença (contagem) mas não anuncia nem pede mídia.
 */
export function useChamada(mesaId) {
  const { session } = useAuth()
  const userId = session?.user?.id
  const [meuId] = useState(() => crypto.randomUUID())
  const [estado, setEstado] = useState('fora')
  const [participantes, setParticipantes] = useState([])
  const [fluxos, setFluxos] = useState({})
  const [micLigado, setMicLigado] = useState(true)
  const [camLigada, setCamLigada] = useState(false)
  const [erro, setErro] = useState(null)

  // tudo que os ouvintes do canal precisam ler sem refazer a assinatura
  const r = useRef({ canal: null, ok: false, dentro: false, pares: new Map(), mic: null, cam: null, info: null, vivo: true, lista: [], tent: {}, falhou: null })
  const [ligacao, setLigacao] = useState({})

  const enviar = useCallback(payload => {
    r.current.canal?.send({ type: 'broadcast', event: 'sinal', payload })
  }, [])

  const anunciar = useCallback(() => {
    const { canal, mic, cam, info } = r.current
    canal?.track({ ...info, mic: !!mic?.enabled, cam: !!cam })
  }, [])

  const fecharPar = useCallback(id => {
    const par = r.current.pares.get(id)
    if (!par) return
    par.pc.close()
    r.current.pares.delete(id)
    setFluxos(f => {
      if (!(id in f)) return f
      const { [id]: _fora, ...resto } = f
      return resto
    })
  }, [])

  const criarPar = useCallback(id => {
    const pc = new RTCPeerConnection({ iceServers: ICE })
    const remoto = new MediaStream()
    const par = { pc, fila: [] }
    pc.onicecandidate = e => {
      if (e.candidate) enviar({ de: meuId, para: id, tipo: 'candidato', candidato: e.candidate.toJSON() })
    }
    pc.onconnectionstatechange = () => {
      if (r.current.pares.get(id)?.pc !== pc) return
      if (pc.connectionState === 'connected') {
        delete r.current.tent[id]
        setLigacao(l => { const { [id]: _x, ...resto } = l; return resto })
      } else if (pc.connectionState === 'failed') r.current.falhou?.(id)
    }
    pc.ontrack = e => {
      remoto.addTrack(e.track)
      setFluxos(f => (f[id] === remoto ? f : { ...f, [id]: remoto }))
    }
    r.current.pares.set(id, par)
    return par
  }, [enviar, meuId])

  const sair = useCallback(() => {
    const c = r.current
    c.dentro = false
    for (const id of [...c.pares.keys()]) fecharPar(id)
    c.mic?.stop()
    c.cam?.stop()
    c.mic = c.cam = null
    try { c.canal?.untrack() } catch { /* noop */ }
    c.tent = {}
    setLigacao({})
    setFluxos({})
    setMicLigado(true)
    setCamLigada(false)
    setEstado('fora')
  }, [fecharPar])

  useEffect(() => {
    if (!mesaId || !userId) return
    const c = r.current
    c.vivo = true
    let cancelado = false
    let canal

    // oferta, resposta e candidatos chegam aqui (dado não confiável)
    async function aoReceber({ payload }) {
      const s = normalizarSinal(payload)
      if (!s || s.para !== meuId || s.de === meuId || !c.dentro) return
      try {
        if (s.tipo === 'oferta') {
          // só aceita de quem está na presença, é outra pessoa e é quem deve oferecer
          const de = c.lista.find(p => p.id === s.de)
          if (!de || de.usuarioId === userId || !quemOferece(s.de, meuId)) return
          fecharPar(s.de)
          if (c.pares.size >= MAX_PARTICIPANTES - 1) return
          const par = criarPar(s.de)
          await par.pc.setRemoteDescription({ type: 'offer', sdp: s.sdp })
          for (const tr of par.pc.getTransceivers()) {
            tr.direction = 'sendrecv'
            tr.sender.replaceTrack(tr.receiver.track.kind === 'audio' ? c.mic : c.cam)
          }
          while (par.fila.length) await par.pc.addIceCandidate(par.fila.shift()).catch(() => {})
          const resposta = await par.pc.createAnswer()
          await par.pc.setLocalDescription(resposta)
          enviar({ de: meuId, para: s.de, tipo: 'resposta', sdp: resposta.sdp })
        } else if (s.tipo === 'resposta') {
          const par = c.pares.get(s.de)
          if (!par || par.pc.signalingState !== 'have-local-offer') return
          await par.pc.setRemoteDescription({ type: 'answer', sdp: s.sdp })
          while (par.fila.length) await par.pc.addIceCandidate(par.fila.shift()).catch(() => {})
        } else {
          const par = c.pares.get(s.de)
          if (!par) return
          if (par.pc.remoteDescription) await par.pc.addIceCandidate(s.candidato).catch(() => {})
          else par.fila.push(s.candidato)
        }
      } catch { /* um par que falha não derruba a chamada */ }
    }

    async function ofertar(id) {
      const par = criarPar(id)
      par.pc.addTransceiver(c.mic, { direction: 'sendrecv' })
      const video = par.pc.addTransceiver('video', { direction: 'sendrecv' })
      if (c.cam) video.sender.replaceTrack(c.cam)
      try {
        await par.pc.setLocalDescription(await par.pc.createOffer())
        enviar({ de: meuId, para: id, tipo: 'oferta', sdp: par.pc.localDescription.sdp })
      } catch { fecharPar(id) }
    }

    // ponytail: sem TURN algumas redes nunca fecham a ligação; 2 novas tentativas e desiste
    c.falhou = id => {
      fecharPar(id)
      const f = (c.tent[id] = (c.tent[id] || 0) + 1)
      setLigacao(l => ({ ...l, [id]: f <= 2 ? 'reconectando' : 'sem' }))
      if (f <= 2 && quemOferece(meuId, id)) ofertar(id)
    }

    function aoSincronizar() {
      const lista = participantesDaPresenca(canal.presenceState())
      c.lista = lista
      setParticipantes(lista)
      if (!c.dentro) return
      const ids = lista.map(p => p.id)
      for (const id of [...c.pares.keys()]) if (!ids.includes(id)) fecharPar(id)
      for (const id of Object.keys(c.tent)) if (!ids.includes(id)) delete c.tent[id]
      setLigacao(l => (Object.keys(l).every(id => ids.includes(id)) ? l : Object.fromEntries(Object.entries(l).filter(([id]) => ids.includes(id)))))
      // ponytail: malha, cada par abre uma conexão; acima de ~6 com vídeo pesa na banda
      for (const p of lista) {
        // mesma pessoa em outra aba: não liga consigo mesma (ouviria o próprio eco)
        if (p.id !== meuId && p.usuarioId !== userId && !c.pares.has(p.id) && !(c.tent[p.id] > 2) && quemOferece(meuId, p.id)) ofertar(p.id)
      }
    }

    async function montar() {
      await supabase.realtime.setAuth()
      // voltar à mesma mesa antes do removeChannel terminar devolveria o canal velho
      const velho = supabase.getChannels().find(x => x.topic.endsWith(`chamada:${mesaId}`))
      if (velho) await supabase.removeChannel(velho)
      if (cancelado) return
      canal = supabase.channel(`chamada:${mesaId}`, {
        config: { private: true, broadcast: { self: false }, presence: { key: meuId } },
      })
      canal.on('presence', { event: 'sync' }, aoSincronizar)
      canal.on('broadcast', { event: 'sinal' }, aoReceber)
      canal.subscribe(status => {
        c.ok = status === 'SUBSCRIBED'
      })
      c.canal = canal
    }
    montar().catch(() => {})

    const aoFechar = () => sair()
    window.addEventListener('pagehide', aoFechar)
    return () => {
      cancelado = true
      c.vivo = false
      window.removeEventListener('pagehide', aoFechar)
      sair()
      if (canal) supabase.removeChannel(canal)
      c.canal = null
      c.ok = false
      setParticipantes([])
    }
  }, [mesaId, userId, meuId, criarPar, fecharPar, enviar, sair])

  const entrar = useCallback(async () => {
    const c = r.current
    if (c.dentro || !userId) return
    setErro(null)
    if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) {
      setErro(t('Este navegador não tem suporte a chamada de voz.'))
      return
    }
    if (!c.ok) { setErro(t('Não foi possível entrar no canal da chamada. Tente de novo em instantes.')); return }
    if (participantes.length >= MAX_PARTICIPANTES) { setErro(t('Chamada cheia ({n} pessoas).', { n: MAX_PARTICIPANTES })); return }
    setEstado('entrando')
    let stream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: AUDIO })
    } catch (e) {
      setErro(e?.name === 'NotAllowedError' ? t('Permissão do microfone negada. Libere o microfone no navegador.') : t('Não foi possível usar o microfone.'))
      setEstado('fora')
      return
    }
    // mesma fonte da presença da sessão: apelido/avatar da mesa, depois username
    let nome = null
    let avatar = null
    try {
      const { data: m } = await supabase.from('membros_mesa').select('apelido, avatar_url').eq('mesa_id', mesaId).eq('usuario_id', userId).maybeSingle()
      nome = m?.apelido || null
      avatar = m?.avatar_url || null
      if (!nome) {
        const { data: p } = await supabase.from('profiles').select('username').eq('id', userId).single()
        nome = p?.username || null
      }
    } catch { /* cai no "Jogador" */ }
    if (!c.vivo || !c.canal) { stream.getTracks().forEach(tr => tr.stop()); return }
    c.mic = stream.getAudioTracks()[0]
    c.info = { usuarioId: userId, nome: nome || 'Jogador', avatar }
    c.dentro = true
    setFluxos({ [meuId]: stream })
    try {
      if (await c.canal.track({ ...c.info, mic: true, cam: false }) !== 'ok') throw new Error('track')
    } catch {
      sair()
      setErro(t('Não foi possível entrar no canal da chamada.'))
      return
    }
    setEstado('dentro')
  }, [userId, mesaId, meuId, participantes.length, sair])

  const alternarMic = useCallback(() => {
    const { mic } = r.current
    if (!mic) return
    mic.enabled = !mic.enabled
    setMicLigado(mic.enabled)
    anunciar()
  }, [anunciar])

  const alternarCam = useCallback(async () => {
    const c = r.current
    if (!c.dentro) return
    const trocar = faixa => {
      for (const { pc } of c.pares.values()) {
        pc.getTransceivers().find(tr => tr.receiver.track.kind === 'video')?.sender.replaceTrack(faixa)
      }
      setFluxos(f => ({ ...f, [meuId]: new MediaStream([c.mic, ...(faixa ? [faixa] : [])]) }))
    }
    if (c.cam) {
      c.cam.stop()
      c.cam = null
      trocar(null)
      setCamLigada(false)
    } else {
      setErro(null)
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: true })
        if (!c.dentro) { s.getTracks().forEach(tr => tr.stop()); return }
        c.cam = s.getVideoTracks()[0]
        trocar(c.cam)
        setCamLigada(true)
      } catch (e) {
        setErro(e?.name === 'NotAllowedError' ? t('Permissão da câmera negada. Libere a câmera no navegador.') : t('Não foi possível usar a câmera.'))
        return
      }
    }
    anunciar()
  }, [anunciar, meuId])

  return {
    estado, participantes: participantes.map(p => ({ ...p, ligacao: ligacao[p.id] })), naChamada: estado === 'dentro', entrar, sair,
    micLigado, alternarMic, camLigada, alternarCam, fluxos, erro, meuId,
  }
}
