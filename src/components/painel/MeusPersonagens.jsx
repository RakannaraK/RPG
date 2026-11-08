import { Link } from 'react-router-dom'
import CapaMesa from '../mesa/CapaMesa'
import Esqueleto from '../ui/Esqueleto'
import { capaDaMesa } from '../../lib/capas'

/** F55 — fileira rolável com os personagens do usuário; sem personagens, some. */
export default function MeusPersonagens({ personagens, loading }) {
  if (!loading && personagens.length === 0) return null
  return (
    <section className="mb-10" aria-label="Seus personagens">
      <h2 className="font-sora text-xl font-semibold text-ink mb-3">Seus personagens</h2>
      <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2">
        {loading ? [0, 1, 2].map(i => <Esqueleto key={i} className="h-52 w-44 shrink-0 rounded-2xl" />) : personagens.map(p => (
          <Link
            key={p.id} to={`/mesa/${p.mesa_id}/ficha/${p.id}`}
            className="snap-start shrink-0 w-44 rounded-2xl border border-border bg-raised/70 overflow-hidden hover:border-accent-600 transition-colors duration-rapida"
          >
            {p.imagem_url
              ? <img src={p.imagem_url} alt="" loading="lazy" className="h-32 w-full object-cover" />
              : <CapaMesa capa={capaDaMesa(p.mesa)} altura={128} className="h-32 flex items-center justify-center bg-void">
                  <span className="font-sora text-4xl font-bold text-ink">{(p.nome_personagem || '?').charAt(0).toUpperCase()}</span>
                </CapaMesa>}
            <div className="p-3">
              <p className="text-ink font-semibold truncate">{p.nome_personagem || 'Sem nome'}</p>
              {(p.nivel || p.classe) && <p className="text-ink-dim text-xs truncate">{[p.nivel && `Nv ${p.nivel}`, p.classe].filter(Boolean).join(' · ')}</p>}
              <p className="text-ink-dim text-xs truncate mt-0.5">{p.mesa.nome}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
