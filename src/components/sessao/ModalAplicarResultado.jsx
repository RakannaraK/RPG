import { useState } from 'react'
import Modal, { FecharModal } from '../ui/Modal'
import Botao from '../ui/Botao'
import { planejarAplicacao } from '../../lib/alvosCombate'

/**
 * Fase 53 — confirma o resultado de uma ação sobre vários alvos: valor, dano ou
 * cura, quem acertou (ataque x defesa) e quais barras cada um perde/ganha.
 * `alvos` = [{ c, acertou, defesa }]; `ataque` só para mostrar "def N × atq M".
 */
export default function ModalAplicarResultado({
  rotulo, valorInicial = 0, modoInicial = 'dano', alvos = [], ataque = null,
  cardsPorFicha = {}, area = false, onAplicar, onFechar,
}) {
  const [valor, setValor] = useState(String(valorInicial))
  const [modo, setModo] = useState(modoInicial)
  const [metade, setMetade] = useState(false)
  const [escolhas, setEscolhas] = useState({}) // combatenteId → barras marcadas (só o que a pessoa mexeu)
  const [erro, setErro] = useState('')
  const [busy, setBusy] = useState(false)

  // Vida vem marcada; quem errou vem desmarcado (a não ser com "metade")
  const marcadas = ({ c, acertou }) =>
    escolhas[c.id] ?? (acertou || modo === 'cura' || (area && metade) ? ['vida'] : [])
  const poolsDe = c => (c.ficha_id ? cardsPorFicha[c.ficha_id]?.pools || [] : []).filter(p => p.tipo === 'pontos')

  function alternar(a, barra) {
    const atual = marcadas(a)
    setEscolhas(e => ({ ...e, [a.c.id]: atual.includes(barra) ? atual.filter(b => b !== barra) : [...atual, barra] }))
  }

  async function aplicar() {
    const n = Math.abs(Number(valor) || 0)
    if (!n) { setErro('Informe um valor.'); return }
    const plano = planejarAplicacao({
      alvos: alvos.map(({ c, acertou }) => ({ c, acertou: modo === 'cura' || acertou })),
      valor: n, modo,
      barras: Object.fromEntries(alvos.map(a => [a.c.id, marcadas(a)])),
      metadeAoErrar: area && metade,
      cardsPorFicha,
    })
    if (plano.escritas.length === 0) { setErro('Nada marcado para aplicar.'); return }
    setBusy(true)
    setErro('')
    try {
      const res = await onAplicar(plano, `${rotulo} (${modo === 'cura' ? 'cura' : 'dano'} ${n})`)
      if (res?.erro) setErro(res.erro)
      else onFechar()
    } catch (e) {
      setErro(e.message || 'Não foi possível aplicar.')
    } finally {
      setBusy(false)
    }
  }

  const alterna = m => `px-3 py-1 min-h-[24px] text-sm rounded-lg transition-colors ${modo === m ? 'bg-accent-600 text-sobre-acento' : 'bg-hover text-ink hover:bg-border'}`

  return (
    <Modal
      onFechar={onFechar} titulo={rotulo} subtitulo="Confira os alvos antes de aplicar." bloqueado={busy}
      rodape={(
        <>
          {erro && <p className="text-harm text-sm mr-auto" role="alert">{erro}</p>}
          <FecharModal disabled={busy} />
          <Botao variante="primario" onClick={aplicar} disabled={busy}>{busy ? 'Aplicando…' : 'Aplicar'}</Botao>
        </>
      )}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-ink-dim text-sm">
            Valor
            <input
              type="number" min="0" value={valor} onChange={e => setValor(e.target.value)}
              className="w-20 px-2 py-1 rounded-lg bg-void border border-border text-ink text-sm focus:outline-none focus:ring-1 focus:ring-accent-500"
            />
          </label>
          <div className="flex gap-1" role="group" aria-label="Tipo">
            <button type="button" onClick={() => setModo('dano')} className={alterna('dano')}>Dano</button>
            <button type="button" onClick={() => setModo('cura')} className={alterna('cura')}>Cura</button>
          </div>
        </div>

        {area && modo === 'dano' && (
          <label className="flex items-center gap-2 min-h-[24px] text-ink text-sm">
            <input type="checkbox" checked={metade} onChange={e => setMetade(e.target.checked)} />
            Metade em quem defendeu
          </label>
        )}

        <ul className="space-y-2">
          {alvos.map(a => {
            const marc = marcadas(a)
            return (
              <li key={a.c.id} className="rounded-xl border border-border bg-void px-3 py-2 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-ink text-sm font-medium flex-1 min-w-0 truncate">{a.c.nome}</span>
                  {modo === 'dano' && (
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${a.acertou ? 'border-ok text-ok' : 'border-harm text-harm'}`}>
                      {a.acertou ? 'Acertou' : 'Errou'}
                    </span>
                  )}
                  {modo === 'dano' && ataque != null && a.defesa != null && (
                    <span className="text-ink-dim text-xs">def {a.defesa} × atq {ataque}</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  <label className="flex items-center gap-1.5 min-h-[24px] text-ink-dim text-sm">
                    <input type="checkbox" checked={marc.includes('vida')} onChange={() => alternar(a, 'vida')} /> Vida
                  </label>
                  {poolsDe(a.c).map(p => (
                    <label key={p.id} className="flex items-center gap-1.5 min-h-[24px] text-ink-dim text-sm">
                      <input type="checkbox" checked={marc.includes(p.id)} onChange={() => alternar(a, p.id)} /> {p.nome}
                    </label>
                  ))}
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </Modal>
  )
}
