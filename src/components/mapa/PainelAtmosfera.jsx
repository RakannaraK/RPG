import { useState } from 'react'
import Botao from '../ui/Botao'
import Icone from '../ui/Icone'
import { SONS_AMBIENTE, TIPOS_ATMOSFERA, LIMITES } from '../../lib/efeitosVocabulario'
import {
  adicionarEfeito, atualizarEfeito, removerEfeito, atualizarFonte, removerFonte,
  definirLuz, aplicarCena, limparCena, ehLocal,
} from '../../lib/atmosfera'
import { normalizarGrade } from '../../lib/mapaEngine'

const INP = 'w-full bg-void border border-border rounded-lg px-2.5 py-1.5 text-sm text-ink focus:outline-none focus:border-accent-500'
const TITULO = 'text-ink-dim text-xs font-semibold uppercase tracking-wider mb-2'
const COR = 'h-7 w-10 shrink-0 bg-void border border-border rounded-lg'

/**
 * Fase 57 — painel do mestre: cenas prontas, efeitos de clima, luz e som.
 * `onMudar(atmosferaNova)` grava; `onColocar(pedido | null)` pede um clique no mapa
 * (a página usa `colocarNoMapa`); `colocando` = pedido em andamento.
 */
export default function PainelAtmosfera({ atmosfera, onMudar, cenas = [], grade, colocando, onColocar, onAbrirExtensoes }) {
  const [tipo, setTipo] = useState('fogo')
  const unidade = normalizarGrade(grade).unidade_nome
  const pacotes = [...new Set(cenas.map(c => c.pacote || 'Cenas'))]
  const extras = Object.keys(SONS_AMBIENTE)

  const alternarSom = id => {
    const sons = atmosfera.sons.includes(id) ? atmosfera.sons.filter(s => s !== id) : [...atmosfera.sons, id]
    onMudar({ ...atmosfera, sons: sons.slice(0, LIMITES.sons) })
  }

  return (
    <div className="p-4 space-y-6">
      {colocando && (
        <div className="rounded-xl border border-accent-500 bg-raised p-2 flex items-center gap-2">
          <p className="flex-1 text-sm text-ink">Clique no mapa para colocar…</p>
          <Botao tamanho="sm" onClick={() => onColocar(null)}>Cancelar</Botao>
        </div>
      )}

      <section>
        <h2 className={TITULO}>Cenas prontas</h2>
        {cenas.length === 0 ? (
          <p className="text-ink-dim text-sm">Nenhuma cena instalada.</p>
        ) : pacotes.map(pacote => (
          <div key={pacote} className="mb-2">
            <p className="text-ink-dim text-xs mb-1">{pacote}</p>
            <div className="flex flex-wrap gap-1.5">
              {cenas.filter(c => (c.pacote || 'Cenas') === pacote).map(c => (
                <Botao key={c.id} tamanho="sm" onClick={() => onMudar(aplicarCena(atmosfera, c))}>{c.nome}</Botao>
              ))}
            </div>
          </div>
        ))}
        <Botao tamanho="sm" variante="contorno" onClick={() => onMudar(limparCena(atmosfera))}>Limpar cena</Botao>
      </section>

      <section className="space-y-2">
        <h2 className={TITULO}>Efeitos ({atmosfera.efeitos.length}/{LIMITES.efeitos})</h2>
        {atmosfera.efeitos.length === 0 && <p className="text-ink-dim text-sm">Nenhum efeito nesta cena.</p>}
        <ul className="space-y-2">
          {atmosfera.efeitos.map(e => {
            const t = TIPOS_ATMOSFERA[e.tipo]
            return (
              <li key={e.id} className="rounded-xl border border-border bg-void p-2 space-y-1.5">
                <div className="flex items-center gap-2">
                  <p className="flex-1 min-w-0 text-ink text-sm font-medium truncate">{t.nome}</p>
                  <span className="text-ink-dim text-xs">{ehLocal(e) ? 'no mapa' : 'cena inteira'}</span>
                  <Botao tamanho="icone" variante="fantasma" title="Remover efeito" aria-label={`Remover ${t.nome}`} onClick={() => onMudar(removerEfeito(atmosfera, e.id))}>
                    <Icone nome="lixeira" tamanho={16} />
                  </Botao>
                </div>
                <label className="flex items-center gap-2 text-xs text-ink-dim">
                  <span className="w-20 shrink-0">Intensidade</span>
                  <input type="range" min="0.1" max="1" step="0.05" className="flex-1" value={e.intensidade}
                    onChange={ev => onMudar(atualizarEfeito(atmosfera, e.id, { intensidade: Number(ev.target.value) }))} />
                </label>
                <div className="flex items-center gap-2 text-xs text-ink-dim">
                  <span className="w-20 shrink-0">Cor</span>
                  <input type="color" aria-label={`Cor de ${t.nome}`} className={COR} value={e.cor || t.cor}
                    onChange={ev => onMudar(atualizarEfeito(atmosfera, e.id, { cor: ev.target.value }))} />
                  {e.cor && <Botao tamanho="sm" variante="fantasma" onClick={() => onMudar(atualizarEfeito(atmosfera, e.id, { cor: null }))}>Padrão</Botao>}
                </div>
                {ehLocal(e) && (
                  <div className="flex items-center gap-2 text-xs text-ink-dim">
                    <label className="flex items-center gap-2 flex-1">
                      <span className="w-20 shrink-0">Raio ({unidade})</span>
                      <input type="number" min="0.5" max="60" step="0.5" className={INP} value={e.raio}
                        onChange={ev => onMudar(atualizarEfeito(atmosfera, e.id, { raio: Number(ev.target.value) }))} />
                    </label>
                    <Botao tamanho="sm" onClick={() => onColocar({ oQue: 'mover', id: e.id })}>Mover</Botao>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
        <div className="space-y-1.5 pt-1">
          <label className="block">
            <span className="text-ink-dim text-xs">Adicionar efeito</span>
            <select className={INP} value={tipo} onChange={ev => setTipo(ev.target.value)}>
              {Object.entries(TIPOS_ATMOSFERA).map(([id, t]) => <option key={id} value={id}>{t.nome}</option>)}
            </select>
          </label>
          <div className="flex gap-1.5">
            <Botao tamanho="sm" variante="primario" className="flex-1" onClick={() => onMudar(adicionarEfeito(atmosfera, { tipo }))}>Na cena inteira</Botao>
            <Botao tamanho="sm" className="flex-1" disabled={!!TIPOS_ATMOSFERA[tipo].soCena}
              title={TIPOS_ATMOSFERA[tipo].soCena ? 'Este efeito só vale para a cena inteira' : undefined}
              onClick={() => onColocar({ oQue: 'efeito', tipo })}>Colocar no mapa</Botao>
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className={TITULO}>Luz</h2>
        <label className="flex items-center gap-2 text-xs text-ink-dim">
          <span className="w-20 shrink-0">Escuridão</span>
          <input type="range" min="0" max="0.95" step="0.05" className="flex-1" value={atmosfera.luz.escuridao}
            onChange={ev => onMudar(definirLuz(atmosfera, { escuridao: Number(ev.target.value) }))} />
        </label>
        <div className="flex items-center gap-2 text-xs text-ink-dim">
          <span className="w-20 shrink-0">Cor</span>
          <input type="color" aria-label="Cor da escuridão" className={COR} value={atmosfera.luz.cor}
            onChange={ev => onMudar(definirLuz(atmosfera, { cor: ev.target.value }))} />
        </div>
        <Botao tamanho="sm" onClick={() => onColocar({ oQue: 'luz' })}>Colocar luz</Botao>
        <ul className="space-y-2">
          {atmosfera.luz.fontes.map((f, i) => (
            <li key={f.id} className="rounded-xl border border-border bg-void p-2 space-y-1.5">
              <div className="flex items-center gap-2">
                <p className="flex-1 text-ink text-sm font-medium">Luz {i + 1}</p>
                <Botao tamanho="sm" onClick={() => onColocar({ oQue: 'mover', id: f.id })}>Mover</Botao>
                <Botao tamanho="icone" variante="fantasma" title="Remover luz" aria-label={`Remover luz ${i + 1}`} onClick={() => onMudar(removerFonte(atmosfera, f.id))}>
                  <Icone nome="lixeira" tamanho={16} />
                </Botao>
              </div>
              <div className="flex items-center gap-2 text-xs text-ink-dim">
                <label className="flex items-center gap-2 flex-1">
                  <span className="shrink-0">Raio ({unidade})</span>
                  <input type="number" min="0.5" max="60" step="0.5" className={INP} value={f.raio}
                    onChange={ev => onMudar(atualizarFonte(atmosfera, f.id, { raio: Number(ev.target.value) }))} />
                </label>
                <input type="color" aria-label={`Cor da luz ${i + 1}`} className={COR} value={f.cor}
                  onChange={ev => onMudar(atualizarFonte(atmosfera, f.id, { cor: ev.target.value }))} />
              </div>
              <label className="flex items-center gap-2 text-sm text-ink">
                <input type="checkbox" checked={f.tremula} onChange={ev => onMudar(atualizarFonte(atmosfera, f.id, { tremula: ev.target.checked }))} />
                Trêmula
              </label>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className={TITULO}>Som</h2>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={atmosfera.som} onChange={ev => onMudar({ ...atmosfera, som: ev.target.checked })} />
          Som da cena para todos
        </label>
        <p className="text-ink-dim text-xs">Os efeitos já trazem seu som. Extras (até {LIMITES.sons}):</p>
        <div className="grid grid-cols-2 gap-1">
          {extras.map(id => (
            <label key={id} className="flex items-center gap-2 text-sm text-ink">
              <input type="checkbox" checked={atmosfera.sons.includes(id)}
                disabled={!atmosfera.sons.includes(id) && atmosfera.sons.length >= LIMITES.sons}
                onChange={() => alternarSom(id)} />
              {SONS_AMBIENTE[id]}
            </label>
          ))}
        </div>
      </section>

      <Botao tamanho="sm" variante="contorno" onClick={onAbrirExtensoes}>Extensões</Botao>
    </div>
  )
}
