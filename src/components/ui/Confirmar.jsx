import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import Modal from './Modal'
import Botao from './Botao'

/**
 * Fase 52 — confirmação e pergunta com a cara do site, no lugar de
 * `window.confirm`/`window.prompt` (caixa cinza do navegador, sem tema).
 *
 *   const { confirmar, perguntar } = useConfirmar()
 *   if (!(await confirmar({ titulo: 'Excluir criatura?', mensagem: 'Goblin sai do bestiário.', confirmar: 'Excluir', perigo: true }))) return
 *   const nome = await perguntar({ titulo: 'Mover para pasta', rotulo: 'Pasta', valor: 'Vilões' }) // null = cancelou
 */
const Ctx = createContext(null)

export function useConfirmar() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useConfirmar precisa do ConfirmarProvider')
  return ctx
}

export function ConfirmarProvider({ children }) {
  const [pedido, setPedido] = useState(null) // o último fica guardado durante a animação de saída
  const [aberto, setAberto] = useState(false)
  const [valor, setValor] = useState('')
  const resolverRef = useRef(null)

  const abrir = useCallback((tipo, opcoes) => new Promise(resolver => {
    const o = typeof opcoes === 'string' ? { mensagem: opcoes } : (opcoes || {})
    resolverRef.current?.(tipo === 'perguntar' ? null : false) // um pedido por vez
    resolverRef.current = resolver
    setValor(o.valor ?? '')
    setPedido({ tipo, ...o })
    setAberto(true)
  }), [])

  const api = useMemo(() => ({
    confirmar: o => abrir('confirmar', o),
    perguntar: o => abrir('perguntar', o),
  }), [abrir])

  function responder(resposta) {
    resolverRef.current?.(resposta)
    resolverRef.current = null
    setAberto(false)
  }
  const cancelar = () => responder(pedido?.tipo === 'perguntar' ? null : false)

  const p = pedido || {}
  return (
    <Ctx.Provider value={api}>
      {children}
      <Modal
        aberto={aberto} onFechar={cancelar} tamanho="sm" tom={p.perigo ? 'perigo' : 'normal'}
        titulo={p.titulo || (p.tipo === 'perguntar' ? 'Responder' : 'Tem certeza?')}
        rodape={
          <>
            {/* ação destrutiva: o foco começa no Cancelar (Enter não apaga nada sem querer) */}
            <Botao variante="fantasma" onClick={cancelar} autoFocus={p.tipo !== 'perguntar' && !!p.perigo}>{p.cancelar || 'Cancelar'}</Botao>
            <Botao
              variante={p.perigo ? 'perigo' : 'primario'} autoFocus={p.tipo !== 'perguntar' && !p.perigo}
              onClick={p.tipo === 'perguntar' ? undefined : () => responder(true)}
              type={p.tipo === 'perguntar' ? 'submit' : 'button'} form={p.tipo === 'perguntar' ? 'form-pergunta' : undefined}
            >{p.confirmar || (p.tipo === 'perguntar' ? 'Salvar' : 'Confirmar')}</Botao>
          </>
        }
      >
        {p.mensagem && <p className="text-ink text-sm whitespace-pre-line">{p.mensagem}</p>}
        {p.detalhe && <p className="text-ink-dim text-sm mt-2">{p.detalhe}</p>}
        {p.tipo === 'perguntar' && (
          <form id="form-pergunta" onSubmit={e => { e.preventDefault(); responder(valor) }} className={p.mensagem ? 'mt-4' : ''}>
            <label className="block text-ink-dim text-sm mb-1.5">{p.rotulo || 'Resposta'}</label>
            <input
              value={valor} onChange={e => setValor(e.target.value)}
              maxLength={p.maxLength || 200} placeholder={p.placeholder || ''}
              className="campo w-full"
            />
          </form>
        )}
      </Modal>
    </Ctx.Provider>
  )
}
