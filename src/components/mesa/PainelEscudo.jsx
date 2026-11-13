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
import { textoVida } from '../../lib/barraVida'
import Botao from '../ui/Botao'
import BarraVida from '../ui/BarraVida'
import CabecalhoSecao from '../ui/CabecalhoSecao'
import PainelRelogios from './PainelRelogios'
import PainelOverlay from './PainelOverlay'
import RoladorGenerico from '../dados/RoladorGenerico'

const CAIXA = 'rounded-xl border border-border bg-raised p-4 space-y-3'

/** Barra de vida compacta, com pedaço de escudo (mesmo motor do overlay). */
function Vida({ card }) {
  const dados = { atual: card.hpAtual ?? 0, maximo: card.hpMax || card.hpMaxBase || 0, temp: card.vidaTemp || 0 }
  return (
    <div className="flex items-center gap-2">
      <span className="text-ink text-sm truncate flex-1 min-w-0">{card.nome}</span>
      <BarraVida atual={dados.atual} maximo={dados.maximo} temp={dados.temp} rotulo={`Vida de ${card.nome}`} mostrarTexto={false} className="w-28 shrink-0" />
      <span className="text-ink-dim text-xs tabular-nums w-20 text-right shrink-0">{textoVida(dados)}</span>
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
      <CabecalhoSecao nivel={3} titulo="Tabelas aleatórias" />
      <div className="flex flex-wrap gap-1.5">
        {tabelas.map(t => (
          <Botao
            key={t.id} variante="contorno" tamanho="sm" onClick={() => rolar(t)}
            title={`Rolar ${t.notacao || '1d6'} e mandar ao feed`}
          >{t.nome || 'tabela'}</Botao>
        ))}
      </div>
      {ultimo && (
        <p className="text-ink text-sm">
          <span className="text-ink-dim text-xs">{ultimo.nome}{ultimo.valor != null ? ` (${ultimo.valor})` : ''}: </span>
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

  if (!isGestor) return <p className="text-ink-dim text-sm">O escudo é a tela do mestre.</p>

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <div className="space-y-4">
          {/* Combate */}
          <div className={CAIXA}>
            <CabecalhoSecao nivel={3} titulo="Combate" acoes={sessaoAtiva && (
              <Botao variante="fantasma" tamanho="sm" onClick={() => navigate(`/mesa/${mesaId}/sessao/${sessaoAtiva.id}`)}>abrir a sessão</Botao>
            )} />
            {!encontro ? (
              <p className="text-ink-dim text-sm">{sessaoAtiva ? 'Nenhum combate ativo.' : 'Nenhuma sessão ao vivo.'}</p>
            ) : (
              <>
                <p className="text-ink text-sm">
                  {encontro.titulo || 'Combate'} · <span className="text-accent-300">rodada {encontro.rodada}</span>
                  {daVez && <> · vez de <b>{daVez.nome}</b></>}
                </p>
                <ol className="text-xs space-y-0.5">
                  {ordem.map((c, i) => (
                    <li key={c.id} className={c.id === daVez?.id ? 'text-accent-300 font-semibold' : 'text-ink-dim'}>
                      {i + 1}. {c.nome} <span className="text-ink-dim">{c.iniciativa ?? '—'}</span>
                      {c.hp_maximo != null && <span className="text-ink-dim"> · {c.hp_atual ?? '?'}/{c.hp_maximo}</span>}
                    </li>
                  ))}
                </ol>
              </>
            )}
          </div>

          {/* Vidas do grupo */}
          <div className={CAIXA}>
            <CabecalhoSecao nivel={3} titulo="Vida do grupo" />
            {cards.length === 0
              ? <p className="text-ink-dim text-sm">Nenhum personagem nesta mesa.</p>
              : <div className="space-y-1">{cards.map(c => <Vida key={c.id} card={c} />)}</div>}
          </div>

          <Tabelas tabelas={tabelas} mesaId={mesaId} sessaoId={sessaoAtiva?.id || null} />
        </div>

        <div className="space-y-4">
          {/* Notas fixadas */}
          <div className={CAIXA}>
            <CabecalhoSecao nivel={3} titulo="Notas fixadas" />
            {fixadas.length === 0
              ? <p className="text-ink-dim text-sm">Fixe uma nota (📌) para ela aparecer aqui.</p>
              : fixadas.map(n => (
                <div key={n.id}>
                  <p className="text-ink text-sm font-medium">{n.titulo || 'Sem título'}</p>
                  <p className="text-ink-dim text-xs whitespace-pre-wrap">{n.texto}</p>
                </div>
              ))}
          </div>

          <div className={CAIXA}>
            <PainelRelogios mesaId={mesaId} isGestor={isGestor} />
          </div>

          <div className={CAIXA}>
            <CabecalhoSecao nivel={3} titulo="Rolar" />
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
