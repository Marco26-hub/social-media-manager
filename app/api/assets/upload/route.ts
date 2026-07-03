import { randomUUID } from 'crypto'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { NextResponse } from 'next/server'
import { requireAuth, requireClienteAccess } from '@/lib/auth-utils'
import { getPublicBaseUrl } from '@/lib/base-url'
import { apiError } from '@/lib/api-error'
import { isStorageConfigured, uploadToStorage } from '@/lib/storage'

export const runtime = 'nodejs'

const MAX_FILES = 14
const MAX_FILE_SIZE = 8 * 1024 * 1024
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'])

function safeFilename(name: string) {
  const ext = path.extname(name).toLowerCase() || '.jpg'
  const base = path.basename(name, ext)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'asset'
  return `${base}-${randomUUID().slice(0, 8)}${ext}`
}

export async function POST(request: Request) {
  try {
    await requireAuth()
    const form = await request.formData()
    const clienteId = String(form.get('cliente_id') || '')
    if (!clienteId) return NextResponse.json({ error: 'cliente_id richiesto' }, { status: 400 })
    await requireClienteAccess(clienteId)

    const files = form.getAll('files').filter((item): item is File => item instanceof File)
    if (!files.length) return NextResponse.json({ error: 'Nessun file ricevuto' }, { status: 400 })
    if (files.length > MAX_FILES) return NextResponse.json({ error: `Massimo ${MAX_FILES} immagini per contenuto` }, { status: 400 })

    // Storage persistente (S3-compatible) se configurato, altrimenti disco locale
    // (effimero, solo dev). Il proxy /api/assets/file serve i file dei bucket privati.
    const useStorage = isStorageConfigured()
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', clienteId)
    if (!useStorage) await mkdir(uploadDir, { recursive: true })

    const uploaded = []
    for (const file of files) {
      if (!ALLOWED_MIME.has(file.type)) {
        return NextResponse.json({ error: `Formato non supportato: ${file.type || file.name}` }, { status: 400 })
      }
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: `${file.name} supera 8MB` }, { status: 400 })
      }

      const filename = safeFilename(file.name)
      const bytes = Buffer.from(await file.arrayBuffer())
      const proxyPath = `/api/assets/file/${encodeURIComponent(clienteId)}/${encodeURIComponent(filename)}`

      let url: string
      let pathname: string
      if (useStorage) {
        // Upload su bucket persistente. Se pubblico → URL diretto; se privato → null,
        // e serviamo via proxy /api/assets/file (che scarica da storage con le credenziali).
        const key = `uploads/${clienteId}/${filename}`
        const directUrl = await uploadToStorage(key, bytes, file.type || 'application/octet-stream')
        if (directUrl) {
          url = directUrl
          pathname = directUrl
        } else {
          pathname = proxyPath
          url = `${getPublicBaseUrl(request)}${pathname}`
        }
      } else {
        const diskPath = path.join(uploadDir, filename)
        await writeFile(diskPath, bytes)
        pathname = proxyPath
        url = `${getPublicBaseUrl(request)}${pathname}`
      }

      uploaded.push({
        name: file.name,
        url,
        path: pathname,
        mime: file.type,
        size: file.size,
        source: 'upload',
        storage: useStorage ? 'storage' : 'local',
      })
    }

    return NextResponse.json({ ok: true, assets: uploaded, storage: useStorage ? 'storage' : 'local' })
  } catch (e) {
    return apiError(e)
  }
}
