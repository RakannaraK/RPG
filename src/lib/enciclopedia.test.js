import { describe, it, expect } from 'vitest'
import {
  buscarVerbetes, camposRevelaveis, citadoPor, estadoRevelacao, mencoes, nomeDoCampo,
  ordenarVerbetes, partesComMencoes, quemSabe, validarVerbete,
} from './enciclopedia'

const mirta = { id: 'm', tipo: 'npc', titulo: 'Velha Mirta', resumo: 'Dona da estalagem.', corpo: 'Mora em [[Vila Úmida]].', segredo: 'bruxa', tags: ['aliada'], campos: { aparencia: 'corcunda', motivacao: '' } }
const vila = { id: 'v', tipo: 'local', titulo: 'Vila Umida', resumo: null, corpo: 'A [[velha mirta]] manda aqui. Cuidado com [[Barão Sombrio]].', tags: [], campos: {} }

describe('F41 — enciclopédia', () => {
  it('menções: acha títulos, sem repetir, e casa sem acento/maiúscula', () => {
    expect(mencoes('[[A]] e [[b]] e [[a]] e [[ ]]')).toEqual(['A', 'b'])
    const partes = partesComMencoes(vila.corpo, [mirta])
    expect(partes).toEqual([
      { texto: 'A ' },
      { texto: 'velha mirta', alvo: mirta },
      { texto: ' manda aqui. Cuidado com Barão Sombrio.' }, // sem alvo: texto simples
    ])
    expect(partesComMencoes('sem nada', [mirta])).toEqual([{ texto: 'sem nada' }])
  })

  it('menção a verbete ainda secreto (sem título para o leitor) não vira link', () => {
    const secreto = { id: 'b', titulo: null }
    expect(partesComMencoes('[[Barão Sombrio]]', [secreto])).toEqual([{ texto: 'Barão Sombrio' }])
  })

  it('citado por: quem menciona este verbete', () => {
    expect(citadoPor(mirta, [mirta, vila]).map(v => v.id)).toEqual(['v'])
    expect(citadoPor(vila, [mirta, vila]).map(v => v.id)).toEqual(['m'])
    expect(citadoPor({ id: 'x', titulo: null }, [mirta, vila])).toEqual([])
  })

  it('busca sem acento em título, texto, etiquetas e campos; filtra por tipo', () => {
    expect(buscarVerbetes([mirta, vila], { busca: 'estalagem' }).map(v => v.id)).toEqual(['m'])
    expect(buscarVerbetes([mirta, vila], { busca: 'VILA umida' }).map(v => v.id)).toEqual(['m', 'v']) // a Mirta cita a vila no texto
    expect(buscarVerbetes([mirta, vila], { busca: 'BARAO' }).map(v => v.id)).toEqual(['v'])
    expect(buscarVerbetes([mirta, vila], { busca: 'corcunda' }).map(v => v.id)).toEqual(['m'])
    expect(buscarVerbetes([mirta, vila], { busca: 'aliada' }).map(v => v.id)).toEqual(['m'])
    expect(buscarVerbetes([mirta, vila], { tipo: 'local' }).map(v => v.id)).toEqual(['v'])
    // o jogador recebe campos null: a busca não quebra
    expect(buscarVerbetes([{ id: 'z', titulo: null, campos: {} }], { busca: 'x' })).toEqual([])
  })

  it('ordena por título, os secretos no fim', () => {
    expect(ordenarVerbetes([{ id: 1, titulo: null }, vila, mirta]).map(v => v.id)).toEqual(['m', 'v', 1])
  })
})

describe('F42 — revelação campo a campo', () => {
  it('só é revelável o que tem conteúdo, e nunca o segredo', () => {
    expect(camposRevelaveis(mirta)).toEqual(['titulo', 'resumo', 'corpo', 'tags', 'campos.aparencia'])
    expect(camposRevelaveis(mirta)).not.toContain('segredo')
    expect(nomeDoCampo('campos.aparencia', 'npc')).toBe('Aparência')
    expect(nomeDoCampo('corpo', 'npc')).toBe('Texto')
  })

  it('quem sabe o quê: revelação à mesa toda vale para todos', () => {
    const rev = [
      { verbete_id: 'm', usuario_id: null, campo: 'titulo' },
      { verbete_id: 'm', usuario_id: 'ana', campo: 'campos.aparencia' },
      { verbete_id: 'v', usuario_id: 'bia', campo: 'titulo' },
    ]
    const { todos, porUsuario } = quemSabe(rev, 'm', ['ana', 'bia'])
    expect([...todos]).toEqual(['titulo'])
    expect([...porUsuario.get('ana')].sort()).toEqual(['campos.aparencia', 'titulo'])
    expect([...porUsuario.get('bia')]).toEqual(['titulo'])
  })

  it('estado para a lista do mestre: oculto, parcial, revelado', () => {
    const v = { id: 'x', titulo: 'X', resumo: 'r', campos: {} }
    expect(estadoRevelacao(v, [], ['ana'])).toBe('oculto')
    expect(estadoRevelacao(v, [{ verbete_id: 'x', usuario_id: 'ana', campo: 'titulo' }], ['ana'])).toBe('parcial')
    const tudo = ['titulo', 'resumo'].map(campo => ({ verbete_id: 'x', usuario_id: null, campo }))
    expect(estadoRevelacao(v, tudo, ['ana'])).toBe('revelado')
  })

  it('valida e limpa o formulário do mestre', () => {
    expect(validarVerbete({ tipo: 'npc', titulo: '  ' }).ok).toBe(false)
    expect(validarVerbete({ tipo: 'dragao', titulo: 'X' }).ok).toBe(false)
    expect(validarVerbete({ tipo: 'npc', titulo: 'X', resumo: 'a'.repeat(501) }).ok).toBe(false)
    const { ok, linha } = validarVerbete({
      tipo: 'npc', titulo: ' Mirta ', resumo: '', tags: 'Aliada, aliada, vila',
      campos: { aparencia: ' corcunda ', motivacao: '', inventado: 'x' },
    })
    expect(ok).toBe(true)
    expect(linha).toMatchObject({ titulo: 'Mirta', resumo: null, tags: ['aliada', 'vila'], campos: { aparencia: 'corcunda' } })
  })
})
