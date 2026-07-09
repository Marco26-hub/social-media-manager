import { lookup } from 'node:dns/promises'

type MediaCheck = {
  url: string
  index: number
  reachable: boolean
  contentType: string | null
  error: string | null
}

export type MediaValidationResult = {
  ok: boolean
  checks: MediaCheck[]
  errors: { index: number; url: string; reason: string }[]
}

const ALLOWED_IMAGE = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
const ALLOWED_VIDEO = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo']

// Controlla se un IP (v4 o v6) è privato/loopback/link-local/metadata.
function isPrivateIp(ip: string): boolean {
  const addr = ip.toLowerCase().replace(/^\[|\]$/g, '').replace(/%.*$/, '') // strip brackets + zone id
  // IPv6
  if (addr === '::1' || addr === '::') return true
  if (addr.startsWith('fe80:')) return true          // link-local
  if (addr.startsWith('fc') || addr.startsWith('fd')) return true // unique-local fc00::/7
  // IPv4-mapped IPv6 (::ffff:10.0.0.1) → estrai la parte v4
  const mapped = addr.match(/::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/)
  const v4 = mapped ? mapped[1] : addr
  const m = v4.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])]
    if (a === 0 || a === 10 || a === 127) return true                 // 0/8, 10/8, loopback
    if (a === 169 && b === 254) return true                            // link-local + metadata 169.254.169.254
    if (a === 172 && b >= 16 && b <= 31) return true                  // 172.16/12
    if (a === 192 && b === 168) return true                          // 192.168/16
    if (a === 100 && b >= 64 && b <= 127) return true                // 100.64/10 CGNAT
  }
  return false
}

// SICUREZZA (anti-SSRF): blocca host privati/loopback/link-local e l'endpoint
// metadata cloud. Check LESSICALE veloce (localhost, IP letterali).
function isBlockedHostLexical(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '') // strip brackets IPv6
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal') || host.endsWith('.local')) return true
  if (isPrivateIp(host)) return true
  return false
}

// Check COMPLETO: risolve il DNS del hostname e blocca se un qualsiasi IP risolto è
// privato. Difende dal "DNS rebinding"/SSRF dove evil.com → 127.0.0.1 (il check
// lessicale da solo passerebbe). I media legittimi sono su CDN/URL pubblici.
export async function isBlockedHost(hostname: string): Promise<boolean> {
  if (isBlockedHostLexical(hostname)) return true
  // Se è già un IP letterale, il lessicale ha già deciso: niente DNS.
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) || hostname.includes(':')) return false
  try {
    const results = await lookup(hostname, { all: true })
    return results.some(r => isPrivateIp(r.address))
  } catch {
    // DNS non risolve → lascia decidere al fetch (fallirà comunque). Non bloccare
    // per un errore DNS transitorio su un host altrimenti legittimo.
    return false
  }
}

export async function validateMediaUrls(urls: (string | null | undefined)[], timeoutMs = 5000): Promise<MediaValidationResult> {
  const validUrls = urls
    .map((u, i) => ({ url: u, index: i + 1 }))
    .filter((e): e is { url: string; index: number } => typeof e.url === 'string' && e.url.trim().length > 0)

  if (validUrls.length === 0) return { ok: true, checks: [], errors: [] }

  const checks = await Promise.all(
    validUrls.map(async ({ url, index }): Promise<MediaCheck> => {
      try {
        const parsed = new URL(url)
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          return { url, index, reachable: false, contentType: null, error: `Protocollo non supportato: ${parsed.protocol}` }
        }
        if (await isBlockedHost(parsed.hostname)) {
          return { url, index, reachable: false, contentType: null, error: 'Host non consentito (rete privata/locale)' }
        }
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), timeoutMs)
        // redirect:'manual' evita che un redirect 3xx porti verso un host interno
        // dopo il check (TOCTOU su rete privata).
        const res = await fetch(url, { method: 'HEAD', signal: controller.signal, redirect: 'manual' })
        clearTimeout(timer)

        if (res.status >= 300 && res.status < 400) {
          return { url, index, reachable: false, contentType: null, error: 'Redirect non consentito sul media' }
        }
        if (!res.ok) {
          return { url, index, reachable: false, contentType: null, error: `HTTP ${res.status} ${res.statusText}` }
        }

        const ct = res.headers.get('content-type')
        if (ct && !ALLOWED_IMAGE.includes(ct) && !ALLOWED_VIDEO.includes(ct)) {
          return { url, index, reachable: true, contentType: ct, error: `Content-Type non supportato: ${ct}` }
        }

        return { url, index, reachable: true, contentType: ct, error: null }
      } catch (e) {
        const reason = e instanceof Error ? e.message : 'Errore sconosciuto'
        return { url, index, reachable: false, contentType: null, error: reason }
      }
    }),
  )

  const errors = checks.filter(c => !c.reachable || c.error).map(c => ({
    index: c.index,
    url: c.url,
    reason: c.error || 'Non raggiungibile',
  }))

  return { ok: errors.length === 0, checks, errors }
}

export function formatMediaError(errors: { index: number; url: string; reason: string }[]): string {
  return errors.map(e => `media KO code=${e.reason.includes('404') ? '404' : 'ERR'} — link_media_${e.index} non raggiungibile (${e.reason.slice(0, 80)})`).join('; ')
}
