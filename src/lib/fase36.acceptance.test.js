// Aceitação da Fase 36 (parte pura). O lado do banco — quem vê, quem publica,
// curtida única, 3 denúncias escondendo, autor apagando, anônimo só na função
// pública — foi testado no banco real (19/19, transação desfeita). A interface
// foi clicada no navegador: vitrine sem login com demo de dado, publicar um
// arquivo exportado, curtir e denunciar.
import { describe, it, expect } from 'vitest'
import {
  DENUNCIAS_PARA_ESCONDER, LIMITE_CONTEUDO_BYTES, filtrarVitrine, normalizarEtiquetas,
  ordenarVitrine, validarPublicacao,
} from './comunidade'
import { exportarFicha, planejarImportacao } from './fichaPortatil'

const sistema = {
  sistema: { nome: 'Krad', config_layout: {} },
  atributos: [{ id: 'a1', nome: 'Força' }], pericias: [], racas: [], classes: [],
  habilidades: [], categorias_item: [], poderes: [], linhas_poder: [], pools: [], recompensas_nivel: [],
}

describe('Fase 36 — aceitação', () => {
  it('publicar uma criatura manda o ARQUIVO portátil, nunca a ficha ao vivo', () => {
    const criatura = { id: 'c1', mesa_id: 'm1', dono_id: 'mestre', tipo_ficha: 'criatura', nome_personagem: 'Goblin', hp_maximo: 9, privada: true }
    const arquivo = exportarFicha({ ficha: criatura, filhos: { valores_atributos: [{ ficha_id: 'c1', atributo_id: 'a1', valor: 2 }] }, sistema })
    expect(validarPublicacao({ tipo: 'criatura', titulo: 'Goblin Saqueador', conteudo: arquivo })).toEqual({ ok: true })
    // o arquivo não leva mesa, dono nem privacidade
    for (const c of ['mesa_id', 'dono_id', 'privada', 'id']) expect(arquivo.ficha[c]).toBeUndefined()
  })

  it('quem obtém traz para a mesa dele, com o que casa no sistema', () => {
    const arquivo = exportarFicha({
      ficha: { id: 'c1', nome_personagem: 'Goblin', hp_maximo: 9 },
      filhos: { valores_atributos: [{ ficha_id: 'c1', atributo_id: 'a1', valor: 2 }] },
      sistema,
    })
    const plano = planejarImportacao(arquivo, sistema, () => crypto.randomUUID())
    expect(plano.avisos).toEqual([])
    expect(plano.ficha.nome_personagem).toBe('Goblin')
    expect(plano.filhos.valores_atributos[0]).toMatchObject({ atributo_id: 'a1', valor: 2 })
  })

  it('etiquetas limpas e vitrine filtrando/ordenando', () => {
    expect(normalizarEtiquetas('Fantasia, fantasia , Baixo Nível')).toEqual(['fantasia', 'baixo nível'])
    const vitrine = [
      { id: '1', tipo: 'criatura', titulo: 'Goblin', etiquetas: ['fantasia'], curtidas: 1, created_at: '2026-09-01T00:00:00Z' },
      { id: '2', tipo: 'arte', titulo: 'Ogro', etiquetas: ['arte'], curtidas: 5, created_at: '2026-09-02T00:00:00Z' },
    ]
    expect(filtrarVitrine(vitrine, { etiqueta: 'fantasia' }).map(p => p.id)).toEqual(['1'])
    expect(ordenarVitrine(vitrine, 'curtidas').map(p => p.id)).toEqual(['2', '1'])
  })

  it('recusa o que não deve ser publicado', () => {
    expect(validarPublicacao({ tipo: 'arte', titulo: 'Sem imagem' }).ok).toBe(false)
    expect(validarPublicacao({ tipo: 'ficha', titulo: 'Arquivo errado', conteudo: { qualquer: 1 } }).ok).toBe(false)
    const grande = { formato: 'rpg-ficha', tipo: 'ficha', versao: 1, lixo: 'x'.repeat(LIMITE_CONTEUDO_BYTES + 10) }
    expect(validarPublicacao({ tipo: 'ficha', titulo: 'Gigante', conteudo: grande }).ok).toBe(false)
  })

  it('a regra de moderação combinada com o banco: 3 denúncias escondem', () => {
    expect(DENUNCIAS_PARA_ESCONDER).toBe(3) // o gatilho `contar_denuncias` usa o mesmo número
  })
})
