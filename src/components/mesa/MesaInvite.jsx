import { useState } from 'react'
import { useJoinMesa } from '../../hooks/useMesa'

export default function MesaInvite({ onClose, onJoined }) {
  const { joinMesa, loading } = useJoinMesa()
  const [codigo, setCodigo] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    try {
      const mesa = await joinMesa(codigo)
      onJoined(mesa)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-purple-800 rounded-2xl p-8 w-full max-w-md shadow-2xl">
        <h2 className="text-xl font-bold text-white mb-2">Entrar em uma mesa</h2>
        <p className="text-purple-300 text-sm mb-6">
          Peça o código de convite ao mestre da mesa e digite abaixo.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-purple-200 mb-1">Código de convite</label>
            <input
              type="text"
              required
              maxLength={8}
              value={codigo}
              onChange={e => setCodigo(e.target.value.toLowerCase())}
              className="w-full px-4 py-2 rounded-lg bg-purple-950 border border-purple-700 text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono tracking-widest text-center text-lg uppercase"
              placeholder="ex: a1b2c3d4"
              autoFocus
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
              disabled={loading || codigo.trim().length < 6}
              className="flex-1 py-2 px-4 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
