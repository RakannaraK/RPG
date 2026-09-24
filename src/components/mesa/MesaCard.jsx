import { useNavigate } from 'react-router-dom'
import CapaMesa from './CapaMesa'

const ROLE_LABELS = { mestre: 'Mestre', 'co-mestre': 'Co-mestre', jogador: 'Jogador', espectador: 'Espectador' }
const ROLE_COLORS = {
  mestre: 'bg-accent-600 text-sobre-acento',
  'co-mestre': 'bg-orange-500 text-orange-950',
  jogador: 'bg-purple-600 text-sobre-acento',
  espectador: 'bg-slate-600 text-slate-100',
}

export default function MesaCard({ mesa }) {
  const navigate = useNavigate()

  return (
    <button
      onClick={() => navigate(`/mesa/${mesa.id}`)}
      className="w-full text-left velino moldura-cantos hover:bg-slate-750 border border-purple-800 hover:border-purple-600 rounded-2xl overflow-hidden transition-all group"
    >
      {/* F37.4 — faixa da capa escolhida pelo dono (sem capa, não ocupa nada) */}
      <CapaMesa capa={mesa.capa} altura={56} />

      <div className="p-5">
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
        {mesa.role === 'co-mestre' && <span className="text-orange-400">🛡 Co-mestre</span>}
        {mesa.arquivada && <span className="text-accent-300">📦 Arquivada</span>}
      </div>
      </div>
    </button>
  )
}
