import { NextResponse, type NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { isDemo } from '@/lib/demo'
import { AUTH_SECRET } from '@/lib/auth-secret'

// Rate limiter in-memory per /api/generate/* (chiamate AI costose).
// Sliding window per IP. Nota: lo stato è per-istanza; per deploy multi-istanza
// usare un backend condiviso (Redis/Upstash). Mitigazione base contro token burn.
const RL_WINDOW_MS = 60_000
const RL_MAX = 20
const rlHits = new Map<string, number[]>()

function rateLimit(ip: string): { ok: boolean; retryAfter: number } {
  const now = Date.now()
  const since = now - RL_WINDOW_MS
  const hits = (rlHits.get(ip) || []).filter(t => t > since)
  if (hits.length >= RL_MAX) {
    const retryAfter = Math.ceil((hits[0] + RL_WINDOW_MS - now) / 1000)
    return { ok: false, retryAfter: Math.max(1, retryAfter) }
  }
  hits.push(now)
  rlHits.set(ip, hits)
  if (rlHits.size > 5000) { // evita crescita illimitata della mappa
    for (const [k, v] of rlHits) { if (v.every(t => t <= since)) rlHits.delete(k) }
  }
  return { ok: true, retryAfter: 0 }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rate limit PRIMA del bypass demo: anche in demo con chiave BYO si bruciano token.
  if (pathname.startsWith('/api/generate')) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim()
      || request.headers.get('x-real-ip') || 'unknown'
    const rl = rateLimit(ip)
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Troppe richieste. Attendi qualche secondo e riprova.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
      )
    }
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

  if (isAuthPage && token) {
    return NextResponse.redirect(new URL('/dashboard/clienti', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
