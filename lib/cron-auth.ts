import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return timingSafeEqual(ab, bb)
}

// Auth per gli endpoint schedulati, chiamati da uno scheduler ESTERNO (es.
// cron-job.org): niente sessione, solo un bearer token statico = CRON_SECRET.
// FAIL-CLOSED: se CRON_SECRET non è configurato l'endpoint è chiuso (503), così non
// resta mai aperto per una svista di configurazione. Confronto a tempo costante per
// non trapelare il segreto via timing.
// Ritorna una NextResponse se la richiesta va RIFIUTATA, altrimenti null (procedi).
export function cronDenied(request: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return NextResponse.json({ error: 'CRON_SECRET non configurato' }, { status: 503 })
  const header = request.headers.get('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  if (!token || !safeEqual(token, secret)) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }
  return null
}
