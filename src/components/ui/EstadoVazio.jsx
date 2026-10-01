import Ilustra from '../arte/Ilustra'

/**
 * Fase 52 — "não tem nada aqui ainda", sempre do mesmo jeito: desenho, título,
 * uma frase que diz o próximo passo e as ações (children).
 *
 *   <EstadoVazio arte="pergaminho" titulo="Nenhuma ficha criada"
 *     descricao="Crie seu primeiro personagem para começar a aventura.">
 *     <Botao variante="primario">Criar ficha</Botao>
 *   </EstadoVazio>
 */
export default function EstadoVazio({ arte = 'pergaminho', titulo, descricao, children, compacto = false, className = '' }) {
  return (
    <div className={`estado-vazio text-center rounded-2xl border border-dashed border-border ${compacto ? 'px-4 py-8' : 'px-6 py-14'} ${className}`}>
      <div className="estado-vazio-arte mx-auto mb-4 w-fit">
        <Ilustra nome={arte} tamanho={compacto ? 48 : 72} />
      </div>
      {titulo && <p className="text-ink text-base font-semibold">{titulo}</p>}
      {descricao && <p className="text-ink-dim text-sm mt-1 max-w-md mx-auto">{descricao}</p>}
      {children && <div className="flex flex-wrap gap-2 justify-center mt-5">{children}</div>}
    </div>
  )
}
