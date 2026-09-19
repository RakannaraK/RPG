import { useRef, useState } from 'react'

const INP = 'w-full bg-void border border-border rounded-lg px-2.5 py-1.5 text-sm text-ink focus:outline-none focus:border-accent-500'
const BTN = 'px-3 py-1.5 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
const COR_POR_TIPO = { jogador: '#8B5CF6', aliado: '#16A34A', npc: '#D97706', inimigo: '#DC2626' }

/**
 * Fase 26.2 — painel do mestre para pôr tokens na cena aberta: personagens da
 * mesa, combatentes do combate ativo e tokens avulsos (imagem ou cor+iniciais).
 * Os tokens nascem no meio da tela, lado a lado e encaixados na grade.
 */
export default function PainelTokens({ cards, combatentes, tokens, onAdicionar, onEnviarImagem, acoesBestiario = null }) {
  const fichasNoMapa = new Set(tokens.filter(t => t.ficha_id).map(t => t.ficha_id))
  const combatentesNoMapa = new Set(tokens.filter(t => t.combatente_id).map(t => t.combatente_id))

  const fichasFora = cards.filter(c => !fichasNoMapa.has(c.id))
  const combatentesFora = combatentes.filter(c => (
    !combatentesNoMapa.has(c.id) && !(c.ficha_id && fichasNoMapa.has(c.ficha_id))
  ))

  const tokenDeFicha = card => ({ ficha_id: card.id, nome: card.nome, imagem_url: card.imagem || null, cor: COR_POR_TIPO.jogador })
  const tokenDeCombatente = c => {
    const card = c.ficha_id ? cards.find(cd => cd.id === c.ficha_id) : null
    return {
      combatente_id: c.id,
      ficha_id: c.ficha_id || null,
      nome: card?.nome || c.nome,
      imagem_url: card?.imagem || null,
      cor: COR_POR_TIPO[c.tipo] || COR_POR_TIPO.inimigo,
    }
  }

  return (
    <div className="p-4 space-y-6">
      {acoesBestiario && <div>{acoesBestiario}</div>}
      <Secao
        titulo={`Personagens da mesa (${fichasFora.length} fora do mapa)`}
        vazio={cards.length === 0 ? 'Nenhuma ficha nesta mesa.' : 'Todos os personagens já estão no mapa.'}
        itens={fichasFora}
        nome={c => c.nome}
        imagem={c => c.imagem}
        onUm={c => onAdicionar([tokenDeFicha(c)])}
        onTodos={() => onAdicionar(fichasFora.map(tokenDeFicha))}
      />

      {combatentes.length > 0 && (
        <Secao
          titulo={`Combate ativo (${combatentesFora.length} fora do mapa)`}
          vazio="Todos os combatentes já estão no mapa."
          itens={combatentesFora}
          nome={c => c.nome}
          imagem={c => (c.ficha_id ? cards.find(cd => cd.id === c.ficha_id)?.imagem : null)}
          cor={c => COR_POR_TIPO[c.tipo] || COR_POR_TIPO.inimigo}
          onUm={c => onAdicionar([tokenDeCombatente(c)])}
          onTodos={() => onAdicionar(combatentesFora.map(tokenDeCombatente))}
        />
      )}

      <TokenAvulso onAdicionar={onAdicionar} onEnviarImagem={onEnviarImagem} />
    </div>
  )
}

function Secao({ titulo, vazio, itens, nome, imagem, cor, onUm, onTodos }) {
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState('')
  const executar = fn => async () => {
    setOcupado(true)
    setErro('')
    try { await fn() } catch (err) { setErro(err.message || 'Não foi possível adicionar.') } finally { setOcupado(false) }
  }

  return (
    <section className="space-y-2">
      <h2 className="text-ink-dim text-xs font-semibold uppercase tracking-wider">{titulo}</h2>
      {itens.length === 0 ? (
        <p className="text-ink-dim text-sm">{vazio}</p>
      ) : (
        <>
          <ul className="space-y-1">
            {itens.map(item => (
              <li key={item.id} className="flex items-center gap-2 rounded-lg bg-void border border-border px-2 py-1.5">
                {imagem(item) ? (
                  <img src={imagem(item)} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
                ) : (
                  <span className="w-7 h-7 rounded-full shrink-0" style={{ background: cor?.(item) || 'var(--accent-600)' }} />
                )}
                <span className="flex-1 min-w-0 text-ink text-sm truncate">{nome(item)}</span>
                <button onClick={executar(() => onUm(item))} disabled={ocupado} className={`${BTN} bg-hover text-ink hover:bg-border`} title="Pôr no mapa">
                  +
                </button>
              </li>
            ))}
          </ul>
          {itens.length > 1 && (
            <button onClick={executar(onTodos)} disabled={ocupado} className={`${BTN} w-full bg-accent-700 hover:bg-accent-600 text-white`}>
              Pôr todos no mapa ({itens.length})
            </button>
          )}
        </>
      )}
      {erro && <p className="text-harm text-sm">{erro}</p>}
    </section>
  )
}

function TokenAvulso({ onAdicionar, onEnviarImagem }) {
  const inputRef = useRef(null)
  const [nome, setNome] = useState('')
  const [cor, setCor] = useState('#DC2626')
  const [tamanho, setTamanho] = useState(1)
  const [arquivo, setArquivo] = useState(null)
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState('')

  async function adicionar() {
    setOcupado(true)
    setErro('')
    try {
      const imagem_url = arquivo ? await onEnviarImagem(arquivo) : null
      await onAdicionar([{ nome: nome.trim() || 'Token', cor, tamanho, imagem_url }], tamanho)
      setNome('')
      setArquivo(null)
      if (inputRef.current) inputRef.current.value = ''
    } catch (err) {
      setErro(err.message || 'Não foi possível adicionar.')
    } finally {
      setOcupado(false)
    }
  }

  return (
    <section className="space-y-2">
      <h2 className="text-ink-dim text-xs font-semibold uppercase tracking-wider">Token avulso</h2>
      <input className={INP} placeholder="Nome (ex: Goblin, Baú, Armadilha)" value={nome} onChange={e => setNome(e.target.value)} />
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-ink-dim text-xs">Cor</span>
          <input type="color" className="w-full h-8 bg-void border border-border rounded-lg" value={cor} onChange={e => setCor(e.target.value)} />
        </label>
        <label className="block">
          <span className="text-ink-dim text-xs">Tamanho</span>
          <select className={INP} value={tamanho} onChange={e => setTamanho(Number(e.target.value))}>
            {[0.5, 1, 2, 3, 4].map(t => <option key={t} value={t}>{t}×{t} quadrados</option>)}
          </select>
        </label>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={e => setArquivo(e.target.files?.[0] || null)}
        className="block w-full text-sm text-ink-dim file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-hover file:text-ink hover:file:bg-border"
      />
      <button onClick={adicionar} disabled={ocupado} className={`${BTN} w-full bg-accent-700 hover:bg-accent-600 text-white`}>
        {ocupado ? 'Adicionando…' : 'Pôr no mapa'}
      </button>
      {erro && <p className="text-harm text-sm">{erro}</p>}
    </section>
  )
}
