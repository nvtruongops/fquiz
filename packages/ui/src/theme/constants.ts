export const SUPPORTED_THEMES = ['light', 'dark', 'green', 'pink'] as const
export type SupportedTheme = typeof SUPPORTED_THEMES[number]

export const THEME_LABELS: Record<SupportedTheme, string> = {
  light: 'Light (Default)',
  dark: 'Dark',
  green: 'Forest Green',
  pink: 'Rose Pink',
}
