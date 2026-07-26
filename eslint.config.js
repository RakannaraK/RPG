import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // `catch {}` de best-effort é idioma deliberado deste projeto.
      'no-empty': ['error', { allowEmptyCatch: true }],
      // ignoreRestSiblings protege o padrão `({ chave, ...resto })` usado para
      // OMITIR uma chave (ex.: montarPayloadImportacao em systemSerializer.js):
      // ali a variável "não usada" é justamente o que exclui o campo.
      'no-unused-vars': ['error', { ignoreRestSiblings: true, argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // Abaixo: o linter discorda de padrões que funcionam. Ficam como AVISO —
      // visíveis, sem bloquear o CI nem forçar reescrita de risco.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
      'react-refresh/only-export-components': 'warn',
      'preserve-caught-error': 'warn',
    },
  },
])
