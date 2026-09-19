// Aceitação da Fase 30 (parte pura). O lado do banco — ficha privada invisível
// (inclusive as linhas filhas), leitor que não edita, editor que não muda
// privacidade nem toma a ficha, editor rebaixado a espectador — foi testado com
// RLS no banco real (26/26, transação desfeita).
import { describe, it, expect } from 'vitest'
import { agruparPorPasta, podeEditarFicha } from './permissoesFicha'
import { exportarFicha, planejarImportacao } from './fichaPortatil'

const sistema = {
  sistema: { nome: 'Krad', config_layout: { trilhas: [{ id: 't1', nome: 'Vitalidade' }] } },
  atributos: [{ id: 'a1', nome: 'Força' }, { id: 'a2', nome: 'Mente' }],
  pericias: [{ id: 'p1', nome: 'Furtividade' }],
  racas: [{ id: 'r1', nome: 'Anã', modificadores: [] }],
  classes: [{ id: 'c1', nome: 'Guardiã', modificadores: [] }],
  habilidades: [{ id: 'h1', nome: 'Investida', modificadores: [] }],
  categorias_item: [{ id: 'ci1', nome: 'Armas' }],
  poderes: [], linhas_poder: [], pools: [], recompensas_nivel: [],
}
const ficha = {
  id: 'f1', mesa_id: 'm1', dono_id: 'dono', sistema_id: 's1', nome_personagem: 'Runa',
  raca: 'Anã', classe: 'Guardiã', nivel: 4, hp_atual: 20, hp_maximo: 26, notas: 'medo de água',
  raca_id: 'r1', classe_id: 'c1', privada: true, leitores: ['leitor'], editores: ['editor'], pasta: 'Heróis',
}
const filhos = {
  valores_atributos: [{ ficha_id: 'f1', atributo_id: 'a1', valor: 5 }, { ficha_id: 'f1', atributo_id: 'a2', valor: 3 }],
  pericias_ficha: [{ ficha_id: 'f1', pericia_id: 'p1', proficiente: true, bonus: 2 }],
  habilidades_ficha: [{ ficha_id: 'f1', habilidade_id: 'h1', ativa: true, recurso_atual: 1 }],
  itens_ficha: [{ id: 'i1', ficha_id: 'f1', nome: 'Machado', categoria_id: 'ci1', ordem: 0 }],
  maestrias_ficha: [{ ficha_id: 'f1', categoria_id: 'ci1', item_id: 'i1', xp: 12, nivel: 1 }],
  trilhas_ficha: [{ ficha_id: 'f1', trilha_id: 't1', marcas: [1, 1, 0], tamanho_bonus: 0 }],
}

describe('Fase 30 — aceitação', () => {
  it('quem edita: dono e editor liberado; leitor e os outros, não', () => {
    expect(podeEditarFicha(ficha, 'dono')).toBe(true)
    expect(podeEditarFicha(ficha, 'editor')).toBe(true)
    expect(podeEditarFicha(ficha, 'leitor')).toBe(false)
    expect(podeEditarFicha(ficha, 'estranho')).toBe(false)
  })

  it('pastas organizam a lista sem tabela de pastas', () => {
    const grupos = agruparPorPasta([ficha, { id: 'f2', pasta: null }, { id: 'f3', pasta: 'Heróis' }])
    expect(grupos.map(g => [g.pasta, g.fichas.length])).toEqual([[null, 1], ['Heróis', 2]])
  })

  it('exportar e importar no mesmo sistema reproduz a ficha', () => {
    let n = 0
    const plano = planejarImportacao(exportarFicha({ ficha, filhos, sistema }), sistema, () => `id-${++n}`)
    expect(plano.avisos).toEqual([])
    expect(plano.ficha).toMatchObject({ nome_personagem: 'Runa', nivel: 4, hp_atual: 20, notas: 'medo de água', raca_id: 'r1', classe_id: 'c1' })
    expect(plano.filhos.valores_atributos.map(r => r.valor)).toEqual([5, 3])
    expect(plano.filhos.pericias_ficha[0]).toMatchObject({ pericia_id: 'p1', proficiente: true, bonus: 2 })
    expect(plano.filhos.trilhas_ficha[0]).toMatchObject({ trilha_id: 't1', marcas: [1, 1, 0] })
    expect(plano.filhos.maestrias_ficha[0].item_id).toBe(plano.filhos.itens_ficha[0].id)
  })

  it('num sistema diferente entra o que casa e o resto vira aviso', () => {
    const outro = { sistema: { nome: 'Outro', config_layout: {} }, atributos: [{ id: 'X', nome: 'força' }], racas: [], classes: [], categorias_item: [] }
    const plano = planejarImportacao(exportarFicha({ ficha, filhos, sistema }), outro, () => crypto.randomUUID())
    expect(plano.filhos.valores_atributos).toEqual([expect.objectContaining({ atributo_id: 'X', valor: 5 })])
    expect(plano.filhos.itens_ficha).toHaveLength(1) // item entra sempre, sem categoria
    expect(plano.avisos).toContain('Perícia “Furtividade” não existe neste sistema.')
    expect(plano.avisos).toContain('Habilidade “Investida” não existe neste sistema.')
  })

  it('o arquivo nunca decide dono, mesa, privacidade nem pasta', () => {
    const arquivo = exportarFicha({ ficha, filhos, sistema })
    arquivo.ficha.dono_id = 'invasor'
    arquivo.ficha.privada = false
    arquivo.ficha.pasta = 'Invasores'
    const plano = planejarImportacao(arquivo, sistema, () => crypto.randomUUID())
    for (const c of ['dono_id', 'mesa_id', 'sistema_id', 'privada', 'leitores', 'editores', 'pasta']) {
      expect(plano.ficha[c]).toBeUndefined()
    }
  })
})
