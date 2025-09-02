import React, { useEffect, useRef, useState } from 'react'
import {
  Box,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Typography,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Alert,
  Snackbar,
  Skeleton,
  CircularProgress,
  TextField,
  Stack,
} from '@mui/material'
import type { SelectChangeEvent } from '@mui/material/Select'
import Grid from '@mui/material/Grid'
import { listMedia, deleteMedia, renameMedia, type MediaItem } from '../api'
import { useMediaQuery, useTheme } from '@mui/material'

type FilterKind = 'all' | 'image' | 'video'
type SnackbarSeverity = 'success' | 'error'

//Avoid duplicate items if the user spams "Load more"
function removeDuplicatesById(items: MediaItem[]): MediaItem[] {
  const seen = new Set<string>()
  const result: MediaItem[] = []
  for (const item of items) {
    if (!seen.has(item.id)) {
      seen.add(item.id)
      result.push(item)
    }
  }
  return result
}

/*- Lists media with filter (All / Images / Videos) & server-driven pagination
  - Inline rename (keeps original filename intact on disk)
  - Delete with toast feedback
  - Shows skeletons while loading the first page */
export default function Gallery() {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [filterKind, setFilterKind] = useState<FilterKind>('all')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const [snackbarOpen, setSnackbarOpen] = useState(false)
  const [snackbarMessage, setSnackbarMessage] = useState('')
  const [snackbarSeverity, setSnackbarSeverity] = useState<SnackbarSeverity>('success')

  //inline rename state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState<string>('')
  const [isSavingName, setIsSavingName] = useState(false)

  //Prevent overlapping requests and React Strict Mode double effects
  const inFlightRef = useRef(false)

  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const pageSize = isMobile ? 2 : 8

  function openSnackbar(message: string, severity: SnackbarSeverity) {
    setSnackbarMessage(message)
    setSnackbarSeverity(severity)
    setSnackbarOpen(true)
  }

  async function fetchPage(reset: boolean) {
    if (inFlightRef.current) return
    inFlightRef.current = true

    //If there is no next page(no resetting), stop early
    if (!reset && nextCursor === null && mediaItems.length > 0) {
      inFlightRef.current = false
      return
    }

    setIsLoading(true)
    setErrorMessage(null)

    try {
      const cursorToUse = reset ? undefined : nextCursor ?? undefined
      const response = await listMedia(
        filterKind === 'all' ? undefined : filterKind,
        cursorToUse,
        pageSize
      )

      setMediaItems(prev =>
        reset ? response.items : removeDuplicatesById([...prev, ...response.items])
      )

      const noNewItems = response.items.length === 0
      const cursorDidNotAdvance = response.nextCursor !== undefined && response.nextCursor !== null && response.nextCursor === cursorToUse

      setNextCursor(noNewItems || cursorDidNotAdvance || !response.nextCursor ? null : response.nextCursor)
      
    } catch (error: any) {
      setErrorMessage(error?.message || 'Failed to load')
    } finally {
      setIsLoading(false)
      inFlightRef.current = false
    }
  }

  //first page fetch when filter or pageSize changes
  useEffect(() => {
    setMediaItems([])
    setNextCursor(null)
    inFlightRef.current = false
    fetchPage(true)
  }, [filterKind, pageSize])

  // Refresh the current filter after uploads finish
  useEffect(() => {
    const onUploadFinished = async () => {
      if (inFlightRef.current) return
      inFlightRef.current = true

      setIsLoading(true)
      setErrorMessage(null)

      try {
        const data = await listMedia(
          filterKind === 'all' ? undefined : filterKind,
          undefined,
          pageSize
        )
        setMediaItems(data.items)
        setNextCursor(data.nextCursor ?? null)
      } catch (error: any) {
        setErrorMessage(error?.message || 'Failed to load')
      } finally {
        setIsLoading(false)
        inFlightRef.current = false
      }
    }

    window.addEventListener('gallery:refresh', onUploadFinished)
    window.addEventListener('media:updated', onUploadFinished)
    
    return () => {
      window.removeEventListener('gallery:refresh', onUploadFinished)
      window.removeEventListener('media:updated', onUploadFinished)
    }
  }, [filterKind,pageSize])

  async function handleDelete(id: string) {
    try {
      await deleteMedia(id)
      setMediaItems(prev => prev.filter(item => item.id !== id))
      openSnackbar('Deleted', 'success')
    } catch (error: any) {
      setErrorMessage(error?.message || 'Delete failed')
      openSnackbar('Delete failed', 'error')
    }
  }

  function startEditing(item: MediaItem) {
    setEditingId(item.id)
    setEditingValue(item.displayName ?? item.originalName)
  }

  function cancelEditing() {
    setEditingId(null)
    setEditingValue('')
  }

  async function saveEditing() {
    if (!editingId) return
    try {
      setIsSavingName(true)
      const { item } = await renameMedia(editingId, editingValue.trim())
      setMediaItems(prev =>
        prev.map(i => (i.id === item.id ? { ...i, displayName: item.displayName } : i))
      )
      openSnackbar('Name updated', 'success')
      cancelEditing()
    } catch (error: any) {
      openSnackbar(error?.message || 'Rename failed', 'error')
    } finally {
      setIsSavingName(false)
    }
  }

  const showSkeletons = isLoading && mediaItems.length === 0
  const skeletonArray = Array.from({ length: pageSize })

  return (
    <section aria-labelledby="gallery-title">
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Typography id="gallery-title" variant="h4">Gallery</Typography>

        <FormControl size="small" sx={{ minWidth: 160, mt: 1 }}>
          <InputLabel id="gallery-filter-label">Filter by</InputLabel>
          <Select
            labelId="gallery-filter-label"
            id="gallery-filter"
            label="Filter by"
            value={filterKind}
            onChange={(event: SelectChangeEvent) =>
              setFilterKind(event.target.value as FilterKind)
            }
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="image">Images</MenuItem>
            <MenuItem value="video">Videos</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {errorMessage && (
        <Box sx={{ mt: 2 }}>
          <Alert severity="error" sx={{ mb: 1 }}>{errorMessage}</Alert>
          <Button variant="outlined" onClick={() => fetchPage(true)} className="btn">Retry</Button>
        </Box>
      )}

      {mediaItems.length === 0 && !isLoading && !errorMessage && (
        <Typography color="text.secondary" sx={{ mt: 2 }}>
          No media yet — upload something to get started.
        </Typography>
      )}

      <Grid container spacing={2} sx={{ mt: 1 }} columns={{ xs: 12, sm: 12, md: 12, lg: 12 }}>
        {showSkeletons &&
          skeletonArray.map((_, index) => (
            <Grid key={index} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
              <Card className="card-hover">
                <Skeleton variant="rectangular" height={180} />
                <Box sx={{ p: 1.5 }}>
                  <Skeleton width="60%" />
                </Box>
              </Card>
            </Grid>
          ))}

        {!showSkeletons && mediaItems.map(item => {
            const displayName = item.displayName ?? item.originalName
            const isEditingThis = editingId === item.id

            return (
              <Grid key={item.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                <Card className="card-hover" variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  {item.kind === 'image' ? (
                    <CardMedia
                      component="img"
                      image={item.url}
                      alt={displayName}
                      loading="lazy"
                      sx={{ maxHeight: '170px', objectFit: 'contain', bgcolor: 'grey.50' }}
                    />
                  ) : (
                    <CardMedia sx={{ position: 'relative', bgcolor: 'grey.50' }}>
                      <video
                        src={item.url}
                        controls
                        preload="metadata"
                        style={{ width: '100%', height: 170, objectFit: 'cover', display: 'block' }}
                      />
                    </CardMedia>
                  )}

                  <CardContent sx={{ flexGrow: 1, pt: '8px', px: '8px', pb: 0 }}>
                    {!isEditingThis ? (
                      <Typography variant="body2" noWrap title={displayName}>{displayName}</Typography>
                    ) : (
                      <Stack direction="row" spacing={1} alignItems="center">
                        <TextField
                          size="small"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEditing()
                            if (e.key === 'Escape') cancelEditing()
                          }}
                          autoFocus
                          inputProps={{ maxLength: 120 }}
                          sx={{ flex: 1 }}
                        />
                        <Button
                          variant="contained"
                          size="small"
                          onClick={saveEditing}
                          disabled={isSavingName || editingValue.trim() === ''}
                        >
                          {isSavingName ? 'Saving…' : 'Save'}
                        </Button>
                        <Button variant="text" size="small" onClick={cancelEditing}>
                          Cancel
                        </Button>
                      </Stack>
                    )}
                  </CardContent>

                  <CardActions sx={{ justifyContent: 'space-between' ,p: 0}}>
                    <IconButton
                      className="icon-btn focus-ring"
                      aria-label={`Edit name for ${displayName}`}
                      title="Edit name"
                      onClick={() => (isEditingThis ? cancelEditing() : startEditing(item))}
                    >
                      <span aria-hidden="true" style={{ fontSize: 16, lineHeight: 1 }}>✎</span>
                    </IconButton>

                    <IconButton
                      className="icon-btn focus-ring"
                      aria-label={`Removed ${displayName}`}
                      title="Remove"
                      onClick={() => handleDelete(item.id)}
                    >
                      <span aria-hidden="true" style={{ fontSize: 16, lineHeight: 1 }}>✕</span>
                    </IconButton>
                  </CardActions>
                </Card>
              </Grid>
            )
          })}
      </Grid>

      <Box sx={{ marginTop: '16px', display: 'flex', justifyContent: 'center' }}>
        {nextCursor && (
          <Button
            variant="outlined"
            onClick={() => fetchPage(false)}
            disabled={isLoading}
            className="btn focus-ring"
            startIcon={isLoading ? <CircularProgress size={16} /> : undefined}>
            {isLoading ? 'Loading…' : 'Load more'}
          </Button>
        )}
        {!nextCursor && mediaItems.length > 0 && (
          <Typography color="text.secondary">End of results</Typography>
        )}
      </Box>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={2500}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>

        <Alert onClose={() => setSnackbarOpen(false)} severity={snackbarSeverity} variant="filled" sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>

      </Snackbar>
    </section>
  )
}
