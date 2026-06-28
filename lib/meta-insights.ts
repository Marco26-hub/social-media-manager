// ─────────────────────────────────────────────────────────────────────────
// Integrazione Meta Graph API per insight Instagram/Facebook AUTOMATICI.
// L'UNICO modo legale di leggere reach/impression/engagement: l'account
// autorizza via OAuth, poi l'API restituisce le Insights.
//
// Richiede: app Meta Developer (META_APP_ID + META_APP_SECRET) e un account
// Instagram Business/Creator collegato a una Pagina Facebook.
// ─────────────────────────────────────────────────────────────────────────

const GRAPH = 'https://graph.facebook.com/v21.0'
const OAUTH_DIALOG = 'https://www.facebook.com/v21.0/dialog/oauth'

// Permessi necessari per leggere le Insights Instagram.
export const META_SCOPES = [
  'instagram_basic',
  'instagram_manage_insights',
  'pages_show_list',
  'pages_read_engagement',
  'business_management',
].join(',')

export function metaConfigured(): boolean {
  return Boolean(process.env.META_APP_ID?.trim() && process.env.META_APP_SECRET?.trim())
}

export function getOAuthUrl(redirectUri: string, state: string): string {
  const p = new URLSearchParams({
    client_id: process.env.META_APP_ID!.trim(),
    redirect_uri: redirectUri,
    scope: META_SCOPES,
    response_type: 'code',
    state,
  })
  return `${OAUTH_DIALOG}?${p.toString()}`
}

async function graphGet(path: string, params: Record<string, string>): Promise<Record<string, unknown>> {
  const url = `${GRAPH}/${path}?${new URLSearchParams(params).toString()}`
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) })
  const data = await res.json().catch(() => ({})) as Record<string, unknown>
  if (!res.ok) {
    const err = (data.error as { message?: string })?.message || `Graph ${res.status}`
    throw new Error(err.slice(0, 200))
  }
  return data
}

// Scambia il code OAuth per un token utente long-lived (~60 giorni).
export async function exchangeCodeForToken(code: string, redirectUri: string): Promise<string> {
  const appId = process.env.META_APP_ID!.trim()
  const secret = process.env.META_APP_SECRET!.trim()
  const short = await graphGet('oauth/access_token', {
    client_id: appId, client_secret: secret, redirect_uri: redirectUri, code,
  })
  const shortToken = String(short.access_token || '')
  if (!shortToken) throw new Error('Token OAuth non ottenuto')
  // Long-lived
  const long = await graphGet('oauth/access_token', {
    grant_type: 'fb_exchange_token', client_id: appId, client_secret: secret, fb_exchange_token: shortToken,
  })
  return String(long.access_token || shortToken)
}

export type IgAccount = { igId: string; username: string; pageToken: string; pageName: string }

// Trova gli account Instagram Business collegati alle Pagine FB dell'utente.
export async function getInstagramAccounts(userToken: string): Promise<IgAccount[]> {
  const data = await graphGet('me/accounts', {
    fields: 'id,name,access_token,instagram_business_account{id,username}',
    access_token: userToken,
    limit: '50',
  })
  const pages = (data.data as Record<string, unknown>[]) || []
  const out: IgAccount[] = []
  for (const page of pages) {
    const ig = page.instagram_business_account as { id?: string; username?: string } | undefined
    if (ig?.id) {
      out.push({
        igId: ig.id,
        username: ig.username || '',
        pageToken: String(page.access_token || userToken),
        pageName: String(page.name || ''),
      })
    }
  }
  return out
}

export type IgMedia = {
  id: string; permalink: string; timestamp: string; caption: string; mediaType: string
  likes: number; comments: number
}

// Ultimi media dell'account IG (con permalink per il match coi nostri post).
export async function listInstagramMedia(igId: string, pageToken: string, limit = 50): Promise<IgMedia[]> {
  const data = await graphGet(`${igId}/media`, {
    fields: 'id,permalink,timestamp,caption,media_type,like_count,comments_count',
    access_token: pageToken,
    limit: String(limit),
  })
  const items = (data.data as Record<string, unknown>[]) || []
  return items.map(m => ({
    id: String(m.id || ''),
    permalink: String(m.permalink || ''),
    timestamp: String(m.timestamp || ''),
    caption: String(m.caption || ''),
    mediaType: String(m.media_type || ''),
    likes: Number(m.like_count || 0),
    comments: Number(m.comments_count || 0),
  }))
}

export type IgInsights = { reach: number; impressions: number; saved: number; shares: number; total_interactions: number }

// Insights di un singolo media. Le metriche disponibili variano per tipo;
// richiediamo un set ampio e parsiamo ciò che torna (resiliente alle deprecazioni).
export async function getMediaInsights(mediaId: string, pageToken: string): Promise<Partial<IgInsights>> {
  const tryMetrics = async (metrics: string) => {
    try {
      const data = await graphGet(`${mediaId}/insights`, { metric: metrics, access_token: pageToken })
      const arr = (data.data as Record<string, unknown>[]) || []
      const out: Record<string, number> = {}
      for (const it of arr) {
        const name = String(it.name || '')
        const values = (it.values as { value?: number }[]) || []
        out[name] = Number(values[0]?.value || 0)
      }
      return out
    } catch {
      return null
    }
  }
  // Set moderno; se fallisce (account/tipo), prova un set minimo.
  const res = await tryMetrics('reach,saved,shares,total_interactions')
    || await tryMetrics('reach,saved')
    || {}
  return {
    reach: res.reach || 0,
    impressions: res.impressions || 0,
    saved: res.saved || 0,
    shares: res.shares || 0,
    total_interactions: res.total_interactions || 0,
  }
}
