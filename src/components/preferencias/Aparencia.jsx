import { useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { usePreferencias } from '../../context/PreferenciasContext'
import { useAuth } from '../../context/AuthContext'
import { LIMITE_SOM, extensaoDoSom, validarSom } from '../../lib/personalizacao'
import Botao from '../ui/Botao'
import Icone from '../ui/Icone'

const BUCKET = 'fichas-imagens' // mesmo bucket das imagens: pasta do próprio usuário

/** Lê a duração do áudio no navegador (o teto é de 15 s). */
function duracaoDoArquivo(arquivo) {
  return new Promise(resolve => {
    const url = URL.createObjectURL(arquivo)
    const audio = new Audio()
    audio.preload = 'metadata'
    audio.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(Number.isFinite(audio.duration) ? audio.duration : null) }
    audio.onerror = () => { URL.revokeObjectURL(url); resolve(null) }
    audio.src = url
  })
}

/**
 * Um som enviado pelo usuário (F35.3 crítico, F37 dado). Guarda a URL pública
 * na preferência `campo`; `campoVolume` diz em qual volume ele é tocado aqui.
 */
export function EnvioDeSom({ campo, campoVolume, pasta, titulo, dica, rodape }) {
  const { preferencias, salvarPreferencias } = usePreferencias()
  const { session } = useAuth()
  const inputRef = useRef(null)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')

  const som = preferencias[campo] || null

  async function enviarSom(e) {
    const arquivo = e.target.files?.[0]
    e.target.value = ''
    if (!arquivo) return
    setErro('')
    const duracao = await duracaoDoArquivo(arquivo)
    const checagem = validarSom(arquivo, duracao)
    if (!checagem.ok) { setErro(checagem.erro); return }
    setEnviando(true)
    try {
      const caminho = `${session.user.id}/sons/${pasta}-${Date.now()}.${extensaoDoSom(arquivo)}`
      const { error } = await supabase.storage.from(BUCKET).upload(caminho, arquivo, { upsert: true, contentType: arquivo.type })
      if (error) throw new Error(error.message)
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(caminho)
      await salvarPreferencias({ [campo]: data.publicUrl })
    } catch (err) {
      setErro(err.message || 'Não foi possível enviar o som.')
    } finally {
      setEnviando(false)
    }
  }

  function ouvir() {
    if (!som) return
    const audio = new Audio(som)
    audio.volume = preferencias[campoVolume] ?? 0.6
    audio.play().catch(() => setErro('O navegador bloqueou o som; clique de novo.'))
  }

  return (
    <div className="space-y-1.5">
      <p className="text-sm text-ink">
        {titulo} <span className="text-ink-dim">(até {LIMITE_SOM.segundos} s e {(LIMITE_SOM.bytes / 1_000_000).toFixed(1)} MB)</span>
      </p>
      {dica && <p className="text-ink-dim text-sm">{dica}</p>}
      <input ref={inputRef} type="file" accept="audio/*" onChange={enviarSom} className="hidden" />
      <div className="flex flex-wrap items-center gap-2">
        <Botao variante="secundario" onClick={() => inputRef.current?.click()} disabled={enviando}>
          <Icone nome="enviar" tamanho={16} /> {enviando ? 'Enviando…' : som ? 'Trocar som' : 'Enviar som'}
        </Botao>
        {som && (
          <>
            <Botao variante="contorno" type="button" onClick={ouvir}><Icone nome="volume" tamanho={16} /> Ouvir</Botao>
            <Botao variante="fantasma" className="hover:!text-harm" onClick={() => salvarPreferencias({ [campo]: null })}>Remover</Botao>
          </>
        )}
      </div>
      {som && rodape && <p className="text-ink-dim text-sm">{rodape}</p>}
      {erro && <p className="aviso-erro" role="alert">{erro}</p>}
    </div>
  )
}

/** F52 — escolha de uma opção entre poucas (botões lado a lado, como rádio). */
export function Escolha({ titulo, rotuloOculto, campo, opcoes }) {
  const { preferencias, salvarPreferencias } = usePreferencias()
  const atual = preferencias[campo] || opcoes[0].id
  const dica = opcoes.find(o => o.id === atual)?.dica
  return (
    <fieldset>
      <legend className={titulo ? 'text-xs text-ink-dim mb-1.5' : 'sr-only'}>{titulo || rotuloOculto}</legend>
      <div className="inline-flex flex-wrap gap-1 p-1 rounded-xl bg-void/60 border border-border">
        {opcoes.map(o => (
          <label
            key={o.id}
            className={`px-3.5 py-1.5 rounded-lg text-sm cursor-pointer transition-colors duration-rapida has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent-400 ${
              atual === o.id ? 'bg-accent-600 text-sobre-acento font-semibold shadow-nivel-1' : 'text-ink-dim hover:text-ink hover:bg-hover/70'
            }`}
          >
            <input type="radio" name={campo} value={o.id} checked={atual === o.id} onChange={() => salvarPreferencias({ [campo]: o.id })} className="sr-only" />
            {o.nome}
          </label>
        ))}
      </div>
      {dica && <p className="text-sm text-ink-dim mt-2">{dica}</p>}
    </fieldset>
  )
}
