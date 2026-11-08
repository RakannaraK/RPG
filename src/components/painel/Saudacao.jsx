import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { usePerfil } from '../../hooks/usePerfil'
import Icone from '../ui/Icone'

const rotuloDe = (v, mesa, ficha) => ({
  ficha: `Ficha de ${ficha?.nome_personagem || 'Ficha'}`,
  sessao: `Sessão em ${mesa.nome}`,
  mapa: `Mapa de ${mesa.nome}`,
}[v.tipo] || mesa.nome)

/** F55 — "Olá, {nome}", data, contagens e o botão de continuar do último recente. */
export default function Saudacao({ mesas, personagens, recentes }) {
  const { session } = useAuth()
  const perfil = usePerfil()
  const nome = perfil?.username || session?.user?.email?.split('@')[0] || 'Você'
  const data = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

  const visita = recentes.find(v => mesas.some(m => m.id === v.mesaId))
  const mesa = visita && mesas.find(m => m.id === visita.mesaId)
  const ficha = visita?.fichaId && personagens.find(p => p.id === visita.fichaId)
  const selo = 'rounded-full border border-border bg-void/60 px-3 py-1 text-xs text-ink-dim'

  return (
    <section className="mb-8 rounded-2xl border border-border bg-raised/70 p-5 flex flex-col sm:flex-row sm:items-center gap-4" aria-label="Saudação">
      <div className="flex-1 min-w-0">
        <h1 className="font-sora text-3xl sm:text-4xl font-bold text-ink tracking-tight truncate">Olá, {nome}</h1>
        <p className="text-ink-dim mt-1 first-letter:uppercase">{data}</p>
        <div className="flex flex-wrap gap-2 mt-3">
          <span className={selo}>{personagens.length} {personagens.length === 1 ? 'personagem' : 'personagens'}</span>
          <span className={selo}>{mesas.length} {mesas.length === 1 ? 'mesa' : 'mesas'}</span>
        </div>
      </div>
      {visita && (
        <Link to={visita.rota} className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-semibold bg-accent-600 hover:bg-accent-500 text-sobre-acento transition-colors duration-rapida min-w-0">
          <Icone nome="chevron-dir" tamanho={18} className="shrink-0" /> <span className="truncate">Continuar: {rotuloDe(visita, mesa, ficha)}</span>
        </Link>
      )}
    </section>
  )
}
