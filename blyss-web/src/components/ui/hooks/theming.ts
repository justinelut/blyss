export function getThemePreset(theme: string | undefined): 'light' | 'dark' {
  return theme === 'dark' ? 'dark' : 'light'
}
