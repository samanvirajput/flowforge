/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:       '#05090f',
        surface:  '#090e17',
        panel:    '#0c1420',
        border:   '#14243a',
        accent:   '#00d4a8',
        'accent-dim': '#00d4a820',
        muted:    '#3a5a7a',
        danger:   '#ff3355',
        warn:     '#ffb020',
        text:     '#c8d8ea',
        'text-dim': '#4a6a8a',
      },
      fontFamily: {
        mono: ['"Space Mono"', '"JetBrains Mono"', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.65rem', { lineHeight: '1rem' }],
      },
    },
  },
  plugins: [],
}
