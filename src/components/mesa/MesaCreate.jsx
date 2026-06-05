import { useState } from 'react'
import { useCreateMesa } from '../../hooks/useMesa'

export default function MesaCreate({ onClose, onCreated }) {
  const { createMesa, loading } = useCreateMesa()
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    try {
      const mesa = await createMesa(nome, descricao)
      onCreated(mesa)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-purple-800 rounded-2xl p-8 w-full max-w-md shadow-2xl">
        <h2 className="text-xl font-bold text-white mb-6">Nova Mesa</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-purple-200 mb-1">Nome da mesa *</label>
            <input
              type="text"
              required
              maxLength={80}
              value={nome}
              onChange={e => setNome(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-purple-950 border border-purple-700 text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Ex: A Masmorra dos Dragões"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-purple-200 mb-1">Descrição (opcional)</label>
            <textarea
              rows={3}
              maxLength={300}
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-purple-950 border border-purple-700 text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              placeholder="Uma breve descrição da campanha..."
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-950 border border-red-800 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !nome.trim()}
              className="flex-1 py-2 px-4 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
            >
              {loading ? 'Criando...' : 'Criar mesa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
