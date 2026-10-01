import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Marca from '../marca/Marca'
import Sininho from '../notificacoes/Sininho'
import MenuUsuario from './MenuUsuario'
import Icone from './Icone'

/**
 * Fase 52 — cabeçalho único do site. Antes cada página desenhava o seu (6
 * versões), com ícones soltos sem texto. Agora:
 *
 *   [←] [selo Dado & Pena] / Título da página        [ações da página] [Comunidade] [🔔] [avatar ▾]
 *
 * Fica grudado no topo com vidro leve; NÃO anima na troca de página
 * (`data-cabecalho`, ver theme/motion.css) — só o conteúdo muda.
 * Os painéis do sino e do menu se ancoram aqui (`relative`).
 */
export default function BarraTopo({ voltar, titulo, subtitulo, acoes, largura = 'max-w-6xl', comunidade = true, children }) {
  const { session } = useAuth()
  const navigate = useNavigate()

  return (
    <header data-cabecalho className="sticky top-0 z-cabecalho border-b border-border/60 bg-bg/75 backdrop-blur-md print:hidden">
      <div className={`relative ${largura} mx-auto px-3 sm:px-6 h-16 flex items-center gap-2 sm:gap-3`}>
        {voltar && (
          <button
            onClick={() => navigate(voltar.para, voltar.state ? { state: voltar.state } : undefined)}
            aria-label={voltar.rotulo} data-dica={voltar.rotulo} data-dica-lado="dir"
            className="botao-icone -ml-1 shrink-0"
          ><Icone nome="seta-esq" tamanho={20} /></button>
        )}
        <Link to={session ? '/dashboard' : '/'} aria-label="Dado & Pena — início" className="shrink-0 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-400">
          <Marca tamanho="sm" compacta={!!(titulo || voltar || acoes)} />
        </Link>
        {titulo && (
          <div className="min-w-0 flex-1 flex items-center gap-2 sm:gap-3">
            <span aria-hidden="true" className="hidden sm:block h-6 w-px bg-border shrink-0" />
            <div className="min-w-0">
              <h1 className="text-ink font-semibold leading-tight truncate">{titulo}</h1>
              {subtitulo && <p className="text-ink-dim text-xs truncate">{subtitulo}</p>}
            </div>
          </div>
        )}
        {children}
        <div className="ml-auto flex items-center gap-0.5 sm:gap-1.5 shrink-0">
          {acoes}
          {comunidade && (
            <Link
              to="/comunidade" aria-label="Comunidade" data-dica="Fichas, criaturas e sistemas compartilhados"
              className={`botao-icone lg:px-3 lg:gap-2 ${session ? 'max-sm:hidden' : ''}`}
            ><Icone nome="globo" tamanho={20} /><span className="hidden lg:inline text-sm">Comunidade</span></Link>
          )}
          {session ? (
            <>
              <Sininho />
              <MenuUsuario />
            </>
          ) : (
            <Link to="/" className="botao botao-primario ml-1 inline-flex items-center px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-sobre-acento text-sm font-medium">Entrar</Link>
          )}
        </div>
      </div>
    </header>
  )
}
