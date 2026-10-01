import { describe, it, expect } from 'vitest'
import { secoesAlteradas, textoAlteradas, SECOES_SISTEMA } from './editorSistema'

const base = {
  nome: 'D&D Custom', descricao: '', atributos: [{ id: 'a', nome: 'Força' }], pericias: [],
  configLayout: { descansos: [], poderes_rotulo: 'Magias', campos_combate: [], maestria_ativa: false },
  removidos: { atributos: [], pericias: [] },
}

describe('F52 — editor de sistema: o que falta salvar', () => {
  it('nada mudou: nenhuma seção', () => {
    expect(secoesAlteradas(base, structuredClone(base)).size).toBe(0)
  })

  it('aponta a seção certa de cada mudança', () => {
    const a = structuredClone(base)
    a.nome = 'D&D Caseiro'
    a.atributos[0].nome = 'Potência'
    a.configLayout.descansos = [{ id: 'd', nome: 'Curto' }]
    a.configLayout.poderes_rotulo = 'Técnicas'
    a.configLayout.campos_combate = [{ id: 'ca' }]
    a.configLayout.maestria_ativa = true
    expect([...secoesAlteradas(base, a)].sort()).toEqual(['atributos', 'descansos', 'ficha', 'geral', 'maestria', 'poderes'])
  })

  it('remover atributo conta mesmo com a lista igual', () => {
    const a = structuredClone(base)
    a.removidos.atributos = ['x']
    expect([...secoesAlteradas(base, a)]).toEqual(['atributos'])
  })

  it('texto da barra na ordem das seções', () => {
    expect(textoAlteradas(new Set(['ficha', 'geral']))).toBe('Geral e Ficha')
    expect(textoAlteradas(new Set(['atributos']))).toBe('Atributos')
    expect(textoAlteradas(new Set())).toBe('')
    expect(new Set(SECOES_SISTEMA.map(s => s.id)).size).toBe(SECOES_SISTEMA.length)
  })
})
