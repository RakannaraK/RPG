import { useState } from 'react'
import { calcularDescanso } from '../../lib/restEngine'
import Modal, { FecharModal } from '../ui/Modal'
import Botao from '../ui/Botao'

/**
 * Fase 15.3 — botões de descanso na ficha, com preview + confirmação.
 * Calcula pelo motor puro (restEngine); só aplica após o usuário confirmar.
 * Oculto se o sistema não tem descansos configurados.
 */
export default function DescansoBar({
  descansos = [], ficha, valoresFinais, habilidadesFicha = [], contextoFormula = null, onAplicar,
  pools = [], linhasPools = [], maximosPools = {}, // 20.1
  configSlots = null, usadosSlots = {},            // 20.3
}) {
  const [preview, setPreview] = useState(null) // { tipo, resultado }
  const [aplicando, setAplicando] = useState(false)
  const [feito, setFeito] = useState('')

  if (!descansos || descansos.length === 0) return null

  function abrir(tipo) {
    const resultado = calcularDescanso({
      tipoDescanso: tipo, ficha, valoresFinais, habilidadesFicha, contexto: contextoFormula,
      pools, linhasPools, maximosPools,
      configSlots, usadosSlots,
    })
    setPreview({ tipo, resultado })
  }

  async function confirmar() {
    if (!preview) return
    setAplicando(true)
    try {
      await onAplicar(preview.tipo, preview.resultado)
      setFeito(`${preview.tipo.nome}: ${preview.resultado.resumo}`)
      setTimeout(() => setFeito(''), 4000)
      setPreview(null)
    } finally {
      setAplicando(false)
    }
  }

  return (
    <div className="bg-raised border border-border rounded-2xl p-4">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-accent-300 text-sm font-medium mr-1">🏕️ Descanso:</span>
        {descansos.map(d => (
          <button
            key={d.id}
            onClick={() => abrir(d)}
            className="px-3 py-1.5 bg-hover hover:bg-border text-accent-300 text-sm rounded-lg transition-colors"
          >
            {d.nome || 'Descanso'}
          </button>
        ))}
      </div>
      {feito && <p className="text-ok text-xs mt-2">✓ {feito}</p>}

      {/* Modal de confirmação com preview */}
      {preview && (
        <Modal
          onFechar={() => setPreview(null)} bloqueado={aplicando} tamanho="sm"
          titulo={preview.tipo.nome} subtitulo={preview.resultado.resumo}
          rodape={
            <>
              <FecharModal disabled={aplicando} />
              <Botao variante="primario" onClick={confirmar} disabled={aplicando}>{aplicando ? 'Aplicando…' : 'Confirmar descanso'}</Botao>
            </>
          }
        >
            <div className="space-y-1.5 text-sm">
              {preview.resultado.vida.recuperado !== 0 && (
                <div className="flex justify-between">
                  <span className="text-ink-dim">Vida{preview.resultado.vida.notacao ? ` (${preview.resultado.vida.notacao})` : ''}</span>
                  <span className="text-ink font-medium">
                    {preview.resultado.vida.de} → {preview.resultado.vida.para}
                    <span className="text-ok ml-1">(+{preview.resultado.vida.recuperado})</span>
                  </span>
                </div>
              )}
              {preview.resultado.vida_temp.para !== preview.resultado.vida_temp.de && (
                <div className="flex justify-between">
                  <span className="text-ink-dim">Vida temporária</span>
                  <span className="text-ink font-medium">{preview.resultado.vida_temp.de} → {preview.resultado.vida_temp.para}</span>
                </div>
              )}
              {preview.resultado.recursos.map(r => (
                <div key={r.habilidadeFichaId} className="flex justify-between">
                  <span className="text-ink-dim">{r.nome}</span>
                  <span className="text-ink font-medium">{r.de} → {r.para}</span>
                </div>
              ))}
              {/* 20.1 — pools recuperados */}
              {(preview.resultado.pools || []).map(p => (
                <div key={p.poolId} className="flex justify-between">
                  <span className="text-temp">{p.nome}</span>
                  <span className="text-ink font-medium">{p.de} → {p.para}</span>
                </div>
              ))}
              {/* 20.3 — slots devolvidos */}
              {(preview.resultado.slots || []).map(s => (
                <div key={s.circulo} className="flex justify-between">
                  <span className="text-dice-400">Slots {s.circulo}º círculo</span>
                  <span className="text-ink font-medium">{s.de} → {s.para} usados</span>
                </div>
              ))}
              {preview.resultado.vida.recuperado === 0
                && preview.resultado.vida_temp.para === preview.resultado.vida_temp.de
                && preview.resultado.recursos.length === 0
                && (preview.resultado.pools || []).length === 0
                && (preview.resultado.slots || []).length === 0 && (
                <p className="text-ink-dim">Nada seria recuperado.</p>
              )}
            </div>

        </Modal>
      )}
    </div>
  )
}
