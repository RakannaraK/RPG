import { describe, it, expect } from 'vitest'
import { extrair, AREAS } from '../../scripts/i18n-extrair.mjs'
import en from './en.js'
import es from './es.js'

// Ligar (true) no fim da F66: todo texto extraído precisa de tradução.
const EXIGIR_COMPLETO = true

const { fontes, problemas } = extrair()
const NL = String.fromCharCode(10)
const vars = s => [...s.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort().join(',')

describe('cobertura i18n', () => {
  it('t() e tn() só recebem texto literal', () => {
    expect(problemas.map(p => `${p.arquivo}:${p.linha}`)).toEqual([])
  })

  it.each([['en', en], ['es', es]])('%s: mesmas {variáveis} do português', (_id, dic) => {
    const erros = Object.entries(dic).filter(([k, v]) => vars(k) !== vars(v)).map(([k]) => k)
    expect(erros).toEqual([])
  })

  it.runIf(EXIGIR_COMPLETO).each([['en', en], ['es', es]])('%s: tudo traduzido', (_id, dic) => {
    const faltam = AREAS.flatMap(a => fontes[a]).filter(x => !dic[x])
    expect(faltam).toEqual([])
  })
})

describe('extrator', () => {
  it('lê tx como "Texto|contexto" e acusa variável sem valores ou ${} entre aspas', async () => {
    const { mkdtempSync, mkdirSync, writeFileSync } = await import('node:fs')
    const { tmpdir } = await import('node:os')
    const { join } = await import('node:path')
    const raiz = mkdtempSync(join(tmpdir(), 'i18n-'))
    mkdirSync(join(raiz, 'src/pages'), { recursive: true })
    writeFileSync(join(raiz, 'src/pages/X.jsx'), [
      "const a = tx('conta', 'Entrar') // usa t(variavel) aqui",
      "const b = t('Oi {nome}')",
      "const c = t('Oi {nome}', { nome })",
      "const d = tn(n, '{n} item', '{n} itens')",
      "const e = t('Custa ${x}')",
      "const f = t('http://x.com') /* t(y) */",
      "const g = t('{a} de {lista.length}', { a, lista })",
    ].join('\r\n'))
    const r = extrair(raiz)
    expect(r.fontes.pages).toEqual(['Entrar|conta', 'Oi {nome}', '{n} item', '{n} itens', 'http://x.com'].sort())
    expect(r.problemas.map(p => p.linha)).toEqual([2, 5, 7])
  })

  it('acusa variável local t que esconde a função, só em arquivo que importa i18n', async () => {
    const { mkdtempSync, mkdirSync, writeFileSync } = await import('node:fs')
    const { tmpdir } = await import('node:os')
    const { join } = await import('node:path')
    const raiz = mkdtempSync(join(tmpdir(), 'i18n-'))
    mkdirSync(join(raiz, 'src/pages'), { recursive: true })
    const imp = "import { t } from '../i18n'"
    const casos = [
      'const t = 1', 'let t', 'var t = 2', 'const { t } = obj', 'const { a, t: b, c: t } = obj', 'const [t] = lista',
      'const [a, t] = lista', 'xs.map(t => t.id)', 'xs.map((a, t) => a)', 'function f(t) {}', 'const g = (t = 1) => t',
      'try {} catch (t) {}', 'for (const t of xs) {}', 'xs.map(tk => num(t.x))', 'const y = t?.y', 'const z = t[0]',
    ]
    // cada caso numa linha: linha 1 é o import
    writeFileSync(join(raiz, 'src/pages/Ruim.jsx'), [imp, ...casos].join(NL))
    const limpo = [imp, "const a = t('Oi')", 'const o = { t: 1 }', 'const p = o.t', "const s = 'const t = 1'", '// const t = 2', "xs.map(x => t('Oi'))"].join(NL)
    writeFileSync(join(raiz, 'src/pages/Limpo.jsx'), limpo)
    writeFileSync(join(raiz, 'src/pages/SemImport.jsx'), 'const t = 1' + NL + 'xs.map(t => t)')
    const r = extrair(raiz).problemas
    const linhas = r.filter(p => p.arquivo.endsWith('Ruim.jsx')).map(p => p.linha)
    for (let i = 0; i < casos.length; i++) expect(linhas, casos[i]).toContain(i + 2)
    expect(r.filter(p => !p.arquivo.endsWith('Ruim.jsx'))).toEqual([])
    expect(r[0].motivo).toContain('esconde a função de tradução')
  })
})
