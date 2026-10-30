/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          bg: 'var(--bg)',
          surface: 'var(--surface)',
          card: 'var(--surface)',
          border: 'var(--border)',
          'border-focus': 'var(--accent)',
          text: 'var(--text)',
          muted: 'var(--text-muted)',
          subtle: 'var(--text-muted)',
          amber: 'var(--accent-2)',
          'amber-light': 'var(--accent-2)',
          cyan: 'var(--accent)',
          'cyan-light': 'var(--glow)',
          blue: 'var(--accent)',
          green: 'var(--accent-2)',
          danger: '#ef4444'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif']
      },
      backdropBlur: {
        xs: '2px'
      }
    }
  },
  plugins: []
};
