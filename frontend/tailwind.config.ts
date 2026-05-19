import type { Config } from 'tailwindcss'

export default {
  content: ['./src/**/*.{ts,tsx}', './index.html'],
  theme: {
    extend: {
      colors: {
        // Backgrounds
        canvas:   '#0A0B0D',
        surface:  '#111318',
        elevated: '#1A1D24',
        border:   '#23272F',

        // Text
        primary:   '#E8EAF0',
        secondary: '#8B909A',
        muted:     '#4A4F5C',

        // Single accent
        accent: {
          DEFAULT: '#3B82F6',
          dim:     '#1D4ED8',
          glow:    'rgba(59,130,246,0.12)'
        },

        // Threat levels only
        threat: {
          low:    '#22C55E',
          medium: '#F59E0B',
          high:   '#EF4444'
        },

        // Signal classes
        signal: {
          burst:      '#F59E0B',
          hopping:    '#EF4444',
          unlicensed: '#F97316',
          licensed:   '#22C55E',
          unknown:    '#8B909A'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      },
      fontSize: {
        'xxs': ['10px', '14px']
      }
    }
  },
  plugins: []
} satisfies Config
