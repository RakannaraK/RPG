import { useRef, useState } from 'react'
import { normalizarGrade } from '../../lib/mapaEngine'

const INP = 'w-full bg-void border border-border rounded-lg px-2.5 py-1.5 text-sm text-ink focus:outline-none focus:border-accent-500'
const BTN = 'px-3 py-1.5 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed'

const DIAGONAIS = [
  { id: 'chebyshev', nome: 'Diagonal vale 1 (padrão D&D 5e)' },
  { id: 'alternada', nome: 'Alterna 1, 2, 1… (5-10-5)' },
  { id: 'euclidiana', nome: 'Distância real' },
]

/**
 * Fase 26.1 — painel do mestre: enviar cenas, escolher qual ver, mostrar aos
 * jogadores, apagar e ajustar a grade (com prévia ao vivo antes de salvar).
 */
export default function PainelCenas({ mapas, cena, onVer, onCriar, onAtivar, onRemover, onAtualizar, onRascunhoGrade }) {
  return (
    <div className="p-4 space-y-6">
      <NovaCena onCriar={onCriar} />

      <section>
        <h2 className="text-ink-dim text-xs font-semibold uppercase tracking-wider mb-2">Cenas ({mapas.length})</h2>
        {mapas.length === 0 ? (
          <p className="text-ink-dim text-sm">Nenhuma cena ainda. Envie a imagem de um mapa acima.</p>
        ) : (
          <ul className="space-y-2">
            {mapas.map(m => (
              <ItemCena
                key={m.id}
                mapa={m}
                aberta={m.id === cena?.id}
                onVer={() => onVer(m.id)}
                onAtivar={() => onAtivar(m.ativo ? null : m.id)}
                onRemover={() => onRemover(m)}
              />
            ))}
          </ul>
        )}
      </section>

      {cena && (
        <EditorCena
          key={cena.id}
          cena={cena}
          onAtualizar={patch => onAtualizar(cena.id, patch)}
          onRascunhoGrade={g => onRascunhoGrade(cena.id, g)}
        />
      )}
    </div>
  )
}

function NovaCena({ onCriar }) {
  const inputRef = useRef(null)
  const [arquivo, setArquivo] = useState(null)
  const [nome, setNome] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')

  async function enviar() {
    if (!arquivo) return
    setEnviando(true)
    setErro('')
    try {
      await onCriar({ nome, arquivo })
      setArquivo(null)
      setNome('')
      if (inputRef.current) inputRef.current.value = ''
    } catch (err) {
      setErro(err.message || 'Não foi possível enviar a imagem.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section className="space-y-2">
      <h2 className="text-ink-dim text-xs font-semibold uppercase tracking-wider">Nova cena</h2>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={e => setArquivo(e.target.files?.[0] || null)}
        className="block w-full text-sm text-ink-dim file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-accent-700 file:text-ink hover:file:bg-accent-600"
      />
      {arquivo && (
        <>
          <input className={INP} placeholder="Nome da cena (opcional)" value={nome} onChange={e => setNome(e.target.value)} />
          <button onClick={enviar} disabled={enviando} className={`${BTN} w-full bg-accent-600 hover:bg-accent-500 text-white`}>
            {enviando ? 'Enviando…' : 'Enviar mapa'}
          </button>
        </>
      )}
      <p className="text-ink-dim text-xs">A imagem é comprimida no navegador (até 4096 px, máx. 10 MB).</p>
      {erro && <p className="text-harm text-sm">{erro}</p>}
    </section>
  )
}

function ItemCena({ mapa, aberta, onVer, onAtivar, onRemover }) {
  const [confirmando, setConfirmando] = useState(false)
  const [erro, setErro] = useState('')

  const tentar = fn => async () => {
    setErro('')
    try { await fn() } catch (err) { setErro(err.message || 'Falhou.') }
  }

  return (
    <li className={`rounded-xl border p-2 ${aberta ? 'border-accent-500 bg-raised' : 'border-border bg-void'}`}>
      <div className="flex items-center gap-2">
        <button onClick={onVer} className="shrink-0" title="Abrir na tela">
          <img src={mapa.imagem_url} alt="" className="w-14 h-10 object-cover rounded-md bg-bg" />
        </button>
        <button onClick={onVer} className="flex-1 min-w-0 text-left">
          <p className="text-ink text-sm font-medium truncate">{mapa.nome}</p>
          <p className={`text-xs ${mapa.ativo ? 'text-ok' : 'text-ink-dim'}`}>{mapa.ativo ? '● Jogadores veem' : 'Só gestores veem'}</p>
        </button>
      </div>
      <div className="flex gap-1.5 mt-2">
        <button
          onClick={tentar(onAtivar)}
          className={`${BTN} flex-1 ${mapa.ativo ? 'bg-hover text-ink hover:bg-border' : 'bg-accent-700 text-white hover:bg-accent-600'}`}
        >
          {mapa.ativo ? 'Esconder dos jogadores' : 'Mostrar aos jogadores'}
        </button>
        {confirmando ? (
          <>
            <button onClick={tentar(onRemover)} className={`${BTN} bg-red-700 hover:bg-red-600 text-white`}>Apagar</button>
            <button onClick={() => setConfirmando(false)} className={`${BTN} bg-hover text-ink`}>✕</button>
          </>
        ) : (
          <button onClick={() => setConfirmando(true)} className={`${BTN} bg-hover text-ink-dim hover:text-harm`} title="Apagar cena">🗑</button>
        )}
      </div>
      {confirmando && <p className="text-ink-dim text-xs mt-1.5">Apaga a cena e tudo que estiver nela (tokens, desenhos).</p>}
      {erro && <p className="text-harm text-xs mt-1.5">{erro}</p>}
    </li>
  )
}

function EditorCena({ cena, onAtualizar, onRascunhoGrade }) {
  const salva = normalizarGrade(cena.grade)
  const [nome, setNome] = useState(cena.nome)
  const [grade, setGrade] = useState(salva)
  const [quadrados, setQuadrados] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const alterada = JSON.stringify(grade) !== JSON.stringify(salva)

  function mudar(campo, valor) {
    const nova = { ...grade, [campo]: valor }
    setGrade(nova)
    onRascunhoGrade(nova)
  }

  const num = campo => e => mudar(campo, e.target.value === '' ? 0 : Number(e.target.value))

  async function salvar() {
    setSalvando(true)
    setErro('')
    try {
      await onAtualizar({ grade })
      onRascunhoGrade(null)
    } catch (err) {
      setErro(err.message || 'Não foi possível salvar.')
    } finally {
      setSalvando(false)
    }
  }

  function descartar() {
    setGrade(salva)
    onRascunhoGrade(null)
  }

  async function renomear() {
    const n = nome.trim()
    if (!n || n === cena.nome) return
    try { await onAtualizar({ nome: n }) } catch (err) { setErro(err.message || 'Não foi possível renomear.') }
  }

  return (
    <section className="space-y-3">
      <h2 className="text-ink-dim text-xs font-semibold uppercase tracking-wider">Cena aberta</h2>
      <label className="block">
        <span className="text-ink-dim text-xs">Nome</span>
        <input className={INP} value={nome} onChange={e => setNome(e.target.value)} onBlur={renomear} />
      </label>
      <p className="text-ink-dim text-xs">Imagem: {cena.largura} × {cena.altura} px</p>

      <h3 className="text-ink text-sm font-semibold pt-2">Grade</h3>
      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" checked={grade.ativa} onChange={e => mudar('ativa', e.target.checked)} />
        Usar grade nesta cena
      </label>

      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-ink-dim text-xs">Tamanho do quadrado (px)</span>
          <input type="number" min="1" step="0.1" className={INP} value={grade.tamanho} onChange={num('tamanho')} />
        </label>
        <label className="block">
          <span className="text-ink-dim text-xs">Quadrados na largura</span>
          <div className="flex gap-1">
            <input type="number" min="1" className={INP} value={quadrados} onChange={e => setQuadrados(e.target.value)} placeholder="ex: 30" />
            <button
              onClick={() => Number(quadrados) > 0 && mudar('tamanho', Math.round((cena.largura / Number(quadrados)) * 100) / 100)}
              className={`${BTN} bg-hover text-ink hover:bg-border`}
              title="Calcula o tamanho do quadrado a partir da largura da imagem"
            >
              ok
            </button>
          </div>
        </label>
        <label className="block">
          <span className="text-ink-dim text-xs">Deslocar X (px)</span>
          <input type="number" step="0.5" className={INP} value={grade.offset_x} onChange={num('offset_x')} />
        </label>
        <label className="block">
          <span className="text-ink-dim text-xs">Deslocar Y (px)</span>
          <input type="number" step="0.5" className={INP} value={grade.offset_y} onChange={num('offset_y')} />
        </label>
        <label className="block">
          <span className="text-ink-dim text-xs">Cor</span>
          <input type="color" className="w-full h-8 bg-void border border-border rounded-lg" value={grade.cor} onChange={e => mudar('cor', e.target.value)} />
        </label>
        <label className="block">
          <span className="text-ink-dim text-xs">Opacidade</span>
          <input type="range" min="0.05" max="1" step="0.05" className="w-full" value={grade.opacidade} onChange={num('opacidade')} />
        </label>
        <label className="block">
          <span className="text-ink-dim text-xs">Cada quadrado vale</span>
          <input type="number" min="0" step="0.5" className={INP} value={grade.unidade} onChange={num('unidade')} />
        </label>
        <label className="block">
          <span className="text-ink-dim text-xs">Unidade</span>
          <input className={INP} value={grade.unidade_nome} onChange={e => mudar('unidade_nome', e.target.value)} placeholder="m, ft, km…" />
        </label>
      </div>
      <label className="block">
        <span className="text-ink-dim text-xs">Contagem na diagonal (régua)</span>
        <select className={INP} value={grade.diagonal} onChange={e => mudar('diagonal', e.target.value)}>
          {DIAGONAIS.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
        </select>
      </label>

      {alterada && (
        <div className="flex gap-2">
          <button onClick={salvar} disabled={salvando} className={`${BTN} flex-1 bg-accent-600 hover:bg-accent-500 text-white`}>
            {salvando ? 'Salvando…' : 'Salvar grade'}
          </button>
          <button onClick={descartar} className={`${BTN} bg-hover text-ink hover:bg-border`}>Descartar</button>
        </div>
      )}
      {erro && <p className="text-harm text-sm">{erro}</p>}
    </section>
  )
}
