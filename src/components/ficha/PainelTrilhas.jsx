import { useState } from 'react'
import { avaliarFormula } from '../../lib/formulaEngine'
import {
  marcar, curar, redimensionar, ordenarExibicao, contarMarcas, tipoMaisSevero,
} from '../../lib/trackEngine'

/**
 * Fase 24.2 — trilhas na ficha. Caixinhas clicáveis: clique numa VAZIA marca o
 * tipo selecionado; clique numa MARCADA cura aquele tipo (a mais recente dele).
 * Tamanho vem da fórmula (F17) — cresce sozinho; encolher que perderia marcas
 * pede confirmação (nunca silencioso). Exibição: severas à esquerda.
 */

function tamanhoDaTrilha(t, contextoFormula) {
  const f = String(t.tamanho_formula || '').trim()
  if (!f) return 0
  try { return Math.max(0, Math.floor(avaliarFormula(f, contextoFormula || {}))) }
  catch { return Math.max(0, Math.floor(Number(f) || 0)) }
}

function Trilha({ t, marcasRaw, salvar, contextoFormula, isDono, onEventos, bonus = 0 }) {
  const tipos = t.tipos_marca || []
  const [tipoSel, setTipoSel] = useState(tipos[0]?.id || null)
  const [erro, setErro] = useState('')

  // 25.2 — caixinhas extras compradas com XP somam ao tamanho da fórmula
  const tamanho = tamanhoDaTrilha(t, contextoFormula) + (Number(bonus) || 0)
  const raw = marcasRaw ?? Array(tamanho).fill(null)

  // Redimensionamento pela fórmula: crescer/encolher-sem-perder aplica direto na
  // visão (persiste na próxima interação); encolher que perderia marcas espera
  // confirmação do dono.
  const ajuste = redimensionar(raw, tamanho, t)
  const perderia = raw.length > tamanho && ajuste.removidas.length > 0
  const marcas = perderia ? raw : ajuste.marcas

  const topo = tipoMaisSevero(t)
  const cheiaDoMaior = marcas.length > 0 && topo && marcas.every(m => m === topo)
  const cont = contarMarcas(marcas)
  const exibicao = ordenarExibicao(marcas, t)
  const porId = Object.fromEntries(tipos.map(tm => [tm.id, tm]))
  const sevMax = Math.max(0, ...tipos.map(tm => Number(tm.severidade) || 0))

  async function persistir(novas, eventos = []) {
    setErro('')
    try {
      await salvar(t.id, novas)
      if (eventos.length) onEventos?.(t, eventos)
    } catch (e) { setErro(e.message || 'Erro ao salvar.') }
  }

  function clicarCaixinha(marca) {
    if (!isDono) return
    if (marca == null) {
      if (!tipoSel) return
      const r = marcar(marcas, tipoSel, t)
      persistir(r.marcas, r.eventos)
    } else {
      const r = curar(marcas, marca)
      if (r.curada) persistir(r.marcas)
    }
  }

  function marcarTransbordo() {
    // trilha cheia: o botão "marcar" aplica a regra de transbordo
    if (!isDono || !tipoSel) return
    const r = marcar(marcas, tipoSel, t)
    persistir(r.marcas, r.eventos)
  }

  const corCaixa = m => {
    if (m == null) return 'bg-void/70 border-border/60 text-ink-dim hover:border-accent-500'
    const sev = Number(porId[m]?.severidade) || 0
    return sev >= sevMax
      ? 'bg-harm/80 border-harm text-harm'
      : 'bg-dice-700/70 border-dice-500 text-dice-200'
  }

  return (
    <div className={`rounded-xl border p-3 space-y-2 ${cheiaDoMaior ? 'border-harm/70 bg-harm/20' : 'border-border bg-raised'}`}>
      <div className="flex items-center gap-2 flex-wrap">
        <p className="text-ink text-sm font-semibold">{t.nome || 'Trilha'}</p>
        <span className="text-ink-dim text-xs font-mono">{cont.marcadas}/{cont.total}</span>
        {cheiaDoMaior && t.ao_encher_do_maior?.rotulo && (
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md border bg-harm/80 border-harm text-harm animate-pulse"
            title={t.ao_encher_do_maior.descricao || ''}>
            ☠ {t.ao_encher_do_maior.rotulo}
          </span>
        )}
        {/* Seletor do tipo a marcar */}
        {isDono && tipos.length > 1 && (
          <div className="ml-auto flex gap-1">
            {tipos.map(tm => (
              <button key={tm.id} onClick={() => setTipoSel(tm.id)}
                className={`text-[11px] px-1.5 py-0.5 rounded border font-mono transition-colors ${
                  tipoSel === tm.id ? 'bg-accent-700 border-accent-400 text-ink' : 'bg-void border-border text-ink-dim hover:border-accent-500'
                }`}
                title={`Marcar ${tm.nome}`}>
                {tm.simbolo || tm.nome}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Caixinhas (exibição: severas à esquerda) */}
      <div className="flex flex-wrap gap-1">
        {exibicao.map((m, i) => (
          <button key={i} onClick={() => clicarCaixinha(m)} disabled={!isDono}
            className={`w-7 h-7 rounded border text-sm font-bold font-mono transition-all duration-200 ${corCaixa(m)} ${isDono ? 'cursor-pointer' : 'cursor-default'}`}
            title={m == null ? (isDono ? `Marcar ${porId[tipoSel]?.nome || ''}` : '') : `${porId[m]?.nome || m}${isDono ? ' — clique para curar' : ''}`}>
            {m == null ? '' : (porId[m]?.simbolo || '•')}
          </button>
        ))}
        {/* Trilha cheia: marcar aplica o transbordo */}
        {isDono && cont.livres === 0 && marcas.length > 0 && !cheiaDoMaior && (
          <button onClick={marcarTransbordo}
            className="h-7 px-2 rounded border border-dashed border-harm/50 text-harm text-[11px] hover:bg-harm/50 transition-colors"
            title={t.regra_transbordo === 'ignorar' ? 'Trilha cheia (transbordo ignorado)' : 'Trilha cheia — marcar converte a marca mais antiga'}>
            +{porId[tipoSel]?.simbolo || ''}
          </button>
        )}
      </div>

      {/* Encolher perderia marcas: confirmação explícita */}
      {perderia && isDono && (
        <div className="flex items-center gap-2 flex-wrap rounded-lg border border-dice-500/70 bg-dice-700/40 px-2 py-1.5">
          <span className="text-dice-200 text-[11px]">
            A fórmula reduziu a trilha para {tamanho} caixinhas — ajustar removeria {ajuste.removidas.length} marca(s).
          </span>
          <button onClick={() => persistir(ajuste.marcas)}
            className="px-2 py-0.5 text-[11px] bg-dice-700 hover:bg-dice-500 text-ink rounded transition-colors">
            Ajustar mesmo assim
          </button>
        </div>
      )}

      {erro && <p className="text-harm text-[11px]">{erro}</p>}
    </div>
  )
}

export default function PainelTrilhas({ trilhas = [], marcasDe, salvarMarcas, contextoFormula, isDono, onEventos, bonusDe = null }) {
  if (!trilhas.length) return null
  return (
    <div className="space-y-3">
      {trilhas.map(t => (
        <Trilha key={t.id} t={t} marcasRaw={marcasDe(t.id)} salvar={salvarMarcas}
          contextoFormula={contextoFormula} isDono={isDono} onEventos={onEventos}
          bonus={bonusDe ? bonusDe(t.id) : 0} />
      ))}
    </div>
  )
}
