import { useState } from 'react'
import { useRelogios } from '../../hooks/useRelogios'
import Botao from '../ui/Botao'
import CabecalhoSecao from '../ui/CabecalhoSecao'
import Icone from '../ui/Icone'
import { t } from '../../i18n'


/** Segmentos do relógio: preenchidos à esquerda, vazios à direita. */
function Segmentos({ preenchido, segmentos }) {
  const total = Math.max(0, Number(segmentos) || 0)
  const cheio = Math.max(0, Math.min(total, Number(preenchido) || 0))
  return (
    <div className="flex flex-wrap gap-1" role="img" aria-label={t('{a} de {b}', { a: cheio, b: total })}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`w-4 h-4 rounded-lg border transition-colors ${
            i < cheio ? 'bg-accent-500 border-accent-400' : 'bg-void border-border'
          }`}
        />
      ))}
    </div>
  )
}

/**
 * Relógios de campanha — progresso compartilhado da mesa, que o mestre avança
 * entre sessões. Com sessões mensais, é o que dá continuidade: o mundo se move
 * mesmo quando o grupo não está jogando.
 *
 * Some por completo se a tabela ainda não existir no banco.
 */
export default function PainelRelogios({ mesaId, isGestor }) {
  const { relogios, loading, indisponivel, criar, avancar, remover } = useRelogios(mesaId)
  const [nome, setNome] = useState('')
  const [segmentos, setSegmentos] = useState(6)
  const [criando, setCriando] = useState(false)
  const [erro, setErro] = useState('')

  if (loading || indisponivel) return null

  async function handleCriar() {
    if (!nome.trim()) { setErro(t('Dê um nome ao relógio.')); return }
    setCriando(true); setErro('')
    try {
      await criar({ nome, segmentos })
      setNome(''); setSegmentos(6)
    } catch (e) {
      setErro(e.message || t('Erro ao criar o relógio.'))
    } finally {
      setCriando(false)
    }
  }

  if (relogios.length === 0 && !isGestor) return null

  return (
    <div className="space-y-3">
      <CabecalhoSecao
        nivel={3}
        titulo={t('Relógios da campanha')}
        descricao={t('O que está em andamento no mundo, entre uma sessão e outra.')}
      />

      {relogios.length === 0 && (
        <p className="text-ink-dim text-sm">{t('Nenhum relógio ainda.')}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {relogios.map(r => (
          <div
            key={r.id}
            className={`rounded-xl border p-3 space-y-2 ${
              r.concluido ? 'bg-accent-500/10 border-accent-500/50' : 'bg-void/60 border-border'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-ink text-sm font-medium truncate">{r.nome}</p>
                {r.descricao && <p className="text-ink-dim text-xs mt-0.5">{r.descricao}</p>}
              </div>
              <span className="text-accent-300 font-mono text-sm shrink-0 tabular-nums">
                {r.preenchido}/{r.segmentos}
              </span>
            </div>

            <Segmentos preenchido={r.preenchido} segmentos={r.segmentos} />

            {r.concluido && (
              <p className="text-accent-300 text-xs font-semibold">{t('✓ Completo')}</p>
            )}

            {isGestor && (
              <div className="flex items-center gap-1.5 pt-1" role="group" aria-label={r.nome}>
                <Botao variante="contorno" tamanho="icone" onClick={() => avancar(r, -1)} aria-label={t('Diminuir')}>
                  <Icone nome="menos" tamanho={16} />
                </Botao>
                <Botao variante="primario" tamanho="icone" onClick={() => avancar(r, +1)} aria-label={t('Aumentar')}>
                  <Icone nome="mais" tamanho={16} />
                </Botao>
                <Botao variante="fantasma" tamanho="icone" className="ml-auto" onClick={() => remover(r.id)} aria-label={t('Remover relógio')} title={t('Remover relógio')}>
                  <Icone nome="lixeira" tamanho={16} />
                </Botao>
              </div>
            )}
          </div>
        ))}
      </div>

      {isGestor && (
        <div className="flex gap-2 flex-wrap items-center border-t border-border pt-3">
          <input
            type="text" value={nome} onChange={e => setNome(e.target.value)}
            placeholder={t('Novo relógio (ex: Investigação do Inquisidor)')}
            className="campo flex-1 min-w-[12rem]" aria-label={t('Novo relógio (ex: Investigação do Inquisidor)')}
          />
          <input
            type="number" min={1} max={24} value={segmentos}
            onChange={e => setSegmentos(Number(e.target.value) || 6)}
            className="campo w-16 text-center" title={t('Segmentos')} aria-label={t('Segmentos')}
          />
          <Botao variante="primario" tamanho="sm"
            type="button" onClick={handleCriar} disabled={criando}>
            {criando ? '...' : t('+ Criar')}
          </Botao>
          {erro && <p className="text-harm text-xs w-full" role="alert">{erro}</p>}
        </div>
      )}
    </div>
  )
}
