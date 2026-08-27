export const SUPPORTED_THEMES = ['light', 'dark', 'green', 'pink'] as const
export type SupportedTheme = typeof SUPPORTED_THEMES[number]

export const THEME_LABELS: Record<SupportedTheme, string> = {
  light: 'Sáng (Mặc định)',
  dark: 'Tối',
  green: 'Xanh lá',
  pink: 'Hồng',
}
