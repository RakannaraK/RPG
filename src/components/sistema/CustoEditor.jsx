import { validarFormula } from '../../lib/formulaEngine'
import { validarEscala } from '../../lib/poderes'
import Botao from '../ui/Botao'

const INP = 'px-2 py-1 rounded-lg bg-void border border-border text-white text-xs placeholder-ink-dim focus:outline-none focus:ring-1 focus:ring-purple-500'

/**
 * Fase 20.2 — monta a lista de débitos de um poder.
 *   { tipo:'pool', pool_id, quantidade }  — quantidade aceita fórmula (F17)
 *   { tipo:'slot', circulo_minimo }
 */
export function CustoEditor({ custo = [], pools = [], onChange }) {
  const temSlot = custo.some(c => c.tipo === 'slot')

  function set(i, patch) {
    onChange(custo.map((c, j) => (j === i ? { ...c, ...patch } : c)))
  }
  function remover(i) {
    onChange(custo.filter((_, j) => j !== i))
  }
  function addPool() {
    onChange([...custo, { tipo: 'pool', pool_id: pools[0]?.id || '', quantidade: '1' }])
  }
  function addSlot() {
    onChange([...custo, { tipo: 'slot', circulo_minimo: 1 }])
  }

  return (
    <div className="space-y-1.5">
      {custo.map((c, i) => {
        const qtdInvalida =
          c.tipo === 'pool' && String(c.quantidade ?? '').trim() && !validarFormula(c.quantidade).valida
        return (
          <div key={i} className="flex items-center gap-1.5 flex-wrap">
            {c.tipo === 'pool' ? (
              <>
                <span className="text-accent-300 text-xs w-10">gasta</span>
                <input
                  type="text"
                  value={c.quantidade ?? ''}
                  onChange={e => set(i, { quantidade: e.target.value })}
                  placeholder="3 ou piso(nivel/2)"
                  spellCheck={false}
                  className={`${INP} w-32 font-mono ${qtdInvalida ? 'border-red-600' : ''}`}
                  title="Aceita número ou fórmula"
                />
                <select value={c.pool_id || ''} onChange={e => set(i, { pool_id: e.target.value })} className={INP}>
                  <option value="">Recurso...</option>
                  {pools.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </>
            ) : (
              <>
                <span className="text-accent-300 text-xs w-10">slot</span>
                <span className="text-purple-400 text-xs">círculo mínimo</span>
                <input
                  type="number"
                  min={0}
                  value={c.circulo_minimo ?? ''}
                  onChange={e => set(i, { circulo_minimo: Number(e.target.value) })}
                  className={`${INP} w-14 text-center`}
                />
              </>
            )}
            <button type="button" onClick={() => remover(i)}
              className="w-5 h-5 flex items-center justify-center text-accent-300 hover:text-red-400 transition-colors"
              title="Remover custo">×</button>
          </div>
        )
      })}

      <div className="flex gap-1.5">
        <Botao variante="contorno" tamanho="sm" type="button" onClick={addPool} disabled={pools.length === 0}
         
          title={pools.length === 0 ? 'Crie um recurso na aba Recursos' : 'Custo em recurso'}>
          + recurso
        </Botao>
        <Botao variante="contorno" tamanho="sm" type="button" onClick={addSlot} disabled={temSlot}
         
          title={temSlot ? 'Só um custo de slot por poder' : 'Custo em slot de círculo'}>
          + slot
        </Botao>
      </div>
      {custo.length === 0 && <p className="text-accent-300 text-xs">Sem custo.</p>}
    </div>
  )
}

/**
 * Fase 20.2 — escala por círculo. O valor da faixa é a TAXA por círculo ACIMA
 * do mínimo: um poder de 1º círculo lançado no 3º recebe 2× a taxa.
 */
export function EscalaEditor({ escala, onChange }) {
  const faixas = escala?.faixas || []
  const status = faixas.length > 0 ? validarEscala(escala) : null

  function set(i, patch) {
    onChange({ faixas: faixas.map((f, j) => (j === i ? { ...f, ...patch } : f)) })
  }
  function remover(i) {
    const restantes = faixas.filter((_, j) => j !== i)
    onChange(restantes.length ? { faixas: restantes } : null)
  }
  function adicionar() {
    const ultima = faixas[faixas.length - 1]
    if (!ultima) {
      onChange({ faixas: [{ de: 2, ate: null, valor_extra_por_circulo: '' }] })
      return
    }
    const fim = ultima.ate == null || ultima.ate === '' ? Number(ultima.de) : Number(ultima.ate)
    const anteriores = faixas.map((f, j) =>
      j === faixas.length - 1 && (f.ate == null || f.ate === '') ? { ...f, ate: fim } : f
    )
    onChange({ faixas: [...anteriores, { de: fim + 1, ate: null, valor_extra_por_circulo: '' }] })
  }

  return (
    <div className="space-y-1.5">
      {faixas.map((f, i) => (
        <div key={i} className="flex items-center gap-1.5 flex-wrap">
          <span className="text-accent-300 text-xs">círculo</span>
          <input type="number" value={f.de ?? ''} onChange={e => set(i, { de: Number(e.target.value) })}
            className={`${INP} w-14 text-center`} />
          <span className="text-accent-300 text-xs">até</span>
          <input type="number" value={f.ate ?? ''} placeholder="∞"
            onChange={e => set(i, { ate: e.target.value === '' ? null : Number(e.target.value) })}
            className={`${INP} w-14 text-center`} />
          <span className="text-accent-300 text-xs">→ +</span>
          <input type="text" value={f.valor_extra_por_circulo ?? ''}
            onChange={e => set(i, { valor_extra_por_circulo: e.target.value })}
            placeholder="1d8" spellCheck={false} className={`${INP} w-20 font-mono`} />
          <span className="text-accent-300 text-xs">por círculo acima</span>
          <button type="button" onClick={() => remover(i)}
            className="w-5 h-5 flex items-center justify-center text-accent-300 hover:text-red-400 transition-colors">×</button>
        </div>
      ))}
      <Botao variante="contorno" tamanho="sm" type="button" onClick={adicionar}>
        + faixa
      </Botao>
      {faixas.length === 0 && <p className="text-accent-300 text-xs">Não escala com o círculo.</p>}
      {status && !status.valida && <p className="text-red-400 text-xs">⚠ {status.erro}</p>}
    </div>
  )
}
