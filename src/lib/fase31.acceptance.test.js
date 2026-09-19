// Aceitação da Fase 31 (parte pura). O que depende do banco — criatura privada
// invisível ao jogador, cópia do boss com ficha própria, tokens — segue as
// regras da F30 (RLS 26/26) e foi conferido no navegador com o banco simulado.
import { describe, it, expect } from 'vitest'
import { defesaSugerida, nomesDaInvocacao, planejarInvocacao } from './invocacao'
import { exportarFicha, planejarImportacao } from './fichaPortatil'

const sistema = {
  sistema: { nome: 'Krad', config_layout: { campos_combate: [{ id: 'ca', nome: 'Classe de Armadura' }] } },
  atributos: [{ id: 'a1', nome: 'Força' }], pericias: [], racas: [], classes: [],
  habilidades: [{ id: 'h1', nome: 'Mordida', modificadores: [] }], categorias_item: [], poderes: [], linhas_poder: [], pools: [], recompensas_nivel: [],
}
const goblin = {
  id: 'c1', mesa_id: 'm1', dono_id: 'mestre', sistema_id: 's1', tipo_ficha: 'criatura',
  nome_personagem: 'Goblin', especie: 'Humanoide', ameaca: 'Fácil', hp_maximo: 9, hp_atual: 9, privada: true,
}
const filhosGoblin = {
  valores_atributos: [{ ficha_id: 'c1', atributo_id: 'a1', valor: 2 }],
  habilidades_ficha: [{ ficha_id: 'c1', habilidade_id: 'h1', ativa: true, recurso_atual: null }],
  valores_combate: [{ ficha_id: 'c1', campo_id: 'ca', valor: '13' }],
}

describe('Fase 31 — aceitação', () => {
  it('invocar 3 goblins: nomes seguem a numeração e a vida vem da ficha', () => {
    const linhas = planejarInvocacao({
      criatura: goblin, quantidade: 3, tipo: 'inimigo',
      defesa: defesaSugerida(filhosGoblin.valores_combate, sistema.sistema.config_layout.campos_combate).valor,
      nomesExistentes: ['Aria', 'Goblin 1'],
    })
    expect(linhas.map(l => l.nome)).toEqual(['Goblin 2', 'Goblin 3', 'Goblin 4'])
    expect(linhas.every(l => l.hp_maximo === 9 && l.ca === 13 && l.ficha_id === 'c1')).toBe(true)
  })

  it('mook não ganha ficha nova; boss ganha uma para cada', () => {
    expect(planejarInvocacao({ criatura: goblin, quantidade: 2 }).map(l => l.ficha_id)).toEqual(['c1', 'c1'])
    const boss = planejarInvocacao({ criatura: goblin, quantidade: 2, fichasProprias: ['b1', 'b2'] })
    expect(boss.map(l => l.ficha_id)).toEqual(['b1', 'b2'])
  })

  it('a cópia do boss carrega a ficha inteira e não mexe na criatura do bestiário', () => {
    const arquivo = exportarFicha({ ficha: goblin, filhos: filhosGoblin, sistema })
    const copia = planejarImportacao(arquivo, sistema, () => crypto.randomUUID())
    expect(copia.avisos).toEqual([])
    expect(copia.fichaId).not.toBe(goblin.id)
    expect(copia.filhos.habilidades_ficha[0].habilidade_id).toBe('h1')
    expect(copia.filhos.valores_combate[0]).toMatchObject({ campo_id: 'ca', valor: '13' })
    expect(copia.ficha.hp_maximo).toBe(9)
  })

  it('criatura exportada vira criatura de novo no destino (quem importa escolhe o tipo)', () => {
    const arquivo = exportarFicha({ ficha: goblin, filhos: filhosGoblin, sistema })
    expect(arquivo.ficha.tipo_ficha).toBeUndefined() // o tipo não viaja no arquivo…
    const plano = planejarImportacao(arquivo, sistema, () => crypto.randomUUID())
    expect(plano.ficha.privada).toBeUndefined() // …nem a privacidade: quem importa decide
    expect(plano.ficha.nome_personagem).toBe('Goblin')
  })

  it('sem campo de defesa na ficha, o diálogo abre sem defesa', () => {
    expect(defesaSugerida([], sistema.sistema.config_layout.campos_combate)).toBeNull()
    expect(planejarInvocacao({ criatura: goblin, quantidade: 1, defesa: '' })[0].ca).toBeNull()
  })

  it('nome único quando é uma só e ninguém repete', () => {
    expect(nomesDaInvocacao('Dragão de Cinzas', 1, ['Aria', 'Borin'])).toEqual(['Dragão de Cinzas'])
  })
})
