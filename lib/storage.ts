import { AwsClient } from 'aws4fetch'

// Cloudflare R2 (S3-compatible) per storage immagini PERSISTENTE.
// Senza queste env il sistema usa il disco locale (effimero, solo dev).
// Env richieste su Render:
//   R2_ACCOUNT_ID        — id account Cloudflare
//   R2_ACCESS_KEY_ID     — token R2 (S3 API)
//   R2_SECRET_ACCESS_KEY — secret R2
//   R2_BUCKET            — nome bucket
//   R2_PUBLIC_URL        — URL pubblico bucket (es. https://pub-xxxx.r2.dev o dominio custom)
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID?.trim()
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID?.trim()
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY?.trim()
const R2_BUCKET = process.env.R2_BUCKET?.trim()
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL?.trim().replace(/\/$/, '')

export function isR2Configured(): boolean {
  return Boolean(
    R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET && R2_PUBLIC_URL,
  )
}

/**
 * Carica i byte su R2 e ritorna l'URL pubblico permanente.
 * Lancia se R2 non è configurato o l'upload fallisce.
 */
export async function uploadToR2(
  key: string,
  bytes: Buffer | Uint8Array,
  contentType: string,
): Promise<string> {
  if (!isR2Configured()) throw new Error('R2 non configurato')

  const client = new AwsClient({
    accessKeyId: R2_ACCESS_KEY_ID!,
    secretAccessKey: R2_SECRET_ACCESS_KEY!,
    region: 'auto',
    service: 's3',
  })

  const endpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET}/${key}`
  const res = await client.fetch(endpoint, {
    method: 'PUT',
    // Uint8Array è un BodyInit valido a runtime (undici); cast per i tipi DOM.
    body: new Uint8Array(bytes) as unknown as BodyInit,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`R2 upload fallito: ${res.status} ${text.slice(0, 200)}`)
  }

  return `${R2_PUBLIC_URL}/${key}`
}
