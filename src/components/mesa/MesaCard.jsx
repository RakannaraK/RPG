import { useNavigate } from 'react-router-dom'

const ROLE_LABELS = { mestre: 'Mestre', jogador: 'Jogador' }
const ROLE_COLORS = {
  mestre: 'bg-amber-500 text-amber-950',
  jogador: 'bg-purple-600 text-white',
}

export default function MesaCard({ mesa }) {
  const navigate = useNavigate()

  return (
    <button
      onClick={() => navigate(`/mesa/${mesa.id}`)}
      className="w-full text-left bg-slate-800 hover:bg-slate-750 border border-purple-800 hover:border-purple-600 rounded-2xl p-5 transition-all group"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="text-white font-semibold text-lg group-hover:text-purple-300 transition-colors leading-tight">
          {mesa.nome}
        </h3>
        <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${ROLE_COLORS[mesa.role]}`}>
          {ROLE_LABELS[mesa.role]}
        </span>
      </div>

      {mesa.descricao && (
        <p className="text-purple-300 text-sm mb-4 line-clamp-2">{mesa.descricao}</p>
      )}

      <div className="flex items-center gap-4 text-purple-400 text-xs">
        <span>👥 {mesa.totalMembros} {mesa.totalMembros === 1 ? 'membro' : 'membros'}</span>
        {mesa.role === 'mestre' && (
          <span className="text-amber-500">⚔️ Você é o Mestre</span>
        )}
      </div>
    </button>
  )
}
