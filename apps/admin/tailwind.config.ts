import type { Config } from 'tailwindcss'
import { fquizTailwindPreset } from '../../packages/ui/src/tailwind-preset'

const config: Config = {
  presets: [fquizTailwindPreset as any],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
}

export default config
