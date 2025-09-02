import React from 'react'
import { ThemeProvider, CssBaseline, Container ,Box} from '@mui/material'
import { buildTheme, type ColorScheme } from './theme'
import Header from './components/Header'
import UploadArea from './components/UploadArea'
import Gallery from './components/Gallery'
import './styles/ui.css'

export default function App() {
  const [mode, setMode] = React.useState<ColorScheme>(() => {
    const stored = window.localStorage.getItem('color-scheme')
    return (stored === 'dark' || stored === 'light') ? stored : 'light'
  })

  const theme = React.useMemo(() => buildTheme(mode), [mode])

  function toggleMode() {
    setMode(prev => {
      const next = prev === 'light' ? 'dark' : 'light'
      window.localStorage.setItem('color-scheme', next)
      return next
    })
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth={false} disableGutters sx={{ paddingTop: '0px', paddingBottom: '12px' }}>
        <Box sx={{ px: 2, maxWidth: 1600, mx: 'auto' }}><Header mode={mode} onToggleMode={toggleMode} /></Box>
        <Box sx={{ maxWidth: 900, mx: 'auto', px: 2 }}><UploadArea /></Box>
       <Box sx={{ px: 2, maxWidth: 1600, mx: 'auto' }}><Gallery /></Box>
      </Container>
    </ThemeProvider>
  )
}
