import { useRef, useState } from 'react'

export default function ImageUpload({ onSelect, currentUrl, disabled, label = 'Adicionar imagem' }) {
  const inputRef = useRef(null)
  const [preview, setPreview] = useState(null)

  function handleChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setPreview(url)
    onSelect(file)
  }

  const displayUrl = preview || currentUrl

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        disabled={disabled}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        className={`w-full border-2 border-dashed rounded-xl overflow-hidden transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          displayUrl
            ? 'border-border hover:border-accent-500'
            : 'border-border hover:border-accent-500'
        }`}
      >
        {displayUrl ? (
          <div className="relative group">
            <img
              src={displayUrl}
              alt="Preview"
              className="w-full h-48 object-cover"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center transition-all">
              <span className="text-ink text-sm font-medium bg-black/60 px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                Alterar imagem
              </span>
            </div>
          </div>
        ) : (
          <div className="py-8 px-4 text-center">
            <div className="text-3xl mb-2">🖼️</div>
            <p className="text-ink-dim text-sm">{label}</p>
            <p className="text-ink-dim text-xs mt-1">JPG, PNG, WebP — redimensionado para máx 1200px</p>
          </div>
        )}
      </button>
    </div>
  )
}
