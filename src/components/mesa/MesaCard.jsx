import { Link } from 'react-router-dom'
import CapaMesa from './CapaMesa'
import SeloPapel from '../ui/SeloPapel'
import Icone from '../ui/Icone'
import { textoQuando } from '../../lib/agenda'
import { capaDaMesa } from '../../lib/capas'

/**
 * Cartão de mesa no painel "Suas mesas" (F52). A mesa é a peça mais
 * importante do site, então o cartão tem presença: faixa ilustrada própria
 * da campanha, nome em destaque, papel, quantas pessoas e a próxima sessão.
 * Hover: sobe 2 px, a borda pega a cor do tema e a faixa aproxima de leve.
 */
export default function MesaCard({ mesa, proxima = null }) {
  return (
    <Link
      to={`/mesa/${mesa.id}`}
      className="cartao group relative flex flex-col h-full rounded-2xl border border-border bg-raised/80 overflow-hidden shadow-nivel-1"
    >
      <div className="relative overflow-hidden border-b border-border/60">
        <div className="transition-transform duration-lenta ease-padrao group-hover:scale-[1.04] motion-reduce:transform-none">
          <CapaMesa capa={capaDaMesa(mesa)} altura={84} />
        </div>
        <div className="absolute left-4 bottom-3"><SeloPapel papel={mesa.role} /></div>
        {mesa.arquivada && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-bg/80 border border-border text-ink-dim">
            <Icone nome="cadeado" tamanho={12} /> Arquivada
          </span>
        )}
      </div>

      <div className="flex-1 flex flex-col p-4 sm:p-5">
        <h3 className="font-sora text-ink font-semibold text-lg leading-snug group-hover:text-accent-300 transition-colors duration-normal">
          {mesa.nome}
        </h3>
        {mesa.descricao && <p className="text-ink-dim text-sm mt-1 line-clamp-2">{mesa.descricao}</p>}

        <div className="mt-auto pt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-ink-dim">
          <span className="inline-flex items-center gap-1.5">
            <Icone nome="pessoas" tamanho={16} />
            {mesa.totalMembros} {mesa.totalMembros === 1 ? 'pessoa' : 'pessoas'}
          </span>
          {proxima ? (
            <span className="inline-flex items-center gap-1.5 text-ink">
              <Icone nome="calendario" tamanho={16} className="text-dice-400" />
              {textoQuando(proxima.inicio)}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <Icone nome="calendario" tamanho={16} /> Sem sessão marcada
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
