import { NextResponse } from 'next/server'
import { requireAuth, requireClienteId } from '@/lib/auth-utils'
import { getPublicBaseUrl } from '@/lib/base-url'
import { metaConfigured, getOAuthUrl } from '@/lib/meta-insights'
import { apiError } from '@/lib/api-error'

// Avvia il collegamento OAuth Instagram/Facebook per il cliente attivo.
export async function GET(request: Request) {
  try {
    await requireAuth()
    const clienteId = await requireClienteId()
    if (!metaConfigured()) {
      return NextResponse.json(
        { error: 'Integrazione Meta non configurata: imposta META_APP_ID e META_APP_SECRET su Render.' },
        { status: 503 },
      )
    }
    const redirectUri = `${getPublicBaseUrl(request)}/api/social/callback`
    // state porta il cliente: sul callback verifichiamo l'accesso.
    const url = getOAuthUrl(redirectUri, encodeURIComponent(clienteId))
    return NextResponse.redirect(url)
  } catch (e) {
    return apiError(e)
  }
}
