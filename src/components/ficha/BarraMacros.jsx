import { useState } from 'react'
import { useRolagem } from '../../hooks/useRolagem'
import { usePreferencias } from '../../context/PreferenciasContext'
import { tocarSomDado, estimarNumDados } from '../../lib/diceSounds'
import {
  adicionarMacro, editarMacro, moverMacro, normalizarMacros, removerMacro, validarMacro,
} from '../../lib/macros'
import Botao from '../ui/Botao'
import Ilustra from '../arte/Ilustra'
import Icone from '../ui/Icone'

const CAMPO = 'px-2.5 py-1.5 rounded-lg bg-void border border-border text-ink text-sm placeholder:text-ink-dim focus:outline-none'

/** Formulário de uma macro (nova ou em edição), com a rolagem resolvida ao vivo. */
function FormMacro({ inicial, contexto, rotuloBotao, onSalvar, onCancelar }) {
  const [nome, setNome] = useState(inicial?.nome || '')
  const [notacao, setNotacao] = useState(inicial?.notacao || '')
  const checagem = notacao || nome ? validarMacro({ nome, notacao }, contexto) : null

  function salvar(e) {
    e.preventDefault()
    if (!checagem?.ok) return
    onSalvar({ nome, notacao })
    if (!inicial) { setNome(''); setNotacao('') }
  }

  return (
    <form onSubmit={salvar} className="flex flex-wrap items-start gap-2">
      <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome (ex.: Ataque)" aria-label="Nome da macro" className={`${CAMPO} w-40`} />
      <div className="flex-1 min-w-[12rem]">
        <input value={notacao} onChange={e => setNotacao(e.target.value)} placeholder="Rolagem (ex.: 1d20+mod(forca))" aria-label="Rolagem da macro" className={`${CAMPO} w-full font-mono`} />
        {checagem && (
          <p className={`mt-1 text-xs ${checagem.ok ? 'text-ink-dim' : 'text-harm'}`}>
            {checagem.ok ? <>vai rolar <span className="font-mono text-ink">{checagem.notacao}</span></> : checagem.erro}
          </p>
        )}
      </div>
      <Botao type="submit" variante="primario" tamanho="sm" disabled={!checagem?.ok}>{rotuloBotao}</Botao>
      {onCancelar && <Botao variante="fantasma" tamanho="sm" onClick={onCancelar}>Cancelar</Botao>}
    </form>
  )
}

/**
 * Fase 39 — macros de rolagem: o jogador salva as rolagens que usa sempre e
 * rola com um clique. A notação aceita fórmula da ficha, então a macro
 * acompanha o personagem quando ele sobe de nível ou ganha um buff.
 */
export default function BarraMacros({ ficha, fichaId, mesaId, podeEditar, contexto, onSalvar }) {
  // cópia local otimista: salvar não espera o refetch da ficha, que remontava
  // a página e tirava do modo de edição a cada macro adicionada
  const [local, setLocal] = useState(null)
  const macros = local ?? normalizarMacros(ficha?.macros)
  const { registrarRolagem } = useRolagem()
  const { preferencias } = usePreferencias()
  const [editando, setEditando] = useState(false)
  const [emEdicao, setEmEdicao] = useState(null)
  const [ultimo, setUltimo] = useState({}) // id -> total
  const [rolando, setRolando] = useState(null) // id da macro com o dado girando
  const [erro, setErro] = useState('')

  if (!macros.length && !podeEditar) return null

  async function rolar(macro) {
    const checagem = validarMacro(macro, contexto)
    if (!checagem.ok) { setErro(`${macro.nome}: ${checagem.erro}`); return }
    setErro('')
    tocarSomDado(preferencias.dado_skin, {
      ativo: preferencias.som_ativo, volume: preferencias.som_volume,
      numDados: estimarNumDados(checagem.notacao),
    })
    setRolando(macro.id)
    try {
      const r = await registrarRolagem({ mesaId, fichaId, rotulo: macro.nome, notacao: checagem.notacao })
      setUltimo(u => ({ ...u, [macro.id]: r?.total }))
      setTimeout(() => setUltimo(u => { const n = { ...u }; delete n[macro.id]; return n }), 5000)
    } catch (e) {
      setErro(e?.message || 'Não foi possível rolar.')
    } finally {
      setRolando(null)
    }
  }

  async function salvar(lista) {
    setErro('')
    const antes = local
    setLocal(lista)
    try {
      await onSalvar(lista)
    } catch (e) {
      setLocal(antes) // volta ao que estava se o banco recusar
      setErro(e?.message || 'Não foi possível salvar.')
    }
  }

  return (
    <section className="space-y-3 print:hidden" aria-label="Macros de rolagem">
      <div className="flex items-center gap-2">
        <Ilustra nome="d20" tamanho={20} />
        <h2 className="font-sora text-ink font-semibold">Macros</h2>
        {!editando && macros.length > 0 && <span className="text-ink-dim text-xs">clique para rolar · o resultado vai para o feed</span>}
        {podeEditar && (
          <Botao variante="fantasma" tamanho="sm" className="ml-auto" onClick={() => { setEditando(v => !v); setEmEdicao(null) }}>
            {editando ? 'Pronto' : macros.length ? 'Editar' : '+ Nova macro'}
          </Botao>
        )}
      </div>

      {!editando && (
        macros.length ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(10.5rem,1fr))] gap-2">
            {macros.map(m => {
              const checagem = validarMacro(m, contexto)
              const resultado = ultimo[m.id]
              return (
                <button
                  key={m.id} type="button" onClick={() => rolar(m)}
                  title={checagem.ok ? `${m.notacao}  →  ${checagem.notacao}` : checagem.erro}
                  className={`macro botao group relative text-left rounded-xl border px-3 py-2.5 ${
                    checagem.ok ? 'border-dice-700/60 bg-dice-700/10 hover:border-dice-400 hover:bg-dice-700/20' : 'border-border bg-void/50 opacity-60'
                  } ${rolando === m.id ? 'macro-rolando' : ''}`}
                >
                  <span className="flex items-center gap-2">
                    <Icone nome="dado" tamanho={16} className="text-dice-400 shrink-0 macro-dado" />
                    <span className="text-ink text-sm font-semibold truncate">{m.nome}</span>
                  </span>
                  <span className="block font-mono text-xs text-ink-dim mt-1 truncate">{checagem.ok ? checagem.notacao : 'não dá para rolar'}</span>
                  {resultado !== undefined && (
                    <span key={resultado} className="macro-resultado absolute -top-2 -right-2 min-w-[2rem] h-8 px-2 rounded-full bg-dice-500 text-bg font-mono font-bold text-sm inline-flex items-center justify-center shadow-nivel-2" aria-live="polite">
                      {resultado}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        ) : (
          <p className="text-ink-dim text-xs">
            Salve as rolagens que você usa sempre e role com um clique. A rolagem pode usar a ficha:
            {' '}<span className="font-mono text-ink">1d20+mod(forca)</span>, <span className="font-mono text-ink">2d6+nivel</span>.
          </p>
        )
      )}

      {editando && (
        <div className="space-y-3">
          {macros.map((m, i) => (
            <div key={m.id} className="border-t border-border/60 pt-3 first:border-t-0 first:pt-0">
              {emEdicao === m.id ? (
                <FormMacro
                  inicial={m} contexto={contexto} rotuloBotao="Salvar"
                  onSalvar={v => { salvar(editarMacro(macros, m.id, v)); setEmEdicao(null) }}
                  onCancelar={() => setEmEdicao(null)}
                />
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-ink text-sm font-medium">{m.nome}</span>
                  <span className="text-ink-dim text-xs font-mono">{m.notacao}</span>
                  <div className="ml-auto flex items-center gap-1">
                    <Botao variante="fantasma" tamanho="icone" aria-label={`Subir ${m.nome}`} disabled={i === 0} onClick={() => salvar(moverMacro(macros, m.id, -1))}>▲</Botao>
                    <Botao variante="fantasma" tamanho="icone" aria-label={`Descer ${m.nome}`} disabled={i === macros.length - 1} onClick={() => salvar(moverMacro(macros, m.id, 1))}>▼</Botao>
                    <Botao variante="fantasma" tamanho="sm" onClick={() => setEmEdicao(m.id)}>Editar</Botao>
                    <Botao variante="fantasma" tamanho="sm" className="text-red-300 hover:text-white hover:bg-red-950/40" onClick={() => salvar(removerMacro(macros, m.id))}>Remover</Botao>
                  </div>
                </div>
              )}
            </div>
          ))}
          <div className="border-t border-border/60 pt-3">
            <FormMacro contexto={contexto} rotuloBotao="+ Adicionar" onSalvar={v => salvar(adicionarMacro(macros, v))} />
          </div>
        </div>
      )}

      {erro && <p className="text-harm text-xs">{erro}</p>}
    </section>
  )
}
