import type { Config } from 'tailwindcss'
import defaultTheme from 'tailwindcss/defaultTheme'
import tailwindcssAnimate from 'tailwindcss-animate'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: '',
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', ...defaultTheme.fontFamily.sans],
      },
      colors: {
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          hover: 'hsl(var(--primary-hover))',
        },
        'secondary-accent': 'hsl(var(--secondary-accent))',
        'app-bg': 'hsl(var(--app-bg))',
        
        surface: {
          page: 'hsl(var(--surface-page))',
          base: 'hsl(var(--surface-base))',
          card: 'hsl(var(--surface-card))',
          'card-elevated': 'hsl(var(--surface-card-elevated))',
          'card-muted': 'hsl(var(--surface-card-muted))',
          'card-accent': 'hsl(var(--surface-card-accent))',
          inset: 'hsl(var(--surface-inset))',
          overlay: 'hsl(var(--surface-overlay))',
        },

        'border-subtle': 'hsl(var(--border-subtle))',
        'border-default': 'hsl(var(--border-default))',
        'border-strong': 'hsl(var(--border-strong))',
        'border-emphasis': 'hsl(var(--border-emphasis))',
        'border-accent': 'hsl(var(--border-accent))',
        'border-focus': 'hsl(var(--border-focus))',
        'border-selected': 'hsl(var(--border-selected))',
        'border-success-subtle': 'hsl(var(--border-success))',
        'border-warning-subtle': 'hsl(var(--border-warning))',
        'border-danger-subtle': 'hsl(var(--border-danger))',
        'border-info-subtle': 'hsl(var(--border-info))',

        text: {
          secondary: 'hsl(var(--text-secondary))',
          tertiary: 'hsl(var(--text-tertiary))',
          muted: 'hsl(var(--text-muted))',
          disabled: 'hsl(var(--text-disabled))',
          placeholder: 'hsl(var(--text-placeholder))',
          'on-accent': 'hsl(var(--text-on-accent))',
          'on-brand': 'hsl(var(--text-on-brand))',
        },

        success: {
          DEFAULT: 'hsl(var(--success-fg))',
          fg: 'hsl(var(--success-fg))',
          bg: 'hsl(var(--success-bg))',
          border: 'hsl(var(--success-border))',
        },
        info: {
          DEFAULT: 'hsl(var(--info-fg))',
          fg: 'hsl(var(--info-fg))',
          bg: 'hsl(var(--info-bg))',
          border: 'hsl(var(--info-border))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning-fg))',
          fg: 'hsl(var(--warning-fg))',
          bg: 'hsl(var(--warning-bg))',
          border: 'hsl(var(--warning-border))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: {
          DEFAULT: 'hsl(var(--ring))',
          focus: 'hsl(var(--ring-focus))',
          selected: 'hsl(var(--ring-selected))',
        },
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [tailwindcssAnimate],
}

export default config
