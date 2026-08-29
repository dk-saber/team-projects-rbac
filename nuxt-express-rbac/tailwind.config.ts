import type { Config } from 'tailwindcss'

export default <Partial<Config>>{
  content: [],
  theme: {
    extend: {
      colors: {
        // Base "console" — panneau de contrôle sombre, plus neutre/graphite
        // que l'ancien thème "coffre-fort" (ink+gold).
        ink: {
          950: '#090B0F',
          900: '#0D1015',
          850: '#10141A',
          800: '#12161D',
          700: '#171C24',
          600: '#232A35',
          500: '#323B48'
        },
        // Accent principal : teal technique (signal "actif/en ligne"),
        // remplace le gold comme couleur de marque.
        teal: {
          300: '#7DEAD8',
          400: '#3FDCC2',
          500: '#22D3B8',
          600: '#16A896',
          700: '#0F7F73'
        },
        // Conservé pour compat (liens secondaires / focus légers)
        gold: {
          300: '#F5D68C',
          400: '#F0C05A',
          500: '#E3B341',
          600: '#C79530',
          700: '#9C7423'
        },
        signal: {
          300: '#AEBCFF',
          400: '#7C93FF',
          500: '#5C7CFA',
          600: '#4A63D1'
        },
        rust: {
          400: '#F0788C',
          500: '#F2495C',
          600: '#D93A4C'
        },
        emerald: {
          300: '#7EEAC4',
          400: '#3FDDA0',
          500: '#22C48A'
        },
        // Palette de couleurs par rôle — utilisée partout où un rôle est
        // affiché (badges, puces, bordure de ligne dans les tableaux) pour
        // qu'un rôle soit reconnaissable d'un seul coup d'œil dans toute l'app.
        role: {
          admin: '#B79CFB',
          devops: '#3FDCC2',
          dev: '#63B3FB',
          test: '#F5C451',
          ops: '#F5789A',
          default: '#8B95A7'
        }
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'ui-sans-serif', 'sans-serif'],
        body: ['Inter', 'ui-sans-serif', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace']
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(34,211,184,0.18), 0 0 40px -12px rgba(34,211,184,0.35)',
        panel: '0 1px 0 0 rgba(255,255,255,0.03) inset, 0 20px 40px -24px rgba(0,0,0,0.6)'
      },
      backgroundImage: {
        grid:
          'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)'
      },
      backgroundSize: {
        grid: '32px 32px'
      }
    }
  },
  plugins: []
}

