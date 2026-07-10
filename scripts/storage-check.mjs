#!/usr/bin/env node
// Debug storage S3-compatible (Cloudflare R2 / Backblaze B2 / MinIO).
// Fa un round-trip REALE: PUT -> GET -> (verifica byte) -> DELETE, così scopre gli
// errori che il check "config presente" non vede: region sbagliata
// (SignatureDoesNotMatch), endpoint errato, bucket inesistente, permessi mancanti,
// 411 MissingContentLength su B2.
//
// Uso:
//   node scripts/storage-check.mjs
// Legge le env da (in ordine): process.env, poi .env.local, poi
// .env.render.production.local. Su Render gira con le env già nell'ambiente.
import { readFileSync } from 'node:fs'
import { AwsClient } from 'aws4fetch'

function loadEnvFile(path) {
  try {
    for (const raw of readFileSync(path, 'utf8').split('\n')) {
      const line = raw.trim()
      if (!line || line.startsWith('#')) continue
      const eq = line.indexOf('=')
      if (eq < 0) continue
      const k = line.slice(0, eq).trim()
      let v = line.slice(eq + 1).trim()
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
      if (!(k in process.env)) process.env[k] = v
    }
  } catch { /* file assente: ok */ }
}
loadEnvFile('.env.local')
loadEnvFile('.env.render.production.local')

const ENDPOINT = process.env.STORAGE_ENDPOINT?.trim().replace(/\/$/, '')
const KEY_ID = process.env.STORAGE_ACCESS_KEY_ID?.trim()
const SECRET = process.env.STORAGE_SECRET_ACCESS_KEY?.trim()
const BUCKET = process.env.STORAGE_BUCKET?.trim()
const PUBLIC_URL = process.env.STORAGE_PUBLIC_URL?.trim().replace(/\/$/, '')
const REGION = process.env.STORAGE_REGION?.trim() || 'auto'

function mask(v) { return v ? `[set ${v.length} chars]` : '[MISSING]' }
console.log('— Config —')
console.log('  STORAGE_ENDPOINT      :', ENDPOINT || '[MISSING]')
console.log('  STORAGE_BUCKET        :', BUCKET || '[MISSING]')
console.log('  STORAGE_REGION        :', REGION)
console.log('  STORAGE_ACCESS_KEY_ID :', mask(KEY_ID))
console.log('  STORAGE_SECRET_ACCESS :', mask(SECRET))
console.log('  STORAGE_PUBLIC_URL    :', PUBLIC_URL || '[assente -> modalità proxy privato]')

// Coerenza region/endpoint per Backblaze B2 (causa classica di SignatureDoesNotMatch).
if (ENDPOINT && /backblazeb2\.com/.test(ENDPOINT)) {
  const m = ENDPOINT.match(/s3\.([a-z]+-[a-z]+-\d+)\.backblazeb2\.com/)
  if (m && REGION !== m[1]) {
    console.log(`  ⚠️  B2: endpoint region=${m[1]} ma STORAGE_REGION=${REGION} -> firma FALLIRÀ. Devono coincidere.`)
  }
}

if (!ENDPOINT || !KEY_ID || !SECRET || !BUCKET) {
  console.log('\n❌ Storage NON configurato in questo ambiente (mancano env sopra).')
  console.log('   Per testare il bucket reale: metti le STORAGE_* in .env.local e rilancia,')
  console.log('   oppure esegui questo script nella shell di Render (env già presenti).')
  process.exit(2)
}

const client = new AwsClient({ accessKeyId: KEY_ID, secretAccessKey: SECRET, region: REGION, service: 's3' })
const key = `uploads/_healthcheck/storage-check-${Date.now()}.txt`
const url = `${ENDPOINT}/${BUCKET}/${key}`
const payload = Buffer.from(`storage-check ${new Date().toISOString()}`)

async function step(label, fn) {
  process.stdout.write(`  ${label} ... `)
  try { const r = await fn(); console.log('OK', r || ''); return true }
  catch (e) { console.log('FAIL\n     ', e.message); return false }
}

console.log('\n— Round-trip —')
let ok = true
ok = await step('PUT   ', async () => {
  const res = await client.fetch(url, { method: 'PUT', body: new Uint8Array(payload), headers: { 'Content-Type': 'text/plain', 'Content-Length': String(payload.length) } })
  if (!res.ok) throw new Error(`HTTP ${res.status} ${(await res.text()).slice(0, 300)}`)
  return `(${payload.length}B)`
}) && ok

let getOk = false
if (ok) getOk = await step('GET   ', async () => {
  const res = await client.fetch(url, { method: 'GET' })
  if (!res.ok) throw new Error(`HTTP ${res.status} ${(await res.text()).slice(0, 300)}`)
  const back = Buffer.from(await res.arrayBuffer())
  if (!back.equals(payload)) throw new Error(`byte mismatch: got ${back.length}B`)
  return '(byte identici)'
})

if (ok && getOk && PUBLIC_URL) {
  await step('PUBLIC', async () => {
    const res = await fetch(`${PUBLIC_URL}/${key}`)
    if (!res.ok) throw new Error(`HTTP ${res.status} — STORAGE_PUBLIC_URL non serve l'oggetto (bucket non pubblico?)`)
    return `(${PUBLIC_URL}/${key})`
  })
}

if (ok) await step('DELETE', async () => {
  const res = await client.fetch(url, { method: 'DELETE' })
  if (!res.ok && res.status !== 404) throw new Error(`HTTP ${res.status} ${(await res.text()).slice(0, 200)}`)
  return '(cleanup)'
})

console.log(ok && getOk
  ? '\n✅ Storage FUNZIONA (upload+download reali riusciti).' + (PUBLIC_URL ? '' : ' Modalità proxy privato: le immagini passano da /api/assets/file.')
  : '\n❌ Storage NON funziona: vedi l\'errore sopra (spesso region/endpoint non coincidenti o permessi bucket).')
process.exit(ok && getOk ? 0 : 1)
