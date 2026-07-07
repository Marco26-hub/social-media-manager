import { NextResponse, type NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { isDemo } from '@/lib/demo'
import { AUTH_SECRET } from '@/lib/auth-secret'

// Rate limiter in-memory. Sliding window per IP. Nota: lo stato è per-istanza;
// per deploy multi-istanza usare un backend condiviso (Redis/Upstash).
// Due finestre: AI costose (/api/generate) e auth (login/register anti brute-force).
const GEN_WINDOW_MS = 60_000
const GEN_MAX = 20
const genHits = new Map<string, number[]>()

const AUTH_WINDOW_MS = 5 * 60_000
const AUTH_MAX = 10 // tentativi login/register per IP ogni 5 min
const authHits = new Map<string, number[]>()

function clientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0].trim()
    || request.headers.get('x-real-ip') || 'unknown'
}

function rateLimit(store: Map<string, number[]>, ip: string, windowMs: number, max: number): { ok: boolean; retryAfter: number } {
  const now = Date.now()
  const since = now - windowMs
  const hits = (store.get(ip) || []).filter(t => t > since)
  if (hits.length >= max) {
    const retryAfter = Math.ceil((hits[0] + windowMs - now) / 1000)
    return { ok: false, retryAfter: Math.max(1, retryAfter) }
  }
  hits.push(now)
  store.set(ip, hits)
  if (store.size > 5000) { // evita crescita illimitata della mappa
    for (const [k, v] of store) { if (v.every(t => t <= since)) store.delete(k) }
  }
  return { ok: true, retryAfter: 0 }
}

function tooMany(retryAfter: number) {
  return NextResponse.json(
    { error: 'Troppe richieste. Attendi e riprova.' },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } },
  )
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rate limit PRIMA del bypass demo: anche in demo con chiave BYO si bruciano token.
  if (pathname.startsWith('/api/generate')) {
    const rl = rateLimit(genHits, clientIp(request), GEN_WINDOW_MS, GEN_MAX)
    if (!rl.ok) return tooMany(rl.retryAfter)
  }

  // Anti brute-force / spam su login e registrazione.
  const isLoginPost = pathname === '/api/auth/callback/credentials' && request.method === 'POST'
  const isRegisterPost = pathname === '/api/auth/register' && request.method === 'POST'
  if (isLoginPost || isRegisterPost) {
    const rl = rateLimit(authHits, clientIp(request), AUTH_WINDOW_MS, AUTH_MAX)
    if (!rl.ok) return tooMany(rl.retryAfter)
  }

  if (isDemo()) return NextResponse.next()
  const token = await getToken({ req: request, secret: AUTH_SECRET })
  const isAuthPage = pathname === '/login'
  const isDashboard = pathname.startsWith('/dashboard')
  const isApprove = pathname.startsWith('/approve')
  const isPreview = pathname.startsWith('/preview')
  const isPublicApprovalApi = pathname === '/api/data/approve' && request.method !== 'POST'
  // Preview pubblica (link condivisibile): sola lettura di UN contenuto per id.
  const isPublicPreviewApi = pathname === '/api/data/preview' && request.method === 'GET'
  const isProtectedApi =
    pathname.startsWith('/api/generate') ||
    pathname.startsWith('/api/system/local') ||
    (pathname.startsWith('/api/data') && !isPublicApprovalApi && !isPublicPreviewApi)

  if (isApprove || isPreview) return NextResponse.next()

  if (isProtectedApi && !token) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  }

  // '/' è la landing pubblica: deve renderizzare per visitatori E crawler SEO
  // (prima reindirizzava sempre a /login o /dashboard, rendendo la landing
  // irraggiungibile e facendo indicizzare la pagina di login). I loggati vedono
  // la landing con il CTA "Vai al pannello".
  if (pathname === '/') {
    return NextResponse.next()
  }

  if (isDashboard && !token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Role-based dashboard protection: il cliente non-admin vede SOLO i risultati
  // e i pagamenti (overview, il-mio-piano, calendario, analytics, report).
  // Le pagine generative/gestione (social, piano, blog, ads, seo, competitor,
  // brand, clienti, prodotti, setup, settings, onboarding, log, registrazioni,
  // pagamenti admin) sono riservate all'admin — sono i servizi che vendiamo.
  if (isDashboard && token) {
    const ruolo = (token.ruolo as string | undefined) || 'user'
    const isAdmin = ruolo === 'admin' || ruolo === 'super_admin'
    if (!isAdmin) {
      const CLIENTE_ALLOWED = [
        '/dashboard/il-mio-piano',
        '/dashboard/calendario',
        '/dashboard/analytics',
        '/dashboard/report',
      ]
      const isOverview = pathname === '/dashboard'
      const isAllowed = CLIENTE_ALLOWED.some(p => pathname.startsWith(p))
      if (!isOverview && !isAllowed) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }
  }

  if (isAuthPage && token) {
    return NextResponse.redirect(new URL('/dashboard/clienti', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
