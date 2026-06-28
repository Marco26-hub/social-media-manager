import { NextResponse } from 'next/server'
import { dbReady, q } from '@/lib/db'
import { requireAuth, requireClienteAccess } from '@/lib/auth-utils'
import { getPublicBaseUrl } from '@/lib/base-url'
import { exchangeCodeForToken, getInstagramAccounts, META_SCOPES } from '@/lib/meta-insights'

// Callback OAuth Meta: scambia il code, trova gli account IG Business e li salva.
export async function GET(request: Request) {
  const base = getPublicBaseUrl(request)
  try {
    await requireAuth()
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const fbError = searchParams.get('error_description') || searchParams.get('error')
    if (fbError) return NextResponse.redirect(`${base}/dashboard/analytics?connect=error&msg=${encodeURIComponent(fbError)}`)
    if (!code || !state) return NextResponse.redirect(`${base}/dashboard/analytics?connect=error&msg=parametri_mancanti`)

    const clienteId = await requireClienteAccess(decodeURIComponent(state))
    const redirectUri = `${base}/api/social/callback`

    const userToken = await exchangeCodeForToken(code, redirectUri)
    const igAccounts = await getInstagramAccounts(userToken)

    if (!igAccounts.length) {
      return NextResponse.redirect(`${base}/dashboard/analytics?connect=no_ig`)
    }

    if (dbReady()) {
      for (const ig of igAccounts) {
        await q(
          `INSERT INTO social_accounts
             (cliente_id, platform, platform_account_id, platform_username, access_token, scopes, attivo, updated_at)
           VALUES ($1, 'instagram', $2, $3, $4, $5, true, now())
           ON CONFLICT (cliente_id, platform, platform_account_id) DO UPDATE SET
             platform_username = excluded.platform_username,
             access_token = excluded.access_token,
             scopes = excluded.scopes,
             attivo = true,
             updated_at = now()`,
          [clienteId, ig.igId, ig.username, ig.pageToken, META_SCOPES.split(',')],
        )
      }
    }

    return NextResponse.redirect(`${base}/dashboard/analytics?connect=ok&accounts=${igAccounts.length}`)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'errore'
    return NextResponse.redirect(`${base}/dashboard/analytics?connect=error&msg=${encodeURIComponent(msg.slice(0, 120))}`)
  }
}
