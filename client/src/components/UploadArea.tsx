import React, { useRef, useState } from 'react'
import {
  Box,
  Paper,
  Stack,
  Typography,
  Button,
  LinearProgress,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  Chip,
  IconButton,
} from '@mui/material'
import ImageIcon from '@mui/icons-material/Image'
import MovieIcon from '@mui/icons-material/Movie'
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile'
import { useMediaQuery, useTheme } from '@mui/material'

//purely client-side upload row status in the UI list( the server just returns success/error per file)
type UploadStatus = 'pending' | 'uploading' | 'done' | 'error'


type FileUploadProgress = {
  id: string
  file: File
  progress: number
  status: UploadStatus
  error?: string
}

/*- Accessible drag & drop & button to open the file picker
  - Shows per-file progress and status
  - Announces progress to screen readers via an ARIA live region
  - After success, emits a window event so the Gallery refreshes
  - Allows dismissingfinished or failed row, without refreshing page */

export default function UploadArea() {
  const [uploadItems, setUploadItems] = useState<FileUploadProgress[]>([])
  const [isDraggingOver, setIsDraggingOver] = useState(false)

  const dropZoneRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const liveRegionRef = useRef<HTMLDivElement>(null)
  const openGuardRef = useRef(false)  //For preventing accidental double open on some browsers

  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  function safeOpenPicker() {
    if (openGuardRef.current) return
    openGuardRef.current = true
    fileInputRef.current?.click()
    setTimeout(() => { openGuardRef.current = false }, 300)
  }

  function onFilesSelected(selectedFiles: FileList | null) {
    if (!selectedFiles || selectedFiles.length === 0) return

    //Create UI rows first so the user gets instant feedback
    const newRows: FileUploadProgress[] = Array.from(selectedFiles).map((file) => ({
      id: (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)),
      file,
      progress: 0,
      status: 'pending',
    }))

    setUploadItems((previous) => [...newRows, ...previous])
    uploadSelectedFiles(selectedFiles, newRows)
  }

  //Uses XMLHttpRequest (not fetch) to track upload progress.Sends the entire batch as a single multipart POST so all rows update together
  function uploadSelectedFiles(selectedFiles: FileList, newRows: FileUploadProgress[]) {
    const batchIds = newRows.map((row) => row.id)
    const batchIdSet = new Set(batchIds)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/media/upload')

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return
      const percent = Math.round((event.loaded / event.total) * 100)

      setUploadItems((previous) =>
        previous.map((row) =>
          batchIdSet.has(row.id) ? { ...row, progress: percent, status: 'uploading' } : row
        )
      )
      if (liveRegionRef.current) liveRegionRef.current.textContent = `Uploading… ${percent}%`
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const payload = JSON.parse(xhr.responseText)
        const results = (payload?.results ?? []) as Array<{ ok: boolean; error?: string }>

        setUploadItems((previous) =>
          previous.map((row) => {
            const index = batchIds.indexOf(row.id)
            if (index === -1) return row
            const result = results[index]
            return result && result.ok
              ? { ...row, progress: 100, status: 'done' }
              : { ...row, status: 'error', error: result?.error || 'Upload failed' }
          })
        )

        if (liveRegionRef.current) liveRegionRef.current.textContent = 'Upload complete'

        //Signal the Gallery to refresh the current filter
        window.dispatchEvent(new CustomEvent('gallery:refresh'))
      } else {
        setUploadItems((previous) =>
          previous.map((row) =>
            batchIdSet.has(row.id) ? { ...row, status: 'error', error: 'Upload failed' } : row
          )
        )
        if (liveRegionRef.current) liveRegionRef.current.textContent = 'Upload failed'
      }
    }

    xhr.onerror = () => {
      setUploadItems((previous) =>
        previous.map((row) =>
          batchIdSet.has(row.id) ? { ...row, status: 'error', error: 'Network error' } : row
        )
      )
      if (liveRegionRef.current) liveRegionRef.current.textContent = 'Upload failed'
    }

    const formData = new FormData()
    Array.from(selectedFiles).forEach((file) => formData.append('files', file))
    xhr.send(formData)
  }

  function onDrop(event: React.DragEvent) {
    event.preventDefault()
    setIsDraggingOver(false)
    onFilesSelected(event.dataTransfer.files)
  }

  function pickIcon(mime: string) {
    if (mime.startsWith('image/')) return <ImageIcon />
    if (mime.startsWith('video/')) return <MovieIcon />
    return <InsertDriveFileIcon />
  }

  function dismissRow(id: string) {
    setUploadItems((previous) => previous.filter((row) => row.id !== id))
  }

  return (
    <section aria-labelledby="uploader-title">
      <Typography id="uploader-title" variant="h6" sx={{ mb: 1 }}>
        Upload
      </Typography>

      <Paper
        ref={dropZoneRef}
        variant="outlined"
        role={isMobile ? undefined : 'button'}
        tabIndex={isMobile ? -1 : 0}
        onKeyDown={isMobile ? undefined : (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            safeOpenPicker()
          }
        }}
        onClick={(event) => {
          if (isMobile) return
          if (event.currentTarget !== event.target) return
          safeOpenPicker()
        }}
        onDragOver={isMobile ? undefined : (e) => { e.preventDefault(); setIsDraggingOver(true) }}
        onDragLeave={isMobile ? undefined : () => setIsDraggingOver(false)}
        onDrop={isMobile ? undefined : onDrop}
        aria-label="Upload files"
        sx={{
          p: '12px',
          textAlign: 'center',
          borderStyle: isMobile ? 'solid' : 'dashed',
          bgcolor: !isMobile && isDraggingOver ? 'action.hover' : 'background.paper',
          cursor: isMobile ? 'default' : 'pointer'
        }}
      >
        <Stack spacing={1} alignItems="center">
          {!isMobile ? (
              <>
                <Typography fontWeight={600}>Drag & drop</Typography>
                <Typography variant="body2" color="text.secondary">…or click choose files button</Typography>
              </>
            ) : (
              <>
                <Typography variant="body2" color="text.secondary">Tap the button to choose files</Typography>
              </>
            )}
            <Button
                className="btn"
                variant="contained"
                onClick={(e) => {
                  e.stopPropagation()
                  safeOpenPicker()
                }}
                sx={{ display: 'inline-flex' }}>Choose files</Button>
              <Typography variant="caption" color="text.secondary">Accepted: images & videos</Typography>
        </Stack>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          hidden
          onChange={(e) => {
            onFilesSelected(e.target.files)
            //Reset value so picking the same file again still triggers onChange
            e.currentTarget.value = ''
          }}
        />
      </Paper>

      <div
        aria-live="polite"
        aria-atomic="true"
        ref={liveRegionRef}
        style={{ position: 'absolute', left: -99999, top: 'auto', width: 1, height: 1, overflow: 'hidden' }}/>

      {uploadItems.length > 0 && (
        <List sx={{ mt: 2 }}>
          {uploadItems.map((row) => {
            const canDismiss = row.status === 'done' || row.status === 'error'
            return (
              <ListItem
                key={row.id}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  mb: 1,
                  alignItems: 'flex-start',
                  gap: 1,
                }}>
                <ListItemAvatar>
                  <Avatar variant="rounded">{pickIcon(row.file.type)}</Avatar>
                </ListItemAvatar>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2" noWrap title={row.file.name} sx={{ maxWidth: 280 }}>
                      {row.file.name}
                    </Typography>
                    {row.status === 'done' && <Chip size="small" label="Done"  color="success" />}
                    {row.status === 'error' && <Chip size="small" label={row.error || 'Error'} color="error" />}
                  </Stack>

                  <Box sx={{ mt: 1 }}>
                    <LinearProgress variant="determinate" value={row.progress} aria-label="progress" />
                    <Typography variant="caption" color="text.secondary">
                      {row.status === 'pending' && 'Queued'}
                      {row.status === 'uploading' && `Uploading… ${row.progress}%`}
                      {row.status === 'done' && 'Complete'}
                      {row.status === 'error' && (row.error || 'Error')}
                    </Typography>
                  </Box>
                </Box>

                <IconButton
                  className="icon-btn focus-ring"
                  aria-label={canDismiss ? `Dismiss ${row.file.name}` : 'Dismiss disabled while uploading'}
                  title={canDismiss ? 'Dismiss' : 'Dismiss (disabled while uploading)'}
                  onClick={() => canDismiss && dismissRow(row.id)}
                  disabled={!canDismiss}
                  edge="end">
                  <span aria-hidden="true" style={{ fontSize: 14, lineHeight: 1 }}>✕</span>
                </IconButton>
              </ListItem>
            )
          })}
        </List>
      )}
    </section>
  )
}