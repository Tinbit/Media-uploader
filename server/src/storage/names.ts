import fs from 'fs'
import path from 'path'
import { UPLOAD_DIR } from './disk.js'

const NAMES_FILE = path.join(UPLOAD_DIR, 'names.json')

type NamesMap = Record<string, string>

/** Make sure the file exists; return parsed map or empty object. */
function readNamesFile(): NamesMap {
  try {
    if (!fs.existsSync(NAMES_FILE)) {
      fs.writeFileSync(NAMES_FILE, JSON.stringify({}, null, 2), 'utf8')
      return {}
    }
    const raw = fs.readFileSync(NAMES_FILE, 'utf8')
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') return parsed as NamesMap
    return {}
  } catch {
    return {}
  }
}

function writeNamesFile(map: NamesMap) {
  fs.writeFileSync(NAMES_FILE, JSON.stringify(map, null, 2), 'utf8')
}

/** Public: get a shallow copy of the current map. */
export function getAllDisplayNames(): NamesMap {
  return { ...readNamesFile() }
}

/** Public: get a single display name if set. */
export function getDisplayName(id: string): string | undefined {
  const map = readNamesFile()
  return map[id]
}

/** Public: set or clear a display name. Returns the value stored (or undefined if cleared). */
export function setDisplayName(id: string, rawName: string | null | undefined): string | undefined {
  const map = readNamesFile()

  // If empty/null  clear it
  if (rawName == null || String(rawName).trim() === '') {
    if (id in map) {
      delete map[id]
      writeNamesFile(map)
    }
    return undefined
  }

  // Normalize + validate
  let name = String(rawName).normalize('NFC').trim()

  // Remove control characters and slashes (avoid any odd rendering or path confusion)
  name = name.replace(/[\u0000-\u001F\u007F]/g, '').replace(/[\\\/]/g, '')

  // Clamp length to something reasonable
  const MAX = 120
  if (name.length > MAX) name = name.slice(0, MAX)

  map[id] = name
  writeNamesFile(map)
  return name
}
