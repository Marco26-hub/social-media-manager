import { NextResponse } from 'next/server'
import { dbReady } from '@/lib/db'
import { isDemo } from '@/lib/demo'

const DEFAULT_DEMO_USER = 'admin'
const DEFAULT_DEMO_PASSWORD = '1234567'

export async function GET() {
  const demo = isDemo() || !dbReady()
  const showInProduction = process.env.SHOW_LOGIN_HINT === 'true'

  if (!demo && !showInProduction) {
    return NextResponse.json({ enabled: false })
  }

  // Demo puro: le credenziali NON sono un segreto (con DATABASE_URL mancante il
  // login accetta qualunque valore). Le esponiamo per l'auto-login/hint demo.
  if (demo) {
    return NextResponse.json({
      enabled: true,
      mode: 'demo',
      username: process.env.ADMIN_LOGIN_USER || DEFAULT_DEMO_USER,
      password: process.env.ADMIN_LOGIN_PASSWORD || DEFAULT_DEMO_PASSWORD,
      login_url: '/login',
      dashboard_url: '/dashboard/clienti',
      note: 'Credenziali demo/setup. Con DATABASE_URL mancante il login accetta qualunque credenziale.',
    })
  }

  // Production-hint (SHOW_LOGIN_HINT=true): NON riveliamo lo username admin reale
  // a un visitatore anonimo — sarebbe info-disclosure che agevola il brute-force
  // (metà credenziale regalata; il login è rate-limited ma non basta). Segnaliamo
  // solo CHE l'accesso admin esiste: l'operatore conosce le proprie credenziali.
  return NextResponse.json({
    enabled: true,
    mode: 'production-hint',
    login_url: '/login',
    note: 'Accedi con le credenziali admin configurate (ADMIN_LOGIN_USER / ADMIN_LOGIN_PASSWORD). Disattiva SHOW_LOGIN_HINT prima della vendita.',
  })
}
