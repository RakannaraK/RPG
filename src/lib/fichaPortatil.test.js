import { describe, it, expect } from 'vitest'
import { exportarFicha, planejarImportacao, nomeArquivoFicha, FORMATO_FICHA } from './fichaPortatil'

// Sistema de origem: ids "antigos"
const origem = {
  sistema: { nome: 'Krad', config_layout: { estados: [{ id: 'e1', nome: 'Fome' }], trilhas: [{ id: 't1', nome: 'Vitalidade' }], campos_combate: [{ id: 'c1', rotulo: 'Defesa' }] } },
  atributos: [{ id: 'a1', nome: 'Força' }, { id: 'a2', nome: 'Mente' }],
  pericias: [{ id: 'p1', nome: 'Furtividade' }],
  racas: [{ id: 'r1', nome: 'Elfo', modificadores: [{ id: 'm1', alvo: 'a1', descricao: 'Ouvido fino' }] }],
  classes: [{ id: 'cl1', nome: 'Mago', modificadores: [] }],
  habilidades: [{ id: 'h1', nome: 'Bola de Fogo', modificadores: [] }],
  poderes: [{ id: 'po1', nome: 'Míssil' }],
  linhas_poder: [{ id: 'l1', nome: 'Fogo' }],
  pools: [{ id: 'pl1', nome: 'Mana' }],
  categorias_item: [{ id: 'ci1', nome: 'Armas' }],
  recompensas_nivel: [{ id: 'rc1', classe_id: 'cl1', nivel: 3, titulo: 'Talento' }],
}
// Destino: MESMO sistema, ids diferentes (como depois de importar o sistema noutra mesa)
const destino = {
  ...origem,
  sistema: { nome: 'Krad', config_layout: origem.sistema.config_layout },
  atributos: [{ id: 'A1', nome: 'força' }, { id: 'A2', nome: 'Mente' }],
  pericias: [{ id: 'P1', nome: 'Furtividade' }],
  racas: [{ id: 'R1', nome: 'Elfo', modificadores: [{ id: 'M1', alvo: 'A1', descricao: 'Ouvido fino' }] }],
  classes: [{ id: 'CL1', nome: 'Mago', modificadores: [] }],
  habilidades: [{ id: 'H1', nome: 'Bola de Fogo', modificadores: [] }],
  poderes: [{ id: 'PO1', nome: 'Míssil' }],
  linhas_poder: [{ id: 'L1', nome: 'Fogo' }],
  pools: [{ id: 'PL1', nome: 'Mana' }],
  categorias_item: [{ id: 'CI1', nome: 'Armas' }],
  recompensas_nivel: [{ id: 'RC1', classe_id: 'CL1', nivel: 3, titulo: 'Talento' }],
}

const ficha = {
  id: 'f1', mesa_id: 'mesa', dono_id: 'dono', sistema_id: 's1', nome_personagem: 'Aria',
  raca: 'Elfo', classe: 'Mago', nivel: 3, hp_atual: 7, hp_maximo: 12, notas: 'segredo',
  raca_id: 'r1', classe_id: 'cl1', xp: 120, carteira: { ouro: 3 }, privada: true, editores: ['x'], pasta: 'Heróis',
}
const filhos = {
  valores_atributos: [{ id: 'v1', ficha_id: 'f1', atributo_id: 'a1', valor: 4 }, { id: 'v2', ficha_id: 'f1', atributo_id: 'a2', valor: 2 }],
  pericias_ficha: [{ ficha_id: 'f1', pericia_id: 'p1', proficiente: true, bonus: 1 }],
  classes_ficha: [{ ficha_id: 'f1', classe_id: 'cl1', nivel: 3, ordem: 0 }],
  habilidades_ficha: [{ ficha_id: 'f1', habilidade_id: 'h1', ativa: true, recurso_atual: 2 }],
  poderes_ficha: [{ ficha_id: 'f1', poder_id: 'po1', conhecido: true, preparado: false }],
  linhas_ficha: [{ ficha_id: 'f1', linha_id: 'l1', rating: 2 }],
  pools_ficha: [{ ficha_id: 'f1', pool_id: 'pl1', atual: 5 }],
  recompensas_ficha: [{ ficha_id: 'f1', recompensa_id: 'rc1', concluida: true }],
  condicoes_manuais_ficha: [{ ficha_id: 'f1', modificador_id: 'm1', ativa: true }],
  estados_ficha: [{ ficha_id: 'f1', estado_id: 'e1', valor: 2 }],
  trilhas_ficha: [{ ficha_id: 'f1', trilha_id: 't1', marcas: [1, 0], tamanho_bonus: 1 }],
  valores_combate: [{ ficha_id: 'f1', campo_id: 'c1', valor: '15' }],
  itens_ficha: [{ id: 'i1', ficha_id: 'f1', nome: 'Adaga', categoria_id: 'ci1', ordem: 0 }, { id: 'i2', ficha_id: 'f1', nome: 'Corda', categoria_id: null, ordem: 1 }],
  maestrias_ficha: [{ ficha_id: 'f1', categoria_id: 'ci1', item_id: 'i1', xp: 30, nivel: 1 }],
  slots_ficha: [{ ficha_id: 'f1', circulo: 1, usados: 1 }],
  projetos_ficha: [{ ficha_id: 'f1', nome: 'Forjar', meta: 4, progresso: 1, concluido: false }],
  imagens_ficha: [{ ficha_id: 'f1', url: 'http://x/y.jpg', tipo: 'retrato', legenda: null }],
  pontos_status_ficha: [{ ficha_id: 'f1', disponiveis: 2 }],
}

let n = 0
const ids = () => `novo-${++n}`
const arquivo = exportarFicha({ ficha, filhos, sistema: origem })

describe('exportar', () => {
  it('marca o formato e o sistema de origem', () => {
    expect(arquivo).toMatchObject(FORMATO_FICHA)
    expect(arquivo.sistema.nome).toBe('Krad')
  })
  it('não leva dono, mesa, acesso nem pasta', () => {
    for (const c of ['id', 'mesa_id', 'dono_id', 'sistema_id', 'privada', 'editores', 'pasta']) {
      expect(arquivo.ficha[c]).toBeUndefined()
    }
    expect(arquivo.ficha.notas).toBe('segredo')
  })
  it('troca ids por nomes', () => {
    expect(arquivo.ficha.raca_ref).toBe('Elfo')
    expect(arquivo.filhos.valores_atributos).toEqual([{ atributo: 'Força', valor: 4 }, { atributo: 'Mente', valor: 2 }])
    expect(arquivo.filhos.estados_ficha[0].estado).toBe('Fome')
    expect(arquivo.filhos.valores_combate[0].campo).toBe('Defesa')
    expect(arquivo.filhos.recompensas_ficha[0].recompensa).toBe('Mago · nível 3 · Talento')
    expect(arquivo.filhos.condicoes_manuais_ficha[0].modificador).toContain('raça Elfo')
    expect(arquivo.filhos.itens_ficha[0]).toMatchObject({ nome: 'Adaga', categoria: 'Armas', _idx: 0 })
    expect(arquivo.filhos.maestrias_ficha[0]).toMatchObject({ categoria: 'Armas', item: 0, xp: 30 })
  })
})

describe('importar no mesmo sistema com ids diferentes', () => {
  const plano = planejarImportacao(arquivo, destino, ids)
  it('sem avisos e com os ids do destino', () => {
    expect(plano.avisos).toEqual([])
    expect(plano.ficha).toMatchObject({ nome_personagem: 'Aria', raca_id: 'R1', classe_id: 'CL1', hp_atual: 7, xp: 120 })
    expect(plano.filhos.valores_atributos.map(r => [r.atributo_id, r.valor])).toEqual([['A1', 4], ['A2', 2]])
    expect(plano.filhos.pericias_ficha[0]).toMatchObject({ pericia_id: 'P1', proficiente: true })
    expect(plano.filhos.condicoes_manuais_ficha[0].modificador_id).toBe('M1')
    expect(plano.filhos.recompensas_ficha[0].recompensa_id).toBe('RC1')
  })
  it('toda linha aponta para a ficha nova e a maestria acha o item novo', () => {
    const idItem = plano.filhos.itens_ficha[0].id
    expect(plano.filhos.maestrias_ficha[0]).toMatchObject({ item_id: idItem, categoria_id: 'CI1' })
    for (const linhas of Object.values(plano.filhos)) for (const l of linhas) expect(l.ficha_id).toBe(plano.fichaId)
  })
  it('o arquivo não escolhe dono, mesa nem privacidade', () => {
    expect(plano.ficha.dono_id).toBeUndefined()
    expect(plano.ficha.mesa_id).toBeUndefined()
    expect(plano.ficha.privada).toBeUndefined()
  })
})

describe('importar em sistema diferente', () => {
  const magro = { sistema: { nome: 'Outro', config_layout: { estados: [{ id: 'x', nome: 'Fome' }] } }, atributos: [{ id: 'z', nome: 'Força' }], classes: [], racas: [] }
  const plano = planejarImportacao(arquivo, magro, ids)
  it('entra o que casa e avisa o que falta', () => {
    expect(plano.filhos.valores_atributos).toEqual([expect.objectContaining({ atributo_id: 'z', valor: 4 })])
    expect(plano.filhos.pericias_ficha).toEqual([])
    expect(plano.filhos.estados_ficha[0].estado_id).toBe('x')
    expect(plano.avisos).toContain('Perícia “Furtividade” não existe neste sistema.')
    expect(plano.avisos).toContain('Raça “Elfo” não existe neste sistema (fica só o texto).')
    expect(plano.avisos.filter(a => a.includes('Mente'))).toHaveLength(1)
  })
  it('itens entram sempre; maestria sem categoria fica de fora', () => {
    expect(plano.filhos.itens_ficha).toHaveLength(2)
    expect(plano.filhos.itens_ficha[0].categoria_id).toBeNull()
    expect(plano.filhos.maestrias_ficha).toEqual([])
  })
})

describe('arquivo inválido e nome', () => {
  it('recusa o que não é ficha exportada', () => {
    expect(() => planejarImportacao({ formato: 'outra-coisa' }, destino, ids)).toThrow(/não é uma ficha/)
    expect(() => planejarImportacao({ ...arquivo, versao: 99 }, destino, ids)).toThrow(/versão mais nova/)
  })
  it('sem sistema no destino: nada casa, mas a ficha entra', () => {
    const plano = planejarImportacao(arquivo, null, ids)
    expect(plano.ficha.nome_personagem).toBe('Aria')
    expect(plano.filhos.valores_atributos).toEqual([])
    expect(plano.filhos.projetos_ficha).toHaveLength(1)
  })
  it('nome de arquivo sem acento nem espaço', () => {
    expect(nomeArquivoFicha('Lorde Vex, o Pálido')).toBe('lorde_vex_o_palido.ficha.json')
    expect(nomeArquivoFicha('')).toBe('ficha.ficha.json')
  })
})
