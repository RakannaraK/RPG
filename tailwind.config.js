/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        void: 'var(--void)',
        raised: 'var(--raised)',
        hover: 'var(--hover)',
        border: 'var(--border)',
        ink: {
          DEFAULT: 'var(--ink)',
          dim: 'var(--ink-dim)',
        },
        accent: {
          300: 'var(--accent-300)',
          400: 'var(--accent-400)',
          500: 'var(--accent-500)',
          600: 'var(--accent-600)',
          700: 'var(--accent-700)',
          800: 'var(--accent-800)',
        },
        dice: {
          200: 'var(--dice-200)',
          400: 'var(--dice-400)',
          500: 'var(--dice-500)',
          700: 'var(--dice-700)',
        },
        ok: 'var(--ok)',
        warn: 'var(--warn)',
        harm: 'var(--harm)',
        temp: 'var(--temp)',
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

