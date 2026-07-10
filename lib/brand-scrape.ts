// Fetcha davvero il contenuto di un sito ed estrae testo/metadata leggibili per
// la brand discovery AI. ANTI-ALLUCINAZIONE: l'AI lavora sul contenuto REALE
// del sito, non sull'URL nudo (che prima la portava a inventare settore, tono,
// target, colori...). Protezione SSRF: host privati/loopback/link-local bloccati.

import { isBlockedHost } from '@/lib/media-validate'

export type ScrapedSite = {
  ok: boolean
  url: string
  finalUrl?: string
  title: string | null
  description: string | null
  ogTitle: string | null
  ogDescription: string | null
  ogSiteName: string | null
  headings: string[]
  textSample: string
  bytesFetched: number
  error?: string
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)))
}

function pickMeta(html: string, pattern: RegExp): string | null {
  const m = html.match(pattern)
  if (!m || !m[1]) return null
  const v = decodeEntities(m[1].trim()).replace(/\s+/g, ' ')
  return v.length > 0 && v.length < 500 ? v : null
}

// Estrae title, meta description, Open Graph, headings (h1/h2) e un campione di
// testo visibile (script/style/svg/nav/footer rimossi). Niente DOM parser: regex
// robuste su HTML ben formato (i siti reali lo sono abbastanza per estrarre meta).
function extractFromHtml(html: string): {
  title: string | null
  description: string | null
  ogTitle: string | null
  ogDescription: string | null
  ogSiteName: string | null
  headings: string[]
  textSample: string
} {
  // Rimuovi blocchi non testuali che confondono l'estrazione e l'AI.
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')

  const title = pickMeta(stripped, /<title[^>]*>([^<]*)<\/title>/i)
  const description = pickMeta(stripped, /<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i)
    || pickMeta(stripped, /<meta\s+content=["']([^"']*)["']\s+name=["']description["']/i)
  const ogTitle = pickMeta(stripped, /<meta\s+property=["']og:title["']\s+content=["']([^"']*)["']/i)
    || pickMeta(stripped, /<meta\s+content=["']([^"']*)["']\s+property=["']og:title["']/i)
  const ogDescription = pickMeta(stripped, /<meta\s+property=["']og:description["']\s+content=["']([^"']*)["']/i)
    || pickMeta(stripped, /<meta\s+content=["']([^"']*)["']\s+property=["']og:description["']/i)
  const ogSiteName = pickMeta(stripped, /<meta\s+property=["']og:site_name["']\s+content=["']([^"']*)["']/i)
    || pickMeta(stripped, /<meta\s+content=["']([^"']*)["']\s+property=["']og:site_name["']/i)

  // Headings h1/h2: sintesi della struttura del sito (categorie, prodotti, valori).
  const headings: string[] = []
  const hMatches = stripped.matchAll(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/gi)
  for (const hm of hMatches) {
    const t = decodeEntities(hm[1].replace(/<[^>]+>/g, '').trim()).replace(/\s+/g, ' ')
    if (t.length > 1 && t.length < 200 && !headings.includes(t)) headings.push(t)
    if (headings.length >= 25) break
  }

  // Testo visibile: togli i tag, collassa whitespace, prendi un campione.
  // Rimuoviamo nav/footer prima (boilerplate) per privilegiare il contenuto vero.
  const bodyOnly = stripped
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<header[\s\S]*?<\/header>/gi, ' ')
  const text = decodeEntities(bodyOnly.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())

  return {
    title,
    description,
    ogTitle,
    ogDescription,
    ogSiteName,
    headings,
    textSample: text.slice(0, 6000),
  }
}

export async function fetchSiteContent(rawUrl: string, opts: { timeoutMs?: number } = {}): Promise<ScrapedSite> {
  const timeoutMs = opts.timeoutMs ?? 12000
  const base: ScrapedSite = {
    ok: false, url: rawUrl, title: null, description: null,
    ogTitle: null, ogDescription: null, ogSiteName: null,
    headings: [], textSample: '', bytesFetched: 0,
  }

  let parsed: URL
  try {
    // Permetti URL senza schema (es. "miosito.com") aggiungendo https.
    const withScheme = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`
    parsed = new URL(withScheme)
  } catch {
    return { ...base, error: 'URL non valido' }
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { ...base, error: `Protocollo non supportato: ${parsed.protocol}` }
  }
  if (await isBlockedHost(parsed.hostname)) {
    return { ...base, error: 'Host non consentito (rete privata/locale)' }
  }

  let currentUrl = parsed.href
  const fetched = await (async () => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      // redirect:'manual' + revalidazione host ad ogni hop: evita redirect
      // pubblico→interno (TOCTOU verso 169.254.169.254 / rete privata).
      const fetchInit: RequestInit = {
        signal: controller.signal,
        headers: {
          'Accept': 'text/html,application/xhtml+xml',
          // Alcuni siti bloccano senza UA riconoscibile.
          'User-Agent': 'Mozilla/5.0 (compatible; SocialAutomationBrandBot/1.0)',
        },
        redirect: 'manual' as const,
      }
      let res = await fetch(currentUrl, fetchInit)
      let hops = 0
      // Segui i redirect (3xx) ma revalida ogni destinazione.
      while (res.status >= 300 && res.status < 400 && hops < 5) {
        const loc = res.headers.get('location')
        if (!loc) break
        const next = new URL(loc, currentUrl)
        if (!['http:', 'https:'].includes(next.protocol) || await isBlockedHost(next.hostname)) {
          return { res, error: 'Redirect verso host non consentito', finalUrl: currentUrl }
        }
        currentUrl = next.href
        res = await fetch(currentUrl, fetchInit)
        hops++
      }
      return { res, error: undefined as string | undefined, finalUrl: currentUrl }
    } catch (e) {
      return { res: null as Response | null, error: e instanceof Error ? e.message : 'fetch fallito', finalUrl: currentUrl }
    } finally {
      clearTimeout(timer)
    }
  })()

  const { res, error: fetchError, finalUrl } = fetched
  if (!res) {
    return { ...base, error: `Fetch sito fallito: ${fetchError || 'errore rete'}` }
  }
  if (res.status >= 300 && res.status < 400) {
    return { ...base, finalUrl, error: 'Troppi redirect o redirect non gestibile' }
  }
  if (!res.ok) {
    return { ...base, finalUrl, error: `Sito non raggiungibile: HTTP ${res.status} ${res.statusText}` }
  }

  const ct = res.headers.get('content-type') || ''
  if (!/text\/html|application\/xhtml/i.test(ct)) {
    return { ...base, finalUrl, error: `Il sito non restituisce HTML (Content-Type: ${ct || 'sconosciuto'})` }
  }

  // Limite hard: 3MB. Siti enormi non servono alla brand discovery e rischiano OOM.
  const buf = await res.arrayBuffer()
  const bytesFetched = buf.byteLength
  if (bytesFetched === 0) {
    return { ...base, finalUrl, error: 'Il sito ha restituito un corpo vuoto' }
  }
  const slice = buf.slice(0, Math.min(bytesFetched, 3 * 1024 * 1024))
  const html = new TextDecoder('utf-8', { fatal: false }).decode(slice)

  const extracted = extractFromHtml(html)

  // Se non abbiamo né testo né meta, il sito è illeggibile: NON lasciare l'AI
  // inventare dall'URL. Restituisci errore esplicito.
  const hasContent =
    (extracted.textSample.length >= 200) ||
    (extracted.title && extracted.title.length > 0) ||
    (extracted.description && extracted.description.length > 0)

  if (!hasContent) {
    return {
      ...base, finalUrl, bytesFetched, error:
        'Contenuto del sito non estraibile (possibile sito JS-only, paywall o anti-bot). Inserisci i dati del brand manualmente.',
    }
  }

  return {
    ok: true,
    url: rawUrl,
    finalUrl,
    title: extracted.title,
    description: extracted.description,
    ogTitle: extracted.ogTitle,
    ogDescription: extracted.ogDescription,
    ogSiteName: extracted.ogSiteName,
    headings: extracted.headings,
    textSample: extracted.textSample,
    bytesFetched,
  }
}
