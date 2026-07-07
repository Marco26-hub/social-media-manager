// Resolver account Blotato: mappa un canale interno (instagram, x, ...) all'accountId
// reale del workspace Blotato dell'utente, più i campi extra che la piattaforma
// richiede (Facebook pageId, Pinterest boardId, ecc.).
//
// Perché serve: /v2/posts richiede OBBLIGATORIAMENTE accountId — identifica SU
// QUALE account social pubblicare. Prima nessuno lo popolava, quindi ogni
// pubblicazione falliva con "Account Blotato non collegato". Qui lo risolviamo
// una volta dagli account collegati in Blotato (blotato_list_accounts → GET /v2/accounts).
//
// NIENTE fallback silenzioso: se un canale non ha un account Blotato collegato,
// l'errore è esplicito e dice cosa collegare, non pubblica a caso.

const BLOTATO_API_BASE = process.env.BLOTATO_API_URL || 'https://backend.blotato.com'

export type BlotatoSubaccount = { id: string; name?: string; type?: string }
export type BlotatoAccount = {
  id: string
  platform: string
  username?: string
  name?: string
  subaccounts: BlotatoSubaccount[]
}

// Cache per-key con TTL breve: una "Sincronizza" tocca N contenuti; senza cache
// faremmo N chiamate identiche a /v2/accounts. 60s copre l'intero batch.
const accountsCache = new Map<string, { at: number; accounts: BlotatoAccount[] }>()
const ACCOUNTS_TTL_MS = 60_000

function normalizeAccount(raw: unknown): BlotatoAccount | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const id = String(o.id ?? o.accountId ?? o.account_id ?? '').trim()
  const platform = String(o.platform ?? o.type ?? o.network ?? '').trim().toLowerCase()
  if (!id || !platform) return null
  const rawSubs = Array.isArray(o.subaccounts) ? o.subaccounts
    : Array.isArray(o.pages) ? o.pages
    : Array.isArray(o.boards) ? o.boards
    : []
  const subaccounts: BlotatoSubaccount[] = rawSubs
    .map((s): BlotatoSubaccount | null => {
      if (!s || typeof s !== 'object') return null
      const so = s as Record<string, unknown>
      const sid = String(so.id ?? so.pageId ?? so.boardId ?? '').trim()
      if (!sid) return null
      return { id: sid, name: so.name ? String(so.name) : undefined, type: so.type ? String(so.type) : undefined }
    })
    .filter((s): s is BlotatoSubaccount => s !== null)
  return {
    id,
    platform,
    username: o.username ? String(o.username) : undefined,
    name: o.name ? String(o.name) : (o.displayName ? String(o.displayName) : undefined),
    subaccounts,
  }
}

export async function listBlotatoAccounts(key: string, force = false): Promise<BlotatoAccount[]> {
  const cached = accountsCache.get(key)
  if (!force && cached && Date.now() - cached.at < ACCOUNTS_TTL_MS) return cached.accounts

  const res = await fetch(`${BLOTATO_API_BASE}/v2/accounts`, {
    headers: { Authorization: `Bearer ${key}`, 'blotato-api-key': key },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Blotato accounts ${res.status}: ${body.slice(0, 160) || 'errore lista account'}`)
  }
  const data = await res.json().catch(() => null) as unknown
  // Blotato può rispondere come array nudo o wrappato ({items|accounts|data:[...]}).
  const arr = Array.isArray(data) ? data
    : (data && typeof data === 'object'
        ? ((data as Record<string, unknown>).items
          ?? (data as Record<string, unknown>).accounts
          ?? (data as Record<string, unknown>).data)
        : null)
  if (!Array.isArray(arr)) throw new Error('Blotato: risposta account inattesa (nessun array)')
  const accounts = arr.map(normalizeAccount).filter((a): a is BlotatoAccount => a !== null)
  accountsCache.set(key, { at: Date.now(), accounts })
  return accounts
}

// Mapping canale interno → piattaforma Blotato (allineato a CANALE_TO_BLOTATO in schedule.ts).
const CANALE_TO_PLATFORM: Record<string, string> = {
  instagram: 'instagram',
  facebook: 'facebook',
  tiktok: 'tiktok',
  pinterest: 'pinterest',
  linkedin: 'linkedin',
  threads: 'threads',
  x: 'twitter',
  youtube_shorts: 'youtube',
}

export type ResolvedTarget = {
  accountId: string
  // target da mettere nel payload /v2/posts: { targetType, + campi per-piattaforma }.
  target: Record<string, unknown>
}

// Risolve accountId + target per un canale. Lancia un errore ESPLICITO e azionabile
// se manca l'account o un campo obbligatorio della piattaforma (es. Pinterest board).
export async function resolveBlotatoTarget(
  key: string,
  canale: string,
  row: Record<string, unknown>,
): Promise<ResolvedTarget> {
  const platform = CANALE_TO_PLATFORM[canale]
  if (!platform) throw new Error(`Canale '${canale}' non pubblicabile via Blotato`)

  const accounts = await listBlotatoAccounts(key)
  const account = accounts.find(a => a.platform === platform)
  if (!account) {
    const collegati = accounts.map(a => a.platform).join(', ') || 'nessuno'
    throw new Error(`Nessun account ${platform} collegato in Blotato (collegati: ${collegati}). Collega l'account nel workspace Blotato.`)
  }

  const target: Record<string, unknown> = { targetType: platform }
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

  // Campi obbligatori/consigliati per piattaforma (schema blotato_create_post).
  if (platform === 'facebook') {
    // Facebook pubblica su una Page, non sul profilo: pageId da subaccount.
    const page = account.subaccounts[0]
    if (!page) throw new Error("Facebook: nessuna Page collegata in Blotato (serve pageId). Collega una Facebook Page nel workspace.")
    target.pageId = page.id
  } else if (platform === 'pinterest') {
    const board = account.subaccounts[0]
    if (!board) throw new Error('Pinterest: nessuna board collegata in Blotato (serve boardId).')
    target.boardId = board.id
    target.title = (str(row.hook) || str(row.nome_prodotto) || 'Nuovo pin').slice(0, 100)
  } else if (platform === 'linkedin') {
    // Se c'è una Company Page collegata la usiamo; altrimenti profilo personale.
    const page = account.subaccounts[0]
    if (page) target.pageId = page.id
  } else if (platform === 'tiktok') {
    // Default sicuri per pubblicazione pubblica; l'utente può raffinarli poi.
    target.privacyLevel = 'PUBLIC_TO_EVERYONE'
    target.isYourBrand = false
    target.isBrandedContent = false
  } else if (platform === 'youtube') {
    target.title = (str(row.hook) || str(row.nome_prodotto) || 'Video').slice(0, 90)
    target.privacyStatus = 'public'
  }

  return { accountId: account.id, target }
}
