import { useState } from 'react'
import { useImagens } from '../../hooks/useImagens'
import ImageUpload from './ImageUpload'

const TIPOS_IMAGEM = [
  { value: 'retrato', label: 'Retrato' },
  { value: 'aparencia', label: 'Aparência' },
  { value: 'pet', label: 'Pet' },
  { value: 'montaria', label: 'Montaria' },
  { value: 'familiar', label: 'Familiar' },
  { value: 'npc', label: 'NPC' },
  { value: 'outro', label: 'Outro' },
]

export default function ImagensTab({ fichaId, donoId, isDono }) {
  const { imagens, loading, error, uploadImagem, deleteImagem } = useImagens(fichaId)
  const [selectedFile, setSelectedFile] = useState(null)
  const [tipo, setTipo] = useState('retrato')
  const [legenda, setLegenda] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadErro, setUploadErro] = useState('')
  const [deletingId, setDeletingId] = useState(null)
  const [deleteErro, setDeleteErro] = useState('')

  const temRetrato = imagens.some(img => img.tipo === 'retrato')

  async function handleUpload() {
    if (!selectedFile) { setUploadErro('Selecione uma imagem primeiro.'); return }
    setUploadErro('')
    setUploading(true)
    try {
      await uploadImagem({
        donoId,
        file: selectedFile,
        tipo,
        legenda: legenda.trim() || null,
      })
      setSelectedFile(null)
      setLegenda('')
    } catch (err) {
      setUploadErro(err.message || 'Erro ao fazer upload da imagem.')
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(imagem) {
    if (!window.confirm('Remover esta imagem? Esta ação não pode ser desfeita.')) return
    setDeletingId(imagem.id)
    setDeleteErro('')
    try {
      await deleteImagem(imagem)
    } catch (err) {
      setDeleteErro(err.message || 'Erro ao remover imagem.')
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return <div className="py-8 text-center text-purple-400">Carregando imagens...</div>
  }

  if (error) {
    return <div className="py-8 text-center text-red-400">{error}</div>
  }

  return (
    <div className="space-y-6">
      {/* Upload */}
      {isDono && (
        <div className="bg-slate-800 border border-purple-800 rounded-xl p-5">
          <p className="text-purple-200 font-medium text-sm mb-4">Adicionar imagem</p>

          {!temRetrato && (
            <div className="mb-3 px-3 py-2 bg-amber-950/50 border border-amber-700 rounded-lg">
              <p className="text-amber-400 text-xs">
                Adicione um <strong>retrato</strong> do personagem para identificá-lo na mesa.
              </p>
            </div>
          )}

          <div className="space-y-3">
            <ImageUpload
              onSelect={setSelectedFile}
              label="Selecionar imagem"
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-purple-300 mb-1">Tipo</label>
                <select
                  value={tipo}
                  onChange={e => setTipo(e.target.value)}
                  className="w-full px-3 py-2 bg-purple-950 border border-purple-700 text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {TIPOS_IMAGEM.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-purple-300 mb-1">Legenda (opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: Forma élfica"
                  value={legenda}
                  onChange={e => setLegenda(e.target.value)}
                  className="w-full px-3 py-2 bg-purple-950 border border-purple-700 text-white placeholder-purple-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {deleteErro && (
        <div className="p-3 bg-red-950 border border-red-800 rounded-lg text-red-400 text-sm">
          {deleteErro}
        </div>
      )}

      {uploadErro && <p className="text-red-400 text-xs">{uploadErro}</p>}

            <button
              onClick={handleUpload}
              disabled={uploading || !selectedFile}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg text-sm transition-colors"
            >
              {uploading ? 'Enviando...' : 'Fazer upload'}
            </button>
          </div>
        </div>
      )}

      {/* Galeria */}
      {imagens.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-purple-800 rounded-2xl">
          <div className="text-4xl mb-4">🖼️</div>
          <p className="text-purple-300 text-lg font-medium mb-2">Nenhuma imagem ainda</p>
          {!isDono && (
            <p className="text-purple-500 text-sm">
              O dono do personagem ainda não adicionou imagens.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {TIPOS_IMAGEM.map(t => {
            const imgs = imagens.filter(img => img.tipo === t.value)
            if (imgs.length === 0) return null

            return (
              <div key={t.value}>
                <p className="text-purple-300 text-sm font-medium mb-3">
                  {t.label} ({imgs.length})
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {imgs.map(img => (
                    <div
                      key={img.id}
                      className="relative group rounded-xl overflow-hidden border border-purple-800"
                    >
                      <img
                        src={img.url}
                        alt={img.legenda || t.label}
                        className="w-full h-44 object-cover"
                      />
                      {isDono && (
                        <button
                          onClick={() => handleDelete(img)}
                          disabled={deletingId === img.id}
                          className="absolute top-2 right-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                          title="Remover"
                        >
                          {deletingId === img.id ? '…' : '🗑'}
                        </button>
                      )}
                      {img.legenda && (
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-2">
                          <p className="text-white text-xs truncate">{img.legenda}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
