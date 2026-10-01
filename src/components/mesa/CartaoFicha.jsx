import { Link } from 'react-router-dom'
import BarraVida from '../ui/BarraVida'
import Icone from '../ui/Icone'
import Ilustra from '../arte/Ilustra'

/**
 * Fase 52 — personagem na lista da mesa: retrato, nome, raça • classe • nível,
 * barra de vida e de quem é. As ações (pasta, excluir) ficam num canto, como
 * ícones com dica, para o cartão inteiro continuar sendo "abrir a ficha".
 */
export default function CartaoFicha({ ficha: f, mesaId, donoNome, orfa, voceEdita, podePasta, podeExcluir, onPasta, onExcluir }) {
  const detalhes = [f.raca, f.classe, f.nivel ? `Nível ${f.nivel}` : null].filter(Boolean).join(' • ')
  return (
    <div className={`cartao group relative flex rounded-2xl border bg-raised/80 shadow-nivel-1 overflow-hidden ${orfa ? 'border-amber-800/60' : 'border-border'}`}>
      <Link to={`/mesa/${mesaId}/ficha/${f.id}`} className="flex-1 min-w-0 flex gap-4 p-4 rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-400 focus-visible:-outline-offset-2">
        <div className="w-14 h-14 shrink-0 rounded-xl overflow-hidden bg-void ring-1 ring-border flex items-center justify-center">
          {f.imagem_url
            ? <img src={f.imagem_url} alt="" className="w-full h-full object-cover" loading="lazy" />
            : <Ilustra nome="elmo" tamanho={34} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-ink font-semibold leading-snug flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="truncate group-hover:text-accent-300 transition-colors duration-normal">{f.nome_personagem}</span>
            {f.privada && <span className="inline-flex text-ink-dim" title="Ficha privada"><Icone nome="cadeado" tamanho={14} /><span className="sr-only">Ficha privada</span></span>}
            {voceEdita && <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-ok/10 border border-ok/40 text-ok">você edita</span>}
            {orfa && <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-amber-950 border border-amber-700/60 text-amber-300">órfã</span>}
          </p>
          <p className="text-ink-dim text-sm truncate mt-0.5">{detalhes || 'Sem detalhes'}</p>
          {f.hp_maximo ? <BarraVida atual={f.hp_atual} maximo={f.hp_maximo} rotulo="Vida" className="mt-2.5 max-w-xs" /> : null}
          <p className="text-ink-dim text-xs mt-2 inline-flex items-center gap-1">
            <Icone nome="usuario" tamanho={12} /> {orfa ? 'ex-membro' : donoNome}
          </p>
        </div>
      </Link>
      {(podePasta || podeExcluir) && (
        <div className="flex flex-col gap-1 p-2 border-l border-border/60">
          {podePasta && (
            <button onClick={onPasta} aria-label={`Mover ${f.nome_personagem} para uma pasta`} data-dica="Mover para pasta" className="botao-icone">
              <Icone nome="pasta" tamanho={18} />
            </button>
          )}
          {podeExcluir && (
            <button onClick={onExcluir} aria-label={`Apagar ${f.nome_personagem}`} data-dica={orfa ? 'Apagar ficha órfã' : 'Apagar ficha'} className="botao-icone hover:!text-harm">
              <Icone nome="lixeira" tamanho={18} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
