// Verifica Cloudflare Turnstile (captcha anti-bot) lato server.
// No-op sicuro se TURNSTILE_SECRET_KEY manca: verifyTurnstile() ritorna true così
// la registrazione funziona comunque (protetta almeno dal rate-limit del middleware).
// Appena le chiavi sono su Render, il captcha diventa obbligatorio.
//
// Env:
//   NEXT_PUBLIC_TURNSTILE_SITE_KEY — chiave pubblica (widget, baked al build)
//   TURNSTILE_SECRET_KEY           — chiave segreta (verifica server)

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

export function turnstileEnabled(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY?.trim())
}

export async function verifyTurnstile(token: string | undefined | null, remoteIp?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim()
  // Captcha non configurato → non bloccare (skip). Il rate-limit resta attivo.
  if (!secret) return true
  if (!token) return false

  try {
    const body = new URLSearchParams()
    body.append('secret', secret)
    body.append('response', token)
    if (remoteIp) body.append('remoteip', remoteIp)

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8000)
    const res = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: controller.signal,
    })
    clearTimeout(timer)
    const data = await res.json().catch(() => null) as { success?: boolean } | null
    return Boolean(data?.success)
  } catch (e) {
    // FAIL-CLOSED: se il captcha è configurato (siamo oltre il guard `!secret`) ma
    // la verifica verso Cloudflare fallisce/scade, NON lasciar passare. Il fail-open
    // permetteva a un bot di aggirare il captcha semplicemente inducendo/attendendo
    // un errore di rete verso siteverify. Chi è legittimo può ritentare.
    console.warn('[turnstile] verifica fallita (rete) → blocco:', e instanceof Error ? e.message : String(e))
    return false
  }
}
