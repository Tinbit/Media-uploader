import React from 'react'
import { AppBar, Toolbar, Typography, Switch, FormControlLabel, Box , useTheme} from '@mui/material'

type HeaderProps = {
  mode: 'light' | 'dark'
  onToggleMode: () => void
}

export default function Header({ mode, onToggleMode }: HeaderProps) {
  const theme = useTheme()
  const gradient = `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`

  return (
    <AppBar position="static" color="transparent" elevation={0} sx={{ marginBottom: '12px' }}>
      <Toolbar sx={{ px: 0 , paddingLeft: '0 !important;'}}>
        <Typography variant="h6" sx={{
            flexGrow: 1,
            fontWeight: 800,
            letterSpacing: '0.1px',
            lineHeight: 1.2,
            background: gradient,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
            textShadow: '0 1px 0 rgba(0,0,0,0.06)',
          }}>Media Uploader</Typography>

        <Box>
          <FormControlLabel
            control={<Switch checked={mode === 'dark'} onChange={onToggleMode} />}
            label={mode === 'light' ? 'Light' : 'Dark'}
            sx={{ marginRight: { xs: '0px', sm: '-8px', md: '-16px'} }}/>
        </Box>
      </Toolbar>
    </AppBar>
  )
}
