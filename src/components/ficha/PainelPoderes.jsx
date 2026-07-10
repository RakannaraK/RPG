import { useState, useMemo } from 'react'
import {
  podeUsarPoder, descreverCusto, descreverEscala, cdDoPoder,
  circuloBaseDoPoder, custoDeSlot, montarNotacaoUso,
  filtrarPoderes, opcoesDeFiltro, ordenarPoderes,
} from '../../lib/poderes'
import { atendeNivelMinimo } from '../../lib/requisitos'

const INP = 'px-2 py-1 rounded-lg bg-purple-950 border border-purple-700 text-white text-xs placeholder-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-500'

/** Uma carta de poder: custo, CD, escala e o botão de usar. */
function CartaPoder({
  linha, poder, estado, cdSistema, usaPreparacao, isDono,
  onUsar, onEsquecer, onPreparar, onCurar,
}) {
  const [escolhendo, setEscolhendo] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)

  const check = podeUsarPoder(poder, estado)
  const cd = cdDoPoder(poder, cdSistema, estado.contexto)
  const temSlot = !!custoDeSlot(poder.custo)
  const base = circuloBaseDoPoder(poder)
  const naoPreparado = usaPreparacao && !linha.preparado

  const bloqueio = naoPreparado ? 'Poder não preparado.' : (check.ok ? null : check.motivo)

  async function usar(circulo) {
    setErro('')
    setEscolhendo(false)
    setOcupado(true)
    try {
      const r = await onUsar(poder, circulo)
      setResultado(r || null)
    } catch (e) {
      setErro(e.message || 'Não foi possível usar o poder.')
    } finally {
      setOcupado(false)
    }
  }

  function iniciar() {
    if (bloqueio) { setErro(bloqueio); return }
    // Um só círculo possível (ou nenhum slot) → usa direto
    if (!temSlot) return usar(0)
    if (check.circulos.length === 1) return usar(check.circulos[0])
    setEscolhendo(true)
  }

  return (
    <div className={`bg-purple-950/40 border rounded-xl px-3 py-2 space-y-1.5 ${
      naoPreparado ? 'border-purple-900/60 opacity-60' : 'border-purple-800'
    }`}>
      <div className="flex items-start gap-2">
        <span className="text-amber-400 text-[11px] font-mono shrink-0 mt-0.5 w-7">
          {poder.circulo != null ? `${poder.circulo}º` : '—'}
        </span>

        <span className="min-w-0 flex-1">
          <span className="text-white text-sm font-medium">{poder.nome}</span>
          {poder.acao && <span className="text-purple-500 text-[11px] ml-1.5">{poder.acao}</span>}
          {cd != null && (
            <span className="text-sky-400 text-[11px] ml-1.5 font-mono" title="Classe de Dificuldade">CD {cd}</span>
          )}
          <span className="block text-purple-500 text-[11px]">
            {descreverCusto(poder.custo, estado.poolsPorId)}
            {poder.efeito_notacao && (
              <span className="font-mono text-purple-400"> · {poder.efeito_notacao}
                {poder.efeito_tipo ? ` (${poder.efeito_tipo})` : ''}
              </span>
            )}
          </span>
          {descreverEscala(poder.escala_circulo) && (
            <span className="block text-purple-600 text-[11px]">↗ {descreverEscala(poder.escala_circulo)}</span>
          )}
          {poder.descricao && <span className="block text-purple-600 text-[11px] mt-0.5">{poder.descricao}</span>}
        </span>

        {isDono && (
          <span className="flex items-center gap-1.5 shrink-0">
            {usaPreparacao && (
              <label className="text-purple-400 text-[11px] flex items-center gap-1 cursor-pointer" title="Preparado">
                <input type="checkbox" checked={!!linha.preparado}
                  onChange={e => onPreparar(linha.id, e.target.checked).catch(x => setErro(x.message))}
                  className="accent-purple-500" />
                prep
              </label>
            )}
            <button
              onClick={iniciar}
              disabled={ocupado || !!bloqueio}
              title={bloqueio || 'Usar o poder'}
              className="px-2.5 py-1 text-xs font-medium rounded-lg bg-purple-700 hover:bg-purple-600 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Usar
            </button>
            {linha.origem === 'manual' && (
              <button onClick={() => onEsquecer(linha.id).catch(x => setErro(x.message))}
                className="w-5 h-5 flex items-center justify-center text-purple-600 hover:text-red-400 transition-colors"
                title="Esquecer poder">×</button>
            )}
          </span>
        )}
      </div>

      {bloqueio && isDono && <p className="text-purple-700 text-[11px]">⚠ {bloqueio}</p>}

      {/* Escolha do círculo */}
      {escolhendo && (
        <div className="border-t border-purple-900/60 pt-1.5 flex flex-wrap items-center gap-1.5">
          <span className="text-purple-400 text-[11px]">Em qual círculo?</span>
          {check.circulos.map(c => (
            <button key={c} onClick={() => usar(c)} disabled={ocupado}
              className="px-2 py-0.5 text-xs rounded-lg bg-purple-950 border border-purple-700 text-white hover:border-amber-500 hover:text-amber-300 transition-colors disabled:opacity-50"
              title={c > base ? `Elevado: ${montarNotacaoUso(poder, c)}` : undefined}>
              {c}º{c > base && <span className="text-amber-500"> ↑</span>}
            </button>
          ))}
          <button onClick={() => setEscolhendo(false)} className="text-purple-500 hover:text-white text-[11px] ml-1">
            cancelar
          </button>
        </div>
      )}

      {/* Resultado */}
      {resultado && (
        <div className="border-t border-purple-900/60 pt-1.5 flex items-center gap-2 flex-wrap">
          <span className="text-sky-300 text-sm font-semibold">
            {resultado.notacao} = {resultado.total}
          </span>
          {resultado.tipo === 'cura' && onCurar && (
            <button onClick={() => { onCurar(resultado.total); setResultado(null) }}
              className="px-2 py-0.5 text-[11px] font-medium rounded-lg bg-green-700 hover:bg-green-600 text-white transition-colors">
              Aplicar à vida
            </button>
          )}
          <button onClick={() => setResultado(null)} className="text-purple-500 hover:text-white text-xs ml-auto">✕</button>
        </div>
      )}

      {erro && <p className="text-red-400 text-[11px]">{erro}</p>}
    </div>
  )
}

/** Adicionar um poder do catálogo, respeitando classe e nível mínimo. */
function AdicionarPoder({ catalogo, jaTem, estado, classesIds, onAprender }) {
  const [aberto, setAberto] = useState(false)
  const [busca, setBusca] = useState('')
  const [erro, setErro] = useState('')

  const elegiveis = useMemo(() => {
    const base = catalogo.filter(p => {
      if (jaTem.has(p.id)) return false
      if (p.classe_id && !classesIds.has(p.classe_id)) return false // poder de outra classe
      return atendeNivelMinimo(p, estado.contexto)
    })
    return ordenarPoderes(filtrarPoderes(base, { busca }))
  }, [catalogo, jaTem, classesIds, estado.contexto, busca])

  if (!aberto) {
    return (
      <button onClick={() => setAberto(true)}
        className="text-xs px-3 py-1.5 rounded-lg border border-dashed border-purple-700 text-purple-300 hover:text-white hover:border-purple-500 transition-colors">
        + Aprender poder
      </button>
    )
  }

  return (
    <div className="border-t border-purple-900 pt-2 space-y-1.5">
      <div className="flex gap-2 items-center">
        <input type="text" value={busca} onChange={e => setBusca(e.target.value)} autoFocus
          placeholder="Buscar no catálogo" className={`${INP} flex-1`} />
        <button onClick={() => { setAberto(false); setBusca('') }}
          className="text-purple-500 hover:text-white text-xs">fechar</button>
      </div>
      <div className="max-h-48 overflow-y-auto space-y-1">
        {elegiveis.map(p => (
          <button
            key={p.id}
            onClick={() => onAprender(p.id).catch(e => setErro(e.message))}
            className="w-full flex items-center gap-2 text-left bg-purple-950/40 border border-purple-800 rounded-lg px-2 py-1 hover:border-purple-600 transition-colors"
          >
            <span className="text-amber-400 text-[11px] font-mono w-7 shrink-0">
              {p.circulo != null ? `${p.circulo}º` : '—'}
            </span>
            <span className="text-white text-xs flex-1 truncate">{p.nome}</span>
            <span className="text-purple-600 text-[11px] shrink-0">{descreverCusto(p.custo, estado.poolsPorId)}</span>
          </button>
        ))}
        {elegiveis.length === 0 && (
          <p className="text-purple-600 text-[11px]">Nenhum poder elegível — confira classe e nível mínimo.</p>
        )}
      </div>
      {erro && <p className="text-red-400 text-[11px]">{erro}</p>}
    </div>
  )
}

/**
 * Fase 20.4 — painel de poderes da ficha. Adaptativo: some se o sistema não tem
 * poderes. Custos são debitados ANTES do efeito; sem custo pagável, o botão
 * "Usar" fica desabilitado com o motivo.
 */
export default function PainelPoderes({
  rotulo = 'Poderes',
  catalogo = [],
  poderesFicha = [],
  estado,             // { totaisSlots, usadosSlots, atualDoPool, poolsPorId, contexto }
  cdSistema = null,
  usaPreparacao = false,
  classesIds = new Set(),
  isDono,
  onUsar, onAprender, onEsquecer, onPreparar, onCurar,
}) {
  const [filtroCirculo, setFiltroCirculo] = useState('')

  const jaTem = useMemo(() => new Set(poderesFicha.map(l => l.poder_id)), [poderesFicha])
  const opcoes = useMemo(() => opcoesDeFiltro(poderesFicha.map(l => l.poder)), [poderesFicha])

  const visiveis = useMemo(() => {
    const lista = filtroCirculo === ''
      ? poderesFicha
      : poderesFicha.filter(l =>
          Number(filtroCirculo) === -1 ? l.poder.circulo == null : Number(l.poder.circulo) === Number(filtroCirculo)
        )
    return [...lista].sort((a, b) => {
      const ca = a.poder.circulo ?? -1
      const cb = b.poder.circulo ?? -1
      return ca !== cb ? ca - cb : (a.poder.nome || '').localeCompare(b.poder.nome || '')
    })
  }, [poderesFicha, filtroCirculo])

  if (catalogo.length === 0) return null

  const preparados = poderesFicha.filter(l => l.preparado).length

  return (
    <div className="bg-slate-800 border border-purple-800 rounded-2xl p-4 space-y-2.5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-purple-200 text-sm font-semibold">{rotulo}</p>
        <div className="flex items-center gap-2">
          {usaPreparacao && (
            <span className="text-purple-600 text-[11px]">{preparados} preparado(s)</span>
          )}
          {opcoes.circulos.length > 0 && (
            <select value={filtroCirculo} onChange={e => setFiltroCirculo(e.target.value)} className={INP}>
              <option value="">Todo círculo</option>
              <option value={-1}>Sem círculo</option>
              {opcoes.circulos.map(c => <option key={c} value={c}>{c}º</option>)}
            </select>
          )}
        </div>
      </div>

      {usaPreparacao && isDono && (
        <p className="text-purple-600 text-[11px]">
          Trocar preparados é livre aqui — a convenção de "só em descanso" fica com a mesa.
        </p>
      )}

      <div className="space-y-1.5">
        {visiveis.map(linha => (
          <CartaPoder
            key={linha.id}
            linha={linha}
            poder={linha.poder}
            estado={estado}
            cdSistema={cdSistema}
            usaPreparacao={usaPreparacao}
            isDono={isDono}
            onUsar={onUsar}
            onEsquecer={onEsquecer}
            onPreparar={onPreparar}
            onCurar={onCurar}
          />
        ))}
        {visiveis.length === 0 && (
          <p className="text-purple-600 text-xs">
            {poderesFicha.length === 0 ? 'Nenhum poder ainda.' : 'Nenhum poder nesse círculo.'}
          </p>
        )}
      </div>

      {isDono && (
        <AdicionarPoder
          catalogo={catalogo}
          jaTem={jaTem}
          estado={estado}
          classesIds={classesIds}
          onAprender={onAprender}
        />
      )}
    </div>
  )
}
