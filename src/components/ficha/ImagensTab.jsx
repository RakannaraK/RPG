import { useState } from 'react'
import { useImagens } from '../../hooks/useImagens'
import ImageUpload from './ImageUpload'
import Ilustra from '../arte/Ilustra'
import { useConfirmar } from '../ui/Confirmar'
import { t } from '../../i18n'

const TIPOS_IMAGEM = [
  { value: 'retrato', label: t('Retrato') },
  { value: 'aparencia', label: t('Aparência') },
  { value: 'pet', label: t('Pet') },
  { value: 'montaria', label: t('Montaria') },
  { value: 'familiar', label: t('Familiar') },
  { value: 'npc', label: t('NPC') },
  { value: 'outro', label: t('Outro') },
]

export default function ImagensTab({ fichaId, donoId, isDono }) {
  const { confirmar } = useConfirmar()
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
    if (!selectedFile) { setUploadErro(t('Selecione uma imagem primeiro.')); return }
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
      setUploadErro(err.message || t('Erro ao fazer upload da imagem.'))
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(imagem) {
    if (!(await confirmar({ titulo: t('Remover imagem?'), mensagem: t('A imagem sai da galeria desta ficha.'), detalhe: t('Esta ação não pode ser desfeita.'), confirmar: t('Remover'), perigo: true }))) return
    setDeletingId(imagem.id)
    setDeleteErro('')
    try {
      await deleteImagem(imagem)
    } catch (err) {
      setDeleteErro(err.message || t('Erro ao remover imagem.'))
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return <div className="py-8 text-center text-ink-dim">{t('Carregando imagens...')}</div>
  }

  if (error) {
    return <div className="py-8 text-center text-harm">{error}</div>
  }

  return (
    <div className="space-y-6">
      {/* Upload */}
      {isDono && (
        <div className="bg-raised border border-border rounded-xl p-5">
          <p className="text-ink font-medium text-sm mb-4">{t('Adicionar imagem')}</p>

          {!temRetrato && (
            <div className="mb-3 px-3 py-2 bg-dice-700/50 border border-dice-500 rounded-lg">
              <p className="text-dice-400 text-xs">
                {t('Adicione um')} <strong>{t('retrato')}</strong> {t('do personagem para identificá-lo na mesa.')}
              </p>
            </div>
          )}

          <div className="space-y-3">
            <ImageUpload
              onSelect={setSelectedFile}
              label={t('Selecionar imagem')}
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-accent-300 mb-1">{t('Tipo')}</label>
                <select
                  value={tipo}
                  onChange={e => setTipo(e.target.value)}
                  className="w-full px-3 py-2 bg-void border border-border text-ink rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
                >
                  {TIPOS_IMAGEM.map(tp => (
                    <option key={tp.value} value={tp.value}>{tp.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-accent-300 mb-1">{t('Legenda (opcional)')}</label>
                <input
                  type="text"
                  placeholder={t('Ex: Forma élfica')}
                  value={legenda}
                  onChange={e => setLegenda(e.target.value)}
                  className="w-full px-3 py-2 bg-void border border-border text-ink placeholder-accent-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
                />
              </div>
            </div>

            {deleteErro && (
        <div className="p-3 bg-harm/10 border border-harm/50 rounded-lg text-harm text-sm">
          {deleteErro}
        </div>
      )}

      {uploadErro && <p className="text-harm text-xs">{uploadErro}</p>}

            <button
              onClick={handleUpload}
              disabled={uploading || !selectedFile}
              className="w-full py-2.5 bg-accent-600 hover:bg-accent-700 disabled:opacity-50 disabled:cursor-not-allowed text-sobre-acento font-semibold rounded-lg text-sm transition-colors"
            >
              {uploading ? t('Enviando...') : t('Fazer upload')}
            </button>
          </div>
        </div>
      )}

      {/* Galeria */}
      {imagens.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-2xl">
          <Ilustra nome="moldura" tamanho={72} className="mx-auto mb-4" />
          <p className="text-ink text-base font-medium mb-1">{t('Nenhuma imagem ainda')}</p>
          {!isDono && (
            <p className="text-ink-dim text-sm">
              {t('O dono do personagem ainda não adicionou imagens.')}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {TIPOS_IMAGEM.map(tp => {
            const imgs = imagens.filter(img => img.tipo === tp.value)
            if (imgs.length === 0) return null

            return (
              <div key={tp.value}>
                <p className="text-accent-300 text-sm font-medium mb-3">
                  {tp.label} ({imgs.length})
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {imgs.map(img => (
                    <div
                      key={img.id}
                      className="relative group rounded-xl overflow-hidden border border-border"
                    >
                      <img
                        src={img.url}
                        alt={img.legenda || tp.label}
                        className="w-full h-44 object-cover"
                      />
                      {isDono && (
                        <button
                          onClick={() => handleDelete(img)}
                          disabled={deletingId === img.id}
                          className="absolute top-2 right-2 bg-harm hover:bg-harm disabled:opacity-50 text-ink text-xs p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                          title={t('Remover')}
                        >
                          {deletingId === img.id ? '…' : '🗑'}
                        </button>
                      )}
                      {img.legenda && (
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-2">
                          <p className="text-ink text-xs truncate">{img.legenda}</p>
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
