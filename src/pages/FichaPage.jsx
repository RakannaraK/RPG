import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useFicha } from '../hooks/useFicha'
import FichaView from '../components/ficha/FichaView'
import EquipamentosTab from '../components/ficha/EquipamentosTab'
import ImagensTab from '../components/ficha/ImagensTab'

const TABS = ['Ficha', 'Equipamentos', 'Imagens']

export default function FichaPage() {
  const { id: mesaId, fichaId } = useParams()
  const { session } = useAuth()
  const navigate = useNavigate()
  const { ficha, valoresAtributos, loading, error, refetch } = useFicha(fichaId)
  const [activeTab, setActiveTab] = useState('Ficha')

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-950 via-slate-900 to-black">
        <div className="text-purple-400 text-lg">Carregando ficha...</div>
      </div>
    )
  }

  if (error || !ficha) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-950 via-slate-900 to-black">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || 'Ficha não encontrada.'}</p>
          <button
            onClick={() => navigate(`/mesa/${mesaId}`)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            Voltar à mesa
          </button>
        </div>
      </div>
    )
  }

  const isDono = ficha.dono_id === session?.user?.id

  const subtitulo = [
    ficha.raca,
    ficha.classe,
    ficha.nivel ? `Nível ${ficha.nivel}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-slate-900 to-black">
      <header className="border-b border-purple-800 px-4 sm:px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button
            onClick={() => navigate(`/mesa/${mesaId}`)}
            className="text-purple-400 hover:text-white transition-colors text-sm shrink-0"
          >
            ← Voltar
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-white font-bold text-xl leading-tight truncate">
              {ficha.nome_personagem}
            </h1>
            {subtitulo && (
              <p className="text-purple-400 text-sm mt-0.5 truncate">{subtitulo}</p>
            )}
          </div>
          {!isDono && (
            <span className="text-xs text-purple-400 bg-purple-900/60 border border-purple-700 px-2 py-1 rounded-full shrink-0">
              Visualizando
            </span>
          )}
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="flex border-b border-purple-900 mt-6 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px shrink-0 whitespace-nowrap ${
                activeTab === tab
                  ? 'text-white border-purple-500'
                  : 'text-purple-400 border-transparent hover:text-purple-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="py-8">
          {activeTab === 'Ficha' && (
            <FichaView
              ficha={ficha}
              valoresAtributos={valoresAtributos}
              refetch={refetch}
              isDono={isDono}
            />
          )}

          {activeTab === 'Equipamentos' && (
            <EquipamentosTab
              fichaId={fichaId}
              donoId={ficha.dono_id}
              isDono={isDono}
            />
          )}

          {activeTab === 'Imagens' && (
            <ImagensTab
              fichaId={fichaId}
              donoId={ficha.dono_id}
              isDono={isDono}
            />
          )}
        </div>
      </div>
    </div>
  )
}
