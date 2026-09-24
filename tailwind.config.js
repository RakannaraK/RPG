/** @type {import('tailwindcss').Config} */

// Cor de token com canal + <alpha-value>: é o que faz `bg-void/40` e
// `border-border/50` existirem. Com `var(--void)` puro o Tailwind não gera a
// variante de opacidade — 224 usos ficavam sem regra nenhuma no CSS final.
const cor = nome => `rgb(var(--${nome}-c) / <alpha-value>)`

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: cor('bg'),
        void: cor('void'),
        raised: cor('raised'),
        hover: cor('hover'),
        border: cor('border'),
        'sobre-acento': 'var(--sobre-acento)',
        ink: {
          DEFAULT: cor('ink'),
          dim: 'var(--ink-dim)',
        },
        accent: {
          300: cor('accent-300'),
          400: cor('accent-400'),
          500: cor('accent-500'),
          600: cor('accent-600'),
          700: cor('accent-700'),
          800: cor('accent-800'),
        },
        dice: {
          200: cor('dice-200'),
          400: cor('dice-400'),
          500: cor('dice-500'),
          700: cor('dice-700'),
        },
        ok: cor('ok'),
        warn: cor('warn'),
        harm: cor('harm'),
        temp: cor('temp'),

        /* ── Fase 38 — as paletas herdadas passam a SER os tokens ─────────────
           Metade do site nasceu antes dos tokens, escrito em `purple-*` e
           `slate-*` (1.596 + 230 usos). Em vez de reescrever tudo — diff
           gigante, risco alto — as duas paletas apontam para os mesmos tokens.
           Efeito: toda tela antiga acompanha os 5 temas, a opacidade funciona,
           e o bloco de ~60 regras com !important em tokens.css pôde sair.
           O mapa tom-a-tom é o mesmo que aquelas regras já aplicavam para quem
           tinha tema escolhido, então nada muda para essas pessoas. */
        purple: {
          100: cor('accent-300'),
          200: cor('accent-300'),
          300: cor('accent-400'),
          400: cor('accent-400'),
          500: cor('accent-500'),
          600: cor('accent-600'),
          700: cor('accent-700'),
          800: cor('accent-800'),
          900: cor('p900'),
          950: cor('p950'),
        },
        slate: {
          100: cor('ink'),
          200: cor('ink'),
          400: 'var(--ink-dim)',
          500: 'var(--ink-dim)',
          600: cor('border'),
          700: cor('hover'),
          750: cor('hover'),
          800: cor('raised'),
          900: cor('void'),
          950: cor('bg'),
        },
      },
      fontFamily: {
        sora: ['Sora', 'sans-serif'],
        sans: ['"Instrument Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
}
