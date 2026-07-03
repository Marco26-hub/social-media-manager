import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { callAI, extractJSON } from '@/lib/ai'
import { requireAuth } from '@/lib/auth-utils'

// Anti-SSRF: stessa logica di lib/media-validate.ts
function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '')
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal') || host.endsWith('.local')) return true
  if (host === '::1' || host === '::' || host.startsWith('fe80:') || host.startsWith('fc') || host.startsWith('fd')) return true
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])]
    if (a === 0 || a === 10 || a === 127) return true
    if (a === 169 && b === 254) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    if (a === 100 && b >= 64 && b <= 127) return true
  }
  return false
}

const SKIP_SOCIAL = new Set([
  'share', 'sharer', 'login', 'home', 'explore', 'intent', 'hashtag',
  'p', 'reel', 'stories', 'ads', 'business', 'help', 'legal', 'privacy',
  'about', 'developers', 'policies',
])

function extractContactsFromHtml(html: string, baseUrl: string) {
  // Rimuovi script/style prima del parsing
  const stripped = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')

  const text = stripped
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))

  // Decodifica unicode escape (> ecc.) prima di cercare email nell'HTML raw
  const htmlDecoded = html.replace(/\\u([\dA-Fa-f]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))

  const emailPattern = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g
  const PLACEHOLDER_EMAILS = new Set(['nome@azienda.com', 'email@example.com', 'user@example.com', 'test@test.com', 'info@example.com', 'example@example.com'])
  const rawEmails = [...new Set([
    ...(htmlDecoded.match(emailPattern) || []),
    ...(text.match(emailPattern) || []),
  ])]
    .map(e => e.toLowerCase())
    .filter(e => /^[a-zA-Z0-9]/.test(e))
    .filter(e => !/\.(png|jpg|jpeg|gif|webp|svg|ico|css|js|woff|ttf)$/i.test(e))
    .filter(e => !e.includes('..') && !e.startsWith('.') && e.includes('.'))
    .filter(e => !PLACEHOLDER_EMAILS.has(e))
    .slice(0, 20)

  // Telefono (Italia + internazionale)
  const phonePattern = /(?:\+39|0039)[\s.\-]?[\d\s.\-]{8,14}|(?:\+\d{1,3})[\s.\-]?[\d\s.\-]{7,14}|(?:0\d{1,4}[\s\-\.]\d{4,8})|(?:3[0-9]{2}[\s\-\.]?\d{6,7})/g
  const telefono = [...new Set((text.match(phonePattern) || []).map(p => p.trim().replace(/\s+/g, ' ')))]
    .filter(p => p.replace(/\D/g, '').length >= 8)
    .slice(0, 10)

  // WhatsApp — cerca wa.me nell'HTML (href) e nel testo
  const waHref = [...html.matchAll(/href="[^"]*wa\.me\/(\+?[\d]+)[^"]*"/gi)].map(m => m[1])
  const waText = [...stripped.matchAll(/wa\.me\/(\+?[\d]+)/gi)].map(m => m[1])
  const waNumbers = [...new Set([...waHref, ...waText])]
  const whatsapp = waNumbers.slice(0, 5).map(n => ({
    numero: n,
    link: `https://wa.me/${n.replace(/\D/g, '')}`,
    note: '',
  }))

  // Telegram
  const tgMatches = [...html.matchAll(/https?:\/\/t\.me\/([a-zA-Z0-9_]{3,32})/gi)]
  const telegram = [...new Set(tgMatches.map(m => m[1]))]
    .filter(u => !['share', 'joinchat', 'iv', 'addstickers'].includes(u.toLowerCase()))
    .slice(0, 5)
    .map(u => ({ username: `@${u}`, link: `https://t.me/${u}`, tipo: 'canale', note: '' }))

  // Social media
  const socialPatterns: { piattaforma: string; regex: RegExp; urlBuilder: (h: string) => string }[] = [
    { piattaforma: 'instagram', regex: /instagram\.com\/([a-zA-Z0-9._]{1,30})\/?(?=['">\s?#])/g, urlBuilder: h => `https://www.instagram.com/${h}/` },
    { piattaforma: 'facebook', regex: /facebook\.com\/(?!profile\.php)([a-zA-Z0-9._\-]{1,75})\/?(?=['">\s?#])/g, urlBuilder: h => `https://www.facebook.com/${h}` },
    { piattaforma: 'tiktok', regex: /tiktok\.com\/@([a-zA-Z0-9._]{1,30})\/?(?=['">\s?#])/g, urlBuilder: h => `https://www.tiktok.com/@${h}` },
    { piattaforma: 'linkedin', regex: /linkedin\.com\/(?:company|in)\/([a-zA-Z0-9._\-]{1,75})\/?(?=['">\s?#])/g, urlBuilder: h => `https://www.linkedin.com/company/${h}` },
    { piattaforma: 'youtube', regex: /youtube\.com\/(?:channel\/UC|c\/|@)([a-zA-Z0-9._\-]{1,50})\/?(?=['">\s?#])/g, urlBuilder: h => `https://www.youtube.com/@${h}` },
    { piattaforma: 'pinterest', regex: /pinterest\.(?:com|it)\/([a-zA-Z0-9._]{1,30})\/?(?=['">\s?#])/g, urlBuilder: h => `https://www.pinterest.com/${h}/` },
    { piattaforma: 'twitter', regex: /(?:twitter|x)\.com\/([a-zA-Z0-9_]{1,15})\/?(?=['">\s?#])/g, urlBuilder: h => `https://x.com/${h}` },
  ]

  const social: { piattaforma: string; url: string; note: string }[] = []
  for (const { piattaforma, regex, urlBuilder } of socialPatterns) {
    const handles = [...new Set([...html.matchAll(regex)].map(m => m[1]))]
      .filter(h => !SKIP_SOCIAL.has(h.toLowerCase()))
    if (handles.length) {
      social.push({ piattaforma, url: urlBuilder(handles[0]), note: handles.length > 1 ? `${handles.length} handle trovati` : '' })
    }
  }

  // Pagina contatti
  const contactHrefs = [...html.matchAll(/href="([^"]*(?:contact|contatt|reach|write-us|scrivici|contatti)[^"]*)"/gi)]
    .map(m => {
      const href = m[1]
      if (href.startsWith('http')) return href
      try { return new URL(href, baseUrl).toString() } catch { return '' }
    })
    .filter(Boolean)

  // P.IVA
  const pivaMatch = text.match(/P\.?\s*IVA[:\s]+(\d{11})|Partita\s+IVA[:\s]+(\d{11})/i)
  const piva = pivaMatch ? (pivaMatch[1] || pivaMatch[2] || '') : ''

  return { emails: rawEmails, telefono, whatsapp, telegram, social, form_contatti_url: contactHrefs[0] || '', piva, text_sample: text.slice(0, 3000) }
}

const AI_ENRICH_PROMPT = `Analizza questo testo estratto da un sito web e trova:
- indirizzo fisico completo (via, città, CAP)
- orari di apertura
- altre info di contatto non già elencate

Testo:
{{TEXT}}

Contatti già trovati con regex:
Email: {{EMAILS}}
Telefono: {{TEL}}

Rispondi SOLO con JSON:
{
  "indirizzo": "",
  "orari": "",
  "note_scraping": ""
}`

export async function POST(request: Request) {
  try {
    await requireAuth()
    const { url, model, openrouter_key, gemini_key, opencode_key } = await request.json()
    if (!url) {
      return NextResponse.json({ error: 'url richiesto' }, { status: 400 })
    }

    // Validate URL
    let parsed: URL
    try {
      parsed = new URL(url.startsWith('http') ? url : `https://${url}`)
    } catch {
      return NextResponse.json({ error: 'URL non valido' }, { status: 400 })
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return NextResponse.json({ error: 'Solo HTTP/HTTPS consentiti' }, { status: 400 })
    }
    if (isPrivateHost(parsed.hostname)) {
      return NextResponse.json({ error: 'Host non raggiungibile (rete privata)' }, { status: 400 })
    }

    // Fetch HTML
    let html: string
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 12000)
      const res = await fetch(parsed.toString(), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; LeadBot/1.0; +https://socialautomation.it)',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
        },
        signal: controller.signal,
        redirect: 'follow',
      })
      clearTimeout(timer)
      if (!res.ok) {
        return NextResponse.json({ error: `Sito non raggiungibile: HTTP ${res.status}` }, { status: 502 })
      }
      const raw = await res.arrayBuffer()
      // Limita a 400KB per evitare payload enormi
      const slice = raw.byteLength > 400_000 ? raw.slice(0, 400_000) : raw
      html = new TextDecoder('utf-8', { fatal: false }).decode(slice)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      return NextResponse.json({ error: `Fetch fallito: ${msg.slice(0, 120)}` }, { status: 502 })
    }

    // Estrai contatti via regex
    const extracted = extractContactsFromHtml(html, parsed.origin)

    // Arricchisci con AI (indirizzo, orari) se il testo ha abbastanza contenuto
    let aiEnrich: Record<string, unknown> = {}
    let enrichmentOk = false
    if (extracted.text_sample.length > 200) {
      try {
        const enrichPrompt = AI_ENRICH_PROMPT
          .replace('{{TEXT}}', extracted.text_sample.slice(0, 2000))
          .replace('{{EMAILS}}', extracted.emails.join(', ') || 'nessuna')
          .replace('{{TEL}}', extracted.telefono.join(', ') || 'nessuno')

        const aiRes = await callAI({
          model: model || 'meta-llama/llama-3.3-70b-instruct:free',
          systemPrompt: 'Estrai dati strutturati da testo web. Rispondi SOLO con JSON valido.',
          userPrompt: enrichPrompt,
          openrouterKey: openrouter_key,
          geminiKey: gemini_key,
          opencodeKey: opencode_key || undefined,
          maxTokens: 500,
        })
        aiEnrich = (extractJSON(aiRes) as Record<string, unknown>) || {}
        enrichmentOk = true
      } catch {
        // Enrichment AI fallito (rate limit / JSON malformato): i dati regex core
        // (email/telefoni/social) restano validi, ma indirizzo/orari NON sono stati
        // estratti. Non fingere che sia andato tutto: enrichment_ok=false esplicito.
        aiEnrich = {}
      }
    }

    const { text_sample: _, ...regexData } = extracted

    return NextResponse.json({
      sito_analizzato: parsed.toString(),
      data_estrazione: new Date().toISOString().split('T')[0],
      ...regexData,
      indirizzo: (aiEnrich.indirizzo as string) || '',
      orari: (aiEnrich.orari as string) || '',
      enrichment_ok: enrichmentOk,
      note_scraping: (aiEnrich.note_scraping as string) || (
        enrichmentOk
          ? `Scraping reale: ${extracted.emails.length} email, ${extracted.telefono.length} telefoni, ${extracted.social.length} social trovati`
          : `Dati base estratti (${extracted.emails.length} email, ${extracted.telefono.length} telefoni). Arricchimento AI (indirizzo/orari) non disponibile — riprova o cambia modello AI.`
      ),
      fonte: 'real_scrape',
    })
  } catch (e) {
    return apiError(e)
  }
}
