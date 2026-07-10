import { readFile, stat } from 'fs/promises'
import path from 'path'
import { NextResponse } from 'next/server'
import { isStorageConfigured, hasPublicStorageUrl, downloadFromStorage } from '@/lib/storage'

export const runtime = 'nodejs'

// SICUREZZA — lettura PUBBLICA by-design (capability URL).
// Questo proxy serve i media anche da bucket privato SENZA sessione, ed è
// intenzionale: Blotato (publisher esterno) e i link preview/approvazione
// condivisi col cliente (senza login) devono poter caricare l'immagine. Gli URL
// firmati a scadenza non vanno bene: i post schedulati pubblicano giorni dopo, il
// link scadrebbe. La protezione è la NON-enumerabilità dell'URL: clienteId (UUID)
// + filename con suffisso random ad alta entropia (vedi safeFilename in
// assets/upload). Non aggiungere auth qui senza rompere pubblicazione e preview.

const MIME_BY_EXT: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
  '.mp4': 'video/mp4',
}

function safeSegment(value: string) {
  // Rifiuta i segmenti composti solo da punti ('.', '..', …): difesa-in-profondità
  // contro path-traversal (il set [._-] da solo ammetteva '..').
  if (/^\.+$/.test(value)) return ''
  return /^[a-zA-Z0-9._-]+$/.test(value) ? value : ''
}

function bytesResponse(bytes: Buffer, contentType: string, request: Request) {
  const range = request.headers.get('range')
  const commonHeaders = {
    'Content-Type': contentType,
    'Cache-Control': 'public, max-age=31536000, immutable',
    'Accept-Ranges': 'bytes',
  }

  if (!range) {
    return new NextResponse(bytes as unknown as BodyInit, {
      headers: {
        ...commonHeaders,
        'Content-Length': String(bytes.length),
      },
    })
  }

  const match = range.match(/^bytes=(\d*)-(\d*)$/)
  if (!match) {
    return new NextResponse(null, {
      status: 416,
      headers: {
        ...commonHeaders,
        'Content-Range': `bytes */${bytes.length}`,
      },
    })
  }

  const suffixRange = !match[1] && Boolean(match[2])
  const suffixLength = suffixRange ? Number(match[2]) : 0
  const start = suffixRange ? Math.max(bytes.length - suffixLength, 0) : Number(match[1] || 0)
  const end = suffixRange ? bytes.length - 1 : match[2] ? Math.min(Number(match[2]), bytes.length - 1) : bytes.length - 1
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= bytes.length) {
    return new NextResponse(null, {
      status: 416,
      headers: {
        ...commonHeaders,
        'Content-Range': `bytes */${bytes.length}`,
      },
    })
  }

  const chunk = bytes.subarray(start, end + 1)
  return new NextResponse(chunk as unknown as BodyInit, {
    status: 206,
    headers: {
      ...commonHeaders,
      'Content-Length': String(chunk.length),
      'Content-Range': `bytes ${start}-${end}/${bytes.length}`,
    },
  })
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ clienteId: string; filename: string }> },
) {
  const { clienteId, filename } = await params
  const safeClienteId = safeSegment(clienteId)
  const safeFilename = safeSegment(filename)
  if (!safeClienteId || !safeFilename) {
    return NextResponse.json({ error: 'asset non valido' }, { status: 400 })
  }

  const ext = path.extname(safeFilename).toLowerCase()

  // Bucket PRIVATO (storage configurato senza URL pubblico): scarica da S3 e streama.
  // Se il bucket è pubblico gli URL puntano già al provider e questo proxy non è usato.
  if (isStorageConfigured() && !hasPublicStorageUrl()) {
    const key = `uploads/${safeClienteId}/${safeFilename}`
    const obj = await downloadFromStorage(key)
    if (obj) {
      return bytesResponse(obj.bytes, MIME_BY_EXT[ext] || obj.contentType, request)
    }
    return NextResponse.json({ error: 'asset non trovato' }, { status: 404 })
  }

  // Disco locale (dev).
  const filePath = path.join(process.cwd(), 'public', 'uploads', safeClienteId, safeFilename)
  try {
    const info = await stat(filePath)
    if (!info.isFile()) return NextResponse.json({ error: 'asset non trovato' }, { status: 404 })
    const bytes = await readFile(filePath)
    return bytesResponse(bytes, MIME_BY_EXT[ext] || 'application/octet-stream', request)
  } catch {
    return NextResponse.json({ error: 'asset non trovato' }, { status: 404 })
  }
}
