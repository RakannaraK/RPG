import { useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { usePreferencias } from '../../context/PreferenciasContext'
import { useAuth } from '../../context/AuthContext'
import { FONTES, LIMITE_SOM, TEMAS, extensaoDoSom, validarSom } from '../../lib/personalizacao'

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
function EnvioDeSom({ campo, campoVolume, pasta, titulo, dica, rodape }) {
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
      <p className="text-xs text-purple-400">
        {titulo} (até {LIMITE_SOM.segundos} s e {(LIMITE_SOM.bytes / 1_000_000).toFixed(1)} MB)
      </p>
      {dica && <p className="text-accent-300 text-[11px]">{dica}</p>}
      <input ref={inputRef} type="file" accept="audio/*" onChange={enviarSom} className="hidden" />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button" onClick={() => inputRef.current?.click()} disabled={enviando}
          className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white text-sm"
        >{enviando ? 'Enviando…' : som ? 'Trocar som' : 'Enviar som'}</button>
        {som && (
          <>
            <button type="button" onClick={ouvir} className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm">🔊 Ouvir</button>
            <button
              type="button" onClick={() => salvarPreferencias({ [campo]: null })}
              className="px-2 py-1.5 text-red-400 hover:text-red-300 text-sm"
            >Remover</button>
          </>
        )}
      </div>
      {som && rodape && <p className="text-accent-300 text-[11px]">{rodape}</p>}
      {erro && <p className="text-red-400 text-xs">{erro}</p>}
    </div>
  )
}

/**
 * Fase 35.2 + 35.3 (+ F37) — aparência (tema e fonte) e sons próprios.
 * Tudo por usuário: ninguém mexe no que os outros veem/ouvem.
 */
export default function Aparencia() {
  const { preferencias, salvarPreferencias } = usePreferencias()

  const tema = preferencias.tema || 'violeta'
  const fonte = preferencias.fonte || 'padrao'

  return (
    <div className="space-y-4 border-t border-purple-900 pt-5">
      <div>
        <p className="text-sm font-medium text-purple-200">Aparência</p>
        <p className="text-xs text-purple-400">Vale só para você, no site todo.</p>
      </div>

      <div>
        <p className="text-xs text-purple-400 mb-1.5">Cor do tema</p>
        <div className="flex flex-wrap gap-2">
          {TEMAS.map(t => (
            <button
              key={t.id} type="button" onClick={() => salvarPreferencias({ tema: t.id })}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs transition-colors ${
                tema === t.id ? 'border-purple-400 bg-purple-900/40 text-white' : 'border-purple-800 text-purple-300 hover:border-purple-600'
              }`}
            >
              <span className="w-3.5 h-3.5 rounded-full border border-white/25" style={{ background: t.amostra }} />
              {t.nome}
            </button>
          ))}
        </div>
      </div>

      <label className="block">
        <span className="text-xs text-purple-400">Fonte</span>
        <select
          value={fonte} onChange={e => salvarPreferencias({ fonte: e.target.value })}
          className="mt-1 w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-purple-800 text-white text-sm"
        >
          {FONTES.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
        </select>
      </label>

      <EnvioDeSom
        campo="som_dado_url" campoVolume="som_volume" pasta="dado"
        titulo="Som de dado próprio"
        dica="Toca no lugar do som sintetizado, em todas as skins. Curto (menos de 1 s) fica melhor."
        rodape="Você ouve o seu som em toda rolagem; os outros ouvem o deles."
      />

      <EnvioDeSom
        campo="som_critico_url" campoVolume="som_acao_volume" pasta="critico"
        titulo="Som de crítico próprio"
        rodape="Toca no lugar do som padrão quando sai um crítico."
      />
    </div>
  )
}
