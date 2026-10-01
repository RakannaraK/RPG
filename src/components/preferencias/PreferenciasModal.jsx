import { useState, useEffect } from 'react'
import Dice3D from '../dados/Dice3D'
import { bandejaSuportada } from '../dados/BandejaDados'
import { listarSkins } from '../../lib/diceSkins'
import { tocarSomDado } from '../../lib/diceSounds'
import { usePreferencias } from '../../context/PreferenciasContext'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { ANIMACOES, EFEITOS, FONTES, TAMANHOS_TEXTO, TEMAS } from '../../lib/personalizacao'
import { EnvioDeSom, Escolha } from './Aparencia'
import { perfilMudou } from '../../hooks/usePerfil'
import { useToast } from '../ui/Toast'
import Botao from '../ui/Botao'
import Modal from '../ui/Modal'
import Abas from '../ui/Abas'
import Icone from '../ui/Icone'

const SKINS = listarSkins()

const CATEGORIAS = [
  { id: 'geral', rotulo: 'Geral', icone: 'usuario' },
  { id: 'aparencia', rotulo: 'Aparência', icone: 'magia' },
  { id: 'dados', rotulo: 'Dados', icone: 'dado' },
  { id: 'audio', rotulo: 'Áudio', icone: 'volume' },
  { id: 'acessibilidade', rotulo: 'Acessibilidade', icone: 'olho' },
]

/** Título + explicação de um bloco de preferência. */
function Bloco({ titulo, dica, children }) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-ink font-semibold">{titulo}</h3>
        {dica && <p className="text-ink-dim text-sm mt-0.5">{dica}</p>}
      </div>
      {children}
    </section>
  )
}

/** Interruptor com rótulo (checkbox com cara de chave). */
function Chave({ rotulo, dica, ligado, onMudar }) {
  return (
    <label className="flex items-center justify-between gap-4 cursor-pointer rounded-xl border border-border bg-void/40 px-4 py-3 hover:border-accent-700 transition-colors duration-rapida">
      <span>
        <span className="block text-sm text-ink font-medium">{rotulo}</span>
        {dica && <span className="block text-sm text-ink-dim">{dica}</span>}
      </span>
      <input type="checkbox" role="switch" checked={ligado} onChange={e => onMudar(e.target.checked)} className="chave shrink-0" />
    </label>
  )
}

function Volume({ rotulo, valor, desligado, onMudar }) {
  return (
    <label className={`block ${desligado ? 'opacity-50' : ''}`}>
      <span className="flex items-center justify-between mb-1">
        <span className="text-sm text-ink">{rotulo}</span>
        <span className="text-ink-dim text-sm tabular-nums">{Math.round(valor * 100)}%</span>
      </span>
      <input type="range" min={0} max={1} step={0.05} value={valor} disabled={desligado} onChange={e => onMudar(Number(e.target.value))} className="w-full accent-purple-500" />
    </label>
  )
}

/**
 * Preferências (F52): antes era um modal longo com tudo empilhado. Agora são
 * cinco categorias — lista lateral no computador, abas no celular. Tudo vale
 * só para quem escolheu e é salvo na hora.
 */
export default function PreferenciasModal({ onFechar }) {
  const { preferencias, salvarPreferencias } = usePreferencias()
  const { dado_skin, som_ativo, som_volume, som_acao_ativo, som_acao_volume } = preferencias
  const { session } = useAuth()
  const toast = useToast()
  const [cat, setCat] = useState('geral')
  const [girando, setGirando] = useState(null) // skin que acabou de ser escolhida (prévia rolando)

  // Nome de exibição (apelido global) — o que outras pessoas veem no lugar do e-mail.
  const [apelido, setApelido] = useState('')
  const [apelidoErro, setApelidoErro] = useState('')
  const [salvandoApelido, setSalvandoApelido] = useState(false)

  useEffect(() => {
    const uid = session?.user?.id
    if (!uid) return
    supabase.from('profiles').select('username').eq('id', uid).single()
      .then(({ data }) => { if (data?.username) setApelido(data.username) })
  }, [session?.user?.id])

  async function salvarApelido(e) {
    e?.preventDefault()
    const uid = session?.user?.id
    const v = apelido.trim()
    setApelidoErro('')
    if (!uid) return
    if (!v) { setApelidoErro('O nome não pode ficar vazio.'); return }
    setSalvandoApelido(true)
    const { error } = await supabase.from('profiles').update({ username: v }).eq('id', uid)
    setSalvandoApelido(false)
    if (error) { setApelidoErro(error.message || 'Erro ao salvar.'); return }
    setApelido(v)
    perfilMudou(uid, { username: v }) // o cabeçalho atualiza na hora
    toast.ok('Nome atualizado')
  }

  function escolherSkin(id) {
    salvarPreferencias({ dado_skin: id })
    setGirando(id)
    setTimeout(() => setGirando(g => (g === id ? null : g)), 900)
    // Toca um preview da skin escolhida (respeita som on/off e volume)
    tocarSomDado(id, { ativo: som_ativo, volume: som_volume, numDados: 3 })
  }

  const tema = preferencias.tema || 'violeta'

  const conteudo = {
    geral: (
      <Bloco titulo="Nome de exibição" dica="É o que as outras pessoas veem no lugar do seu e-mail. Dá para trocar quando quiser.">
        <form onSubmit={salvarApelido} className="flex flex-wrap gap-2">
          <input
            type="text" value={apelido} onChange={e => setApelido(e.target.value)} maxLength={40}
            placeholder="Seu apelido" aria-label="Nome de exibição" className="campo flex-1 min-w-[12rem]"
          />
          <Botao type="submit" variante="primario" disabled={salvandoApelido}>{salvandoApelido ? 'Salvando…' : 'Salvar'}</Botao>
        </form>
        {apelidoErro && <p className="aviso-erro" role="alert">{apelidoErro}</p>}
      </Bloco>
    ),

    aparencia: (
      <div className="space-y-8">
        <Bloco titulo="Tema" dica="Muda a energia do site inteiro: cor, luz e as partículas do fundo.">
          <div className="grid gap-2.5 sm:grid-cols-2" role="radiogroup" aria-label="Tema">
            {TEMAS.map(t => {
              const ativo = tema === t.id
              return (
                <button
                  key={t.id} type="button" role="radio" aria-checked={ativo}
                  onClick={() => salvarPreferencias({ tema: t.id })}
                  className={`cartao relative flex items-center gap-3 rounded-xl border p-3 text-left ${ativo ? 'selecionado' : 'border-border bg-void/40'}`}
                >
                  <span
                    className="w-12 h-12 rounded-lg shrink-0 ring-1 ring-white/10"
                    style={{ background: `radial-gradient(circle at 30% 30%, ${t.cores[0]}, ${t.amostra} 55%, #0B0812)`, boxShadow: `0 0 18px -4px ${t.amostra}` }}
                    aria-hidden="true"
                  />
                  <span className="min-w-0">
                    <span className="block text-ink font-semibold text-sm">{t.nome}{t.id === 'violeta' ? ' (padrão)' : ''}</span>
                    <span className="block text-ink-dim text-xs mt-0.5">{t.energia}</span>
                  </span>
                  {ativo && <Icone nome="check" tamanho={18} className="ml-auto text-accent-300" />}
                </button>
              )
            })}
          </div>
        </Bloco>

        <Bloco titulo="Efeitos visuais" dica="Partículas e luz ambiente. Nada disso atrapalha a leitura nem os cliques.">
          <Escolha campo="efeitos" opcoes={EFEITOS} rotuloOculto="Efeitos visuais" />
        </Bloco>

        <Bloco titulo="Fonte">
          <select value={preferencias.fonte || 'padrao'} onChange={e => salvarPreferencias({ fonte: e.target.value })} className="campo w-full sm:w-72" aria-label="Fonte">
            {FONTES.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
          </select>
        </Bloco>
      </div>
    ),

    dados: (
      <div className="space-y-8">
        <Bloco titulo="Skin do dado" dica="Clique para escolher; o dado rola e você ouve o som dele.">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5" role="radiogroup" aria-label="Skin do dado">
            {SKINS.map(s => {
              const ativa = dado_skin === s.id
              return (
                <div key={s.id} className="relative">
                  <button
                    type="button" role="radio" aria-checked={ativa} onClick={() => escolherSkin(s.id)}
                    className={`cartao w-full flex flex-col items-center gap-2 p-3 rounded-xl border ${ativa ? 'selecionado' : 'border-border bg-void/40'}`}
                  >
                    {ativa && <Icone nome="check" tamanho={16} className="absolute top-2 left-2 text-accent-300" />}
                    <Dice3D lados={20} resultado={20} rolando={girando === s.id} skin={s.id} />
                    <span className={`text-sm font-semibold ${ativa ? 'text-ink' : 'text-ink-dim'}`}>{s.nome}</span>
                  </button>
                  <button
                    type="button" onClick={() => tocarSomDado(s.id, { ativo: som_ativo, volume: som_volume, numDados: 3 })}
                    aria-label={`Ouvir ${s.nome}`} data-dica="Ouvir"
                    className="botao-icone !min-w-[32px] !min-h-[32px] absolute top-1 right-1"
                  ><Icone nome="volume" tamanho={16} /></button>
                </div>
              )
            })}
          </div>
        </Bloco>

        {/* F27 — bandeja: dados 3D com física caindo por cima da tela */}
        <Bloco titulo="Dados na mesa" dica="Os dados 3D que caem por cima da tela quando alguém rola.">
          <Escolha
            campo="dados_mesa" rotuloOculto="Dados na mesa"
            opcoes={[
              { id: 'todos', nome: 'De todos', dica: 'As rolagens de qualquer pessoa da mesa caem na sua tela.' },
              { id: 'meus', nome: 'Só os meus', dica: 'Só as suas rolagens caem na tela.' },
              { id: 'nenhum', nome: 'Desligado', dica: 'Nenhum dado cai na tela (os resultados continuam no feed).' },
            ]}
          />
          {!bandejaSuportada && (
            <p className="text-sm text-warn">Neste aparelho a bandeja fica desligada (sem WebGL ou com "reduzir movimento" ativo).</p>
          )}
        </Bloco>

        <Bloco titulo="Som de dado próprio">
          <EnvioDeSom
            campo="som_dado_url" campoVolume="som_volume" pasta="dado"
            titulo="Arquivo de som"
            dica="Toca no lugar do som sintetizado, em todas as skins. Curto (menos de 1 s) fica melhor."
            rodape="Você ouve o seu som em toda rolagem; os outros ouvem o deles."
          />
        </Bloco>
      </div>
    ),

    audio: (
      <div className="space-y-8">
        <Bloco titulo="Rolagens">
          <Chave rotulo="Som das rolagens" dica="O barulho do dado quando alguém rola." ligado={som_ativo} onMudar={v => salvarPreferencias({ som_ativo: v })} />
          <Volume rotulo="Volume das rolagens" valor={som_volume} desligado={!som_ativo} onMudar={v => salvarPreferencias({ som_volume: v })} />
        </Bloco>
        {/* FV.4c — sons de ação (combate), independentes do som de dado */}
        <Bloco titulo="Ações e efeitos">
          <Chave rotulo="Sons de ação" dica="Golpes, magias e os efeitos que o mestre dispara." ligado={som_acao_ativo} onMudar={v => salvarPreferencias({ som_acao_ativo: v })} />
          <Volume rotulo="Volume das ações" valor={som_acao_volume} desligado={!som_acao_ativo} onMudar={v => salvarPreferencias({ som_acao_volume: v })} />
        </Bloco>
        <Bloco titulo="Som de crítico próprio">
          <EnvioDeSom
            campo="som_critico_url" campoVolume="som_acao_volume" pasta="critico"
            titulo="Arquivo de som"
            rodape="Toca no lugar do som padrão quando sai um crítico."
          />
        </Bloco>
      </div>
    ),

    acessibilidade: (
      <div className="space-y-8">
        <Bloco titulo="Animações" dica="Transições de tela, de abas e de janelas.">
          <Escolha campo="animacoes" opcoes={ANIMACOES} rotuloOculto="Animações" />
          {typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches && (
            <p className="text-sm text-ink-dim flex items-center gap-1.5"><Icone nome="info" tamanho={14} /> O seu sistema pede menos movimento, então as animações já ficam reduzidas.</p>
          )}
        </Bloco>
        <Bloco titulo="Tamanho do texto" dica="Aumenta o site inteiro: texto, botões e espaços.">
          <Escolha campo="tamanho_texto" opcoes={TAMANHOS_TEXTO} rotuloOculto="Tamanho do texto" />
        </Bloco>
        <Bloco titulo="Contraste">
          <Chave rotulo="Alto contraste" dica="Texto secundário e bordas mais fortes, sem textura." ligado={preferencias.alto_contraste === true} onMudar={v => salvarPreferencias({ alto_contraste: v })} />
        </Bloco>
      </div>
    ),
  }

  return (
    <Modal
      onFechar={onFechar} tamanho="xl" titulo="Preferências" subtitulo="Vale só para você e é salvo na hora."
      corpoClassName="!p-0"
      rodape={<Botao variante="primario" onClick={onFechar}>Concluído</Botao>}
    >
      <div className="md:grid md:grid-cols-[13rem_minmax(0,1fr)] md:min-h-[26rem]">
        {/* celular: abas no topo */}
        <div className="md:hidden px-3 pt-2 sticky top-0 z-10 bg-raised">
          <Abas rotulo="Categorias" tamanho="sm" abas={CATEGORIAS.map(c => ({ id: c.id, rotulo: c.rotulo }))} atual={cat} onTrocar={setCat} />
        </div>
        {/* computador: lista lateral */}
        <nav className="hidden md:block border-r border-border/70 p-3 space-y-1" aria-label="Categorias">
          {CATEGORIAS.map(c => (
            <button
              key={c.id} type="button" onClick={() => setCat(c.id)} aria-current={cat === c.id || undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-colors duration-rapida ${
                cat === c.id ? 'bg-accent-800/30 text-ink font-semibold shadow-[inset_3px_0_0_var(--accent-400)]' : 'text-ink-dim hover:text-ink hover:bg-hover/70'
              }`}
            ><Icone nome={c.icone} tamanho={18} />{c.rotulo}</button>
          ))}
        </nav>
        <div key={cat} className="entra-aba p-5 sm:p-6">{conteudo[cat]}</div>
      </div>
    </Modal>
  )
}
