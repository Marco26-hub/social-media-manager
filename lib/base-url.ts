// Deriva la base URL pubblica per i link generati (approvazione, asset, OAuth
// redirect_uri). SICUREZZA: preferisce l'env esplicita, NON manipolabile dal
// client. L'host header (x-forwarded-host) è usato solo come fallback e validato,
// per evitare host-header injection / poisoning del redirect_uri.

function sanitize(url: string | undefined | null): string | null {
  if (!url) return null
  const trimmed = url.trim().replace(/\/$/, '')
  if (!/^https?:\/\//.test(trimmed)) return null
  return trimmed
}

export function getPublicBaseUrl(request: Request): string {
  // 1. Env esplicita (preferita: sotto il tuo controllo, non manipolabile)
  const fromEnv = sanitize(process.env.NEXT_PUBLIC_SITE_URL) || sanitize(process.env.NEXTAUTH_URL)
  if (fromEnv) return fromEnv

  // 2. Host dietro proxy — fallback quando l'env non è configurata. Validato
  //    (solo hostname[:porta]) per non fidarsi ciecamente dell'header.
  const fwdHost = request.headers.get('x-forwarded-host') || request.headers.get('host')
  const fwdProto = request.headers.get('x-forwarded-proto') || 'https'
  if (fwdHost && /^[a-zA-Z0-9.-]+(:\d+)?$/.test(fwdHost)) {
    return `${fwdProto}://${fwdHost}`
  }

  // 3. Origin della request URL
  try {
    return new URL(request.url).origin
  } catch {
    return 'http://localhost:3000'
  }
}
