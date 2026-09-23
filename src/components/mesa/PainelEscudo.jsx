import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCardsDaMesa } from '../../hooks/useSessaoFichas'
import { useSessoes } from '../../hooks/useSessoes'
import { useEncontro } from '../../hooks/useEncontro'
import { useNotasMesa } from '../../hooks/useNotasMesa'
import { useRolagem } from '../../hooks/useRolagem'
import { entradaPara } from '../../lib/tabelasEngine'
import { rolarNotacao, validarNotacao } from '../../lib/diceNotation'
import { ordenarPorIniciativa } from '../../lib/iniciativa'
import { faixasDaBarra, textoVida } from '../../lib/barraVida'
import PainelRelogios from './PainelRelogios'
import PainelOverlay from './PainelOverlay'
import RoladorGenerico from '../dados/RoladorGenerico'

const CAIXA = 'rounded-xl border border-purple-900 bg-slate-900/60 p-3 space-y-2'
const TITULO = 'text-purple-300 text-xs font-semibold uppercase tracking-wider'

const COR_NIVEL = { cheia: 'bg-emerald-500', media: 'bg-yellow-500', baixa: 'bg-red-500', vazia: 'bg-red-500' }

/** Barra de vida compacta, com pedaço de escudo (mesmo motor do overlay). */
function Vida({ card }) {
  const dados = { atual: card.hpAtual ?? 0, maximo: card.hpMax || card.hpMaxBase || 0, temp: card.vidaTemp || 0 }
  const { pct, pctTemp, nivel } = faixasDaBarra(dados)
  return (
    <div className="flex items-center gap-2">
      <span className="text-white text-sm truncate flex-1 min-w-0">{card.nome}</span>
      <div className="w-28 h-2 rounded-full bg-black/60 overflow-hidden flex shrink-0">
        <div className={COR_NIVEL[nivel]} style={{ width: `${pct}%` }} />
        {pctTemp > 0 && <div className="bg-sky-400" style={{ width: `${pctTemp}%` }} title="escudo" />}
      </div>
      <span className="text-purple-300 text-xs tabular-nums w-20 text-right shrink-0">{textoVida(dados)}</span>
    </div>
  )
}

/** Tabela aleatória do sistema: rola e manda o resultado para o feed. */
function Tabelas({ tabelas, mesaId, sessaoId }) {
  const { registrarEvento } = useRolagem()
  const [ultimo, setUltimo] = useState(null)

  async function rolar(tabela) {
    const notacao = (tabela.notacao || '1d6').trim()
    if (!validarNotacao(notacao)) { setUltimo({ nome: tabela.nome, texto: `Notação inválida: ${notacao}` }); return }
    const r = rolarNotacao(notacao)
    const entrada = entradaPara(tabela, r.total)
    const texto = entrada?.texto || '(sem entrada para este resultado)'
    setUltimo({ nome: tabela.nome, valor: r.total, texto })
    await registrarEvento({
      mesaId, sessaoId,
      rotulo: `🎲 ${tabela.nome}: ${texto}`,
      notacao, total: r.total, dados: r.dados,
    })
  }

  if (!tabelas.length) return null
  return (
    <div className={CAIXA}>
      <p className={TITULO}>Tabelas aleatórias</p>
      <div className="flex flex-wrap gap-1.5">
        {tabelas.map(t => (
          <button
            key={t.id} type="button" onClick={() => rolar(t)}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-purple-800 text-purple-200 text-xs transition-colors"
            title={`Rolar ${t.notacao || '1d6'} e mandar ao feed`}
          >{t.nome || 'tabela'}</button>
        ))}
      </div>
      {ultimo && (
        <p className="text-purple-200 text-sm">
          <span className="text-purple-400 text-xs">{ultimo.nome}{ultimo.valor != null ? ` (${ultimo.valor})` : ''}: </span>
          {ultimo.texto}
        </p>
      )}
    </div>
  )
}

/**
 * Fase 34.3 — escudo do mestre: numa tela só, o que ele olha o tempo todo.
 * Não inventa dado novo: junta combate, vidas, tabelas, notas e relógios.
 */
export default function PainelEscudo({ mesaId, isGestor }) {
  const navigate = useNavigate()
  const { cards, sistema } = useCardsDaMesa(mesaId)
  const { sessaoAtiva } = useSessoes(mesaId)
  const { encontro, combatentes } = useEncontro(sessaoAtiva?.id, mesaId)
  const { notas } = useNotasMesa(mesaId)

  const tabelas = sistema?.config_layout?.tabelas || []
  const ordem = ordenarPorIniciativa(combatentes)
  const daVez = encontro ? ordem[Math.min(Math.max(0, encontro.turno_atual ?? 0), Math.max(0, ordem.length - 1))] : null
  const fixadas = notas.filter(n => n.fixada)

  if (!isGestor) return <p className="text-accent-300 text-sm italic">O escudo é a tela do mestre.</p>

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <div className="space-y-4">
          {/* Combate */}
          <div className={CAIXA}>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className={TITULO}>Combate</p>
              {sessaoAtiva && (
                <button onClick={() => navigate(`/mesa/${mesaId}/sessao/${sessaoAtiva.id}`)} className="text-purple-400 hover:text-white text-xs underline">abrir a sessão</button>
              )}
            </div>
            {!encontro ? (
              <p className="text-accent-300 text-xs italic">{sessaoAtiva ? 'Nenhum combate ativo.' : 'Nenhuma sessão ao vivo.'}</p>
            ) : (
              <>
                <p className="text-white text-sm">
                  {encontro.titulo || 'Combate'} · <span className="text-amber-300">rodada {encontro.rodada}</span>
                  {daVez && <> · vez de <b>{daVez.nome}</b></>}
                </p>
                <ol className="text-xs space-y-0.5">
                  {ordem.map((c, i) => (
                    <li key={c.id} className={c.id === daVez?.id ? 'text-amber-300 font-semibold' : 'text-purple-300'}>
                      {i + 1}. {c.nome} <span className="text-accent-300">{c.iniciativa ?? '—'}</span>
                      {c.hp_maximo != null && <span className="text-accent-300"> · {c.hp_atual ?? '?'}/{c.hp_maximo}</span>}
                    </li>
                  ))}
                </ol>
              </>
            )}
          </div>

          {/* Vidas do grupo */}
          <div className={CAIXA}>
            <p className={TITULO}>Vida do grupo</p>
            {cards.length === 0
              ? <p className="text-accent-300 text-xs italic">Nenhum personagem nesta mesa.</p>
              : <div className="space-y-1">{cards.map(c => <Vida key={c.id} card={c} />)}</div>}
          </div>

          <Tabelas tabelas={tabelas} mesaId={mesaId} sessaoId={sessaoAtiva?.id || null} />
        </div>

        <div className="space-y-4">
          {/* Notas fixadas */}
          <div className={CAIXA}>
            <p className={TITULO}>Notas fixadas</p>
            {fixadas.length === 0
              ? <p className="text-accent-300 text-xs italic">Fixe uma nota (📌) para ela aparecer aqui.</p>
              : fixadas.map(n => (
                <div key={n.id}>
                  <p className="text-white text-sm font-medium">{n.titulo || 'Sem título'}</p>
                  <p className="text-purple-300 text-xs whitespace-pre-wrap">{n.texto}</p>
                </div>
              ))}
          </div>

          <div className={CAIXA}>
            <PainelRelogios mesaId={mesaId} isGestor={isGestor} />
          </div>

          <div className={CAIXA}>
            <p className={TITULO}>Rolar</p>
            <RoladorGenerico mesaId={mesaId} />
          </div>

          <div className={CAIXA}>
            <PainelOverlay mesaId={mesaId} />
          </div>
        </div>
      </div>
    </div>
  )
}
