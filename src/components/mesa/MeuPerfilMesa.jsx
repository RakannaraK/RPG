import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { redimensionarImagem } from '../../lib/imageUtils'

/**
 * Fase 16.6 — "Meu perfil nesta mesa": apelido + avatar específicos da mesa.
 * Persiste via RPC atualizar_perfil_mesa (membros_mesa não tem UPDATE direto).
 * Avatar vai no bucket fichas-imagens, na pasta do próprio usuário (${uid}/...).
 */
export default function MeuPerfilMesa({ mesaId, usuarioId, username, apelidoInicial, avatarInicial, onSaved }) {
  const [apelido, setApelido] = useState(apelidoInicial || '')
  const [avatarUrl, setAvatarUrl] = useState(avatarInicial || '')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState('')
  const [salvo, setSalvo] = useState(false)

  async function handleAvatar(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setErro('')
    try {
      const resized = await redimensionarImagem(file)
      const path = `${usuarioId}/avatars/${Date.now()}.jpg`
      const { error: upErr } = await supabase.storage
        .from('fichas-imagens')
        .upload(path, resized, { contentType: 'image/jpeg' })
      if (upErr) throw upErr
      const { data } = supabase.storage.from('fichas-imagens').getPublicUrl(path)
      setAvatarUrl(data.publicUrl)
    } catch (err) {
      setErro(err.message || 'Erro ao enviar avatar.')
    } finally {
      setUploading(false)
    }
  }

  async function salvar() {
    setSaving(true)
    setErro('')
    try {
      const { error: err } = await supabase.rpc('atualizar_perfil_mesa', {
        p_mesa_id: mesaId,
        p_apelido: apelido,
        p_avatar_url: avatarUrl,
      })
      if (err) throw err
      onSaved?.(apelido.trim() || null, avatarUrl || null)
      setSalvo(true)
      setTimeout(() => setSalvo(false), 2500)
    } catch (err) {
      setErro(err.message || 'Erro ao salvar perfil.')
    } finally {
      setSaving(false)
    }
  }

  const inicial = (apelido || username || '?').slice(0, 2).toUpperCase()

  return (
    <div className="bg-slate-800 border border-purple-800 rounded-xl p-5">
      <p className="text-purple-300 text-sm font-medium mb-3">Meu perfil nesta mesa</p>
      <div className="flex items-center gap-4">
        {avatarUrl ? (
          <img src={avatarUrl} alt="avatar" className="w-14 h-14 rounded-full object-cover border-2 border-purple-700 shrink-0" />
        ) : (
          <div className="w-14 h-14 rounded-full bg-purple-950 border-2 border-purple-800 flex items-center justify-center shrink-0">
            <span className="text-purple-300 font-bold">{inicial}</span>
          </div>
        )}
        <div className="flex-1 min-w-0 space-y-2">
          <input
            type="text"
            value={apelido}
            onChange={e => setApelido(e.target.value)}
            placeholder={`Apelido (padrão: ${username || 'seu nome'})`}
            className="w-full px-3 py-2 rounded-lg bg-purple-950 border border-purple-700 text-white text-sm placeholder-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-purple-200 rounded-lg cursor-pointer transition-colors">
              {uploading ? 'Enviando...' : '📷 Trocar avatar'}
              <input type="file" accept="image/*" onChange={handleAvatar} disabled={uploading} className="hidden" />
            </label>
            {avatarUrl && (
              <button onClick={() => setAvatarUrl('')} className="text-xs text-purple-400 hover:text-white transition-colors">
                Remover avatar
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 mt-3">
        <button
          onClick={salvar}
          disabled={saving || uploading}
          className="px-4 py-2 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
        >
          {saving ? 'Salvando...' : 'Salvar perfil'}
        </button>
        {salvo && <span className="text-green-400 text-xs">✓ Salvo</span>}
        {erro && <span className="text-red-400 text-xs">{erro}</span>}
      </div>
    </div>
  )
}
