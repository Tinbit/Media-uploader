import { createTheme, responsiveFontSizes } from '@mui/material/styles'

export type ColorScheme = 'light' | 'dark'

export function buildTheme(mode: ColorScheme) {
  let theme = createTheme({
    palette: {
      mode,
      primary: { main: mode === 'light' ? '#1976d2' : '#90caf9' },
      background: {
        default: mode === 'light' ? '#fafafa' : '#0f1115',
        paper: mode === 'light' ? '#ffffff' : '#151922',
      },
    },
    shape: { borderRadius: 12 },
    typography: {
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
      h6: { fontWeight: 600 },
      body2: { fontSize: 14 },
    },
    components: {
      MuiButton: { styleOverrides: { root: { textTransform: 'none', borderRadius: 10 } } },
      MuiCard: { styleOverrides: { root: { borderRadius: 14 } } },
    },
  })

  theme = responsiveFontSizes(theme)
  return theme
}
