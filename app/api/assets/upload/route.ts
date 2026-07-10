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
const MAX_IMAGE_FILE_SIZE = 8 * 1024 * 1024
const MAX_VIDEO_FILE_SIZE = 100 * 1024 * 1024
const ALLOWED_IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'])
const ALLOWED_VIDEO_MIME = new Set(['video/mp4'])

function mediaKind(mime: string) {
  if (ALLOWED_VIDEO_MIME.has(mime)) return 'video'
  if (ALLOWED_IMAGE_MIME.has(mime)) return 'image'
  return null
}

function safeFilename(name: string) {
  const ext = path.extname(name).toLowerCase() || '.jpg'
  const base = path.basename(name, ext)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'asset'
  // Suffisso random ad alta entropia (80 bit): il nome file è parte della
  // "capability URL" con cui /api/assets/file serve l'asset senza login (Blotato e
  // i link preview pubblici devono poterlo leggere). Un suffisso corto sarebbe
  // indovinabile; qui + il clienteId (UUID) rendono l'URL di fatto non enumerabile.
  const token = randomUUID().replace(/-/g, '').slice(0, 20)
  return `${base}-${token}${ext}`
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
    if (files.length > MAX_FILES) return NextResponse.json({ error: `Massimo ${MAX_FILES} media per contenuto` }, { status: 400 })

    // Storage persistente (S3-compatible) se configurato, altrimenti disco locale
    // (effimero, solo dev). Il proxy /api/assets/file serve i file dei bucket privati.
    const useStorage = isStorageConfigured()
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', clienteId)
    if (!useStorage) await mkdir(uploadDir, { recursive: true })

    const uploaded = []
    const skipped: { name: string; motivo: string }[] = []
    for (const file of files) {
      const kind = mediaKind(file.type)
      if (!kind) {
        const isHeic = /heic|heif/i.test(`${file.type} ${file.name}`)
        skipped.push({ name: file.name, motivo: isHeic ? 'formato HEIC iPhone non supportato — converti in JPG' : `formato non supportato (${file.type || 'sconosciuto'})` })
        continue
      }
      if (kind === 'video' && path.extname(file.name).toLowerCase() !== '.mp4') {
        skipped.push({ name: file.name, motivo: 'video: supportato solo .mp4' })
        continue
      }
      const maxSize = kind === 'video' ? MAX_VIDEO_FILE_SIZE : MAX_IMAGE_FILE_SIZE
      if (file.size > maxSize) {
        const maxMb = Math.round(maxSize / 1024 / 1024)
        skipped.push({ name: file.name, motivo: `supera ${maxMb}MB` })
        continue
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
        kind,
        size: file.size,
        source: 'upload',
        storage: useStorage ? 'storage' : 'local',
      })
    }

    // Successo parziale: i file validi vengono caricati, quelli scartati sono
    // riportati in `skipped`. Prima un solo file HEIC / troppo grande faceva
    // fallire TUTTO il caricamento multiplo → sembrava "il multi-upload non funziona".
    if (!uploaded.length) {
      return NextResponse.json(
        { error: `Nessun file caricato. ${skipped.map(s => `${s.name}: ${s.motivo}`).join(' · ')}`, skipped },
        { status: 400 },
      )
    }
    return NextResponse.json({ ok: true, assets: uploaded, skipped, storage: useStorage ? 'storage' : 'local' })
  } catch (e) {
    return apiError(e)
  }
}
