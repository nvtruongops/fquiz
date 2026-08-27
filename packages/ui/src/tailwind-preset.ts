import defaultTheme from 'tailwindcss/defaultTheme'
import tailwindcssAnimate from 'tailwindcss-animate'

export const fquizTailwindPreset = {
  darkMode: ['class'] as const,
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
        accentRole: {
          brand: 'hsl(var(--accent-brand))',
          learning: {
            DEFAULT: 'hsl(var(--accent-learning))',
            subtle: 'hsl(var(--accent-learning-subtle))',
            bg: 'hsl(var(--accent-learning-bg))',
            fg: 'hsl(var(--accent-learning-fg))',
            border: 'hsl(var(--accent-learning-border))',
          },
          memory: {
            DEFAULT: 'hsl(var(--accent-memory))',
            subtle: 'hsl(var(--accent-memory-subtle))',
            bg: 'hsl(var(--accent-memory-bg))',
            fg: 'hsl(var(--accent-memory-fg))',
            border: 'hsl(var(--accent-memory-border))',
          },
          progress: {
            DEFAULT: 'hsl(var(--accent-progress))',
            subtle: 'hsl(var(--accent-progress-subtle))',
            bg: 'hsl(var(--accent-progress-bg))',
            fg: 'hsl(var(--accent-progress-fg))',
            border: 'hsl(var(--accent-progress-border))',
          },
          achievement: {
            DEFAULT: 'hsl(var(--accent-achievement))',
            subtle: 'hsl(var(--accent-achievement-subtle))',
            bg: 'hsl(var(--accent-achievement-bg))',
            fg: 'hsl(var(--accent-achievement-fg))',
            border: 'hsl(var(--accent-achievement-border))',
          },
          focus: {
            DEFAULT: 'hsl(var(--accent-focus))',
            subtle: 'hsl(var(--accent-focus-subtle))',
            bg: 'hsl(var(--accent-focus-bg))',
            fg: 'hsl(var(--accent-focus-fg))',
            border: 'hsl(var(--accent-focus-border))',
          },
          discovery: {
            DEFAULT: 'hsl(var(--accent-discovery))',
            subtle: 'hsl(var(--accent-discovery-subtle))',
            bg: 'hsl(var(--accent-discovery-bg))',
            fg: 'hsl(var(--accent-discovery-fg))',
            border: 'hsl(var(--accent-discovery-border))',
          },
          community: {
            DEFAULT: 'hsl(var(--accent-community))',
            subtle: 'hsl(var(--accent-community-subtle))',
            bg: 'hsl(var(--accent-community-bg))',
            fg: 'hsl(var(--accent-community-fg))',
            border: 'hsl(var(--accent-community-border))',
          },
          classroom: {
            DEFAULT: 'hsl(var(--accent-classroom))',
            subtle: 'hsl(var(--accent-classroom-subtle))',
            bg: 'hsl(var(--accent-classroom-bg))',
            fg: 'hsl(var(--accent-classroom-fg))',
            border: 'hsl(var(--accent-classroom-border))',
          },
        },
        learning: {
          new: {
            bg: 'hsl(var(--learning-new-bg))',
            fg: 'hsl(var(--learning-new-fg))',
            border: 'hsl(var(--learning-new-border))',
          },
          review: {
            bg: 'hsl(var(--learning-review-bg))',
            fg: 'hsl(var(--learning-review-fg))',
            border: 'hsl(var(--learning-review-border))',
          },
          progress: {
            bg: 'hsl(var(--learning-progress-bg))',
            fg: 'hsl(var(--learning-progress-fg))',
            border: 'hsl(var(--learning-progress-border))',
          },
          mastered: {
            bg: 'hsl(var(--learning-mastered-bg))',
            fg: 'hsl(var(--learning-mastered-fg))',
            border: 'hsl(var(--learning-mastered-border))',
          },
          struggling: {
            bg: 'hsl(var(--learning-struggling-bg))',
            fg: 'hsl(var(--learning-struggling-fg))',
            border: 'hsl(var(--learning-struggling-border))',
          },
          discovery: {
            bg: 'hsl(var(--learning-discovery-bg))',
            fg: 'hsl(var(--learning-discovery-fg))',
            border: 'hsl(var(--learning-discovery-border))',
          },
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
        incorrect: {
          DEFAULT: 'hsl(var(--incorrect-fg))',
          fg: 'hsl(var(--incorrect-fg))',
          bg: 'hsl(var(--incorrect-bg))',
          border: 'hsl(var(--incorrect-border))',
        },
        attempted: {
          DEFAULT: 'hsl(var(--attempted-fg))',
          fg: 'hsl(var(--attempted-fg))',
          bg: 'hsl(var(--attempted-bg))',
          border: 'hsl(var(--accent-learning-border))',
          text: 'hsl(var(--attempted-text))',
        },
        question: {
          unanswered: {
            bg: 'hsl(var(--question-unanswered-bg))',
            fg: 'hsl(var(--question-unanswered-fg))',
            border: 'hsl(var(--question-unanswered-border))',
          },
          attempted: {
            bg: 'hsl(var(--question-attempted-bg))',
            fg: 'hsl(var(--question-attempted-fg))',
            border: 'hsl(var(--question-attempted-border))',
          },
          current: {
            bg: 'hsl(var(--question-current-bg))',
            fg: 'hsl(var(--question-current-fg))',
            border: 'hsl(var(--question-current-border))',
          },
          correct: {
            bg: 'hsl(var(--question-correct-bg))',
            fg: 'hsl(var(--question-correct-fg))',
            border: 'hsl(var(--question-correct-border))',
          },
          incorrect: {
            bg: 'hsl(var(--question-incorrect-bg))',
            fg: 'hsl(var(--question-incorrect-fg))',
            border: 'hsl(var(--question-incorrect-border))',
          },
          flagged: {
            bg: 'hsl(var(--question-flagged-bg))',
            fg: 'hsl(var(--question-flagged-fg))',
            border: 'hsl(var(--question-flagged-border))',
          },
        },
        disabled: {
          bg: 'hsl(var(--disabled-bg))',
          fg: 'hsl(var(--disabled-fg))',
          border: 'hsl(var(--disabled-border))',
        },
        interactive: {
          hover: 'hsl(var(--interactive-hover-bg))',
          active: 'hsl(var(--interactive-active-bg))',
          'selected-bg': 'hsl(var(--interactive-selected-bg))',
          'selected-fg': 'hsl(var(--interactive-selected-fg))',
        },
        mastery: {
          beginner: {
            bg: 'hsl(var(--mastery-beginner-bg))',
            fg: 'hsl(var(--mastery-beginner-fg))',
            border: 'hsl(var(--mastery-beginner-border))',
          },
          intermediate: {
            bg: 'hsl(var(--mastery-intermediate-bg))',
            fg: 'hsl(var(--mastery-intermediate-fg))',
            border: 'hsl(var(--mastery-intermediate-border))',
          },
          mastered: {
            bg: 'hsl(var(--mastery-mastered-bg))',
            fg: 'hsl(var(--mastery-mastered-fg))',
            border: 'hsl(var(--mastery-mastered-border))',
          },
        },
        highlight: {
          bg: 'hsl(var(--highlight-bg))',
          fg: 'hsl(var(--highlight-fg))',
          border: 'hsl(var(--highlight-border))',
        },
        flashcard: {
          front: {
            bg: 'hsl(var(--flashcard-front-bg))',
            fg: 'hsl(var(--flashcard-front-fg))',
            border: 'hsl(var(--flashcard-front-border))',
          },
          back: {
            bg: 'hsl(var(--flashcard-back-bg))',
            fg: 'hsl(var(--flashcard-back-fg))',
            border: 'hsl(var(--flashcard-back-border))',
          },
        },
        chart: {
          1: 'hsl(var(--chart-1))',
          2: 'hsl(var(--chart-2))',
          3: 'hsl(var(--chart-3))',
          4: 'hsl(var(--chart-4))',
          5: 'hsl(var(--chart-5))',
        },
        'saved-badge-text': 'hsl(var(--saved-badge-text))',
        'draft-dot': 'hsl(var(--draft-dot))',
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
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
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
