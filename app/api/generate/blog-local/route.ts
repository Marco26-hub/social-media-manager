import { NextResponse } from 'next/server'
import { dbReady, q } from '@/lib/db'
import { requireAuth, requireClienteAccess } from '@/lib/auth-utils'
import { isDemo } from '@/lib/demo'
import { getClientGenerationContext } from '@/lib/client-context'
import { generateBlogLocal } from '@/lib/blog-pipeline'
import { safeImageUrl } from '@/lib/blog-render'
import { ollamaBaseUrl } from '@/lib/local-only'
import { upsertBlogCalendarEntry } from '@/lib/blog-calendar'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // pipeline locale multi-step può durare alcuni minuti

// Quali modelli Ollama sono installati? (per scegliere il modello ricerca migliore)
async function installedOllama(): Promise<string[]> {
  try {
    const c = new AbortController()
    const t = setTimeout(() => c.abort(), 1500)
    const r = await fetch(`${ollamaBaseUrl()}/api/tags`, { signal: c.signal })
    clearTimeout(t)
    if (!r.ok) return []
    const d = await r.json()
    return Array.isArray(d?.models) ? d.models.map((m: { name?: string }) => m.name).filter(Boolean) : []
  } catch { return [] }
}

export async function POST(request: Request) {
  try {
    await requireAuth()
    const { cliente_id, model, tema, prodotti_linkati, cover_image } = await request.json()
    if (!tema || !String(tema).trim()) {
      return NextResponse.json({ error: 'Scrivi di cosa parla l\'articolo (tema).' }, { status: 400 })
    }

    const clientContext = await getClientGenerationContext(cliente_id)
    const effectiveClienteId = clientContext.clienteId
    if (!effectiveClienteId) return NextResponse.json({ error: 'Nessun cliente selezionato' }, { status: 400 })
    await requireClienteAccess(effectiveClienteId)

    // Verifica che Ollama (AIM locale) sia attivo, altrimenti messaggio chiaro per inesperti.
    const installed = await installedOllama()
    if (installed.length === 0) {
      return NextResponse.json(
        { error: 'La tua AI locale (Ollama) è spenta. Aprila dal Centro di Controllo in dashboard, poi riprova.' },
        { status: 503 },
      )
    }

    // Scelta modelli LOCALI: scrittura = modello selezionato se locale, altrimenti gemma4.
    // Ricerca keyword = llama3.1:8b se installato (128K contesto), altrimenti stesso modello scrittura.
    const writeModel = typeof model === 'string' && model.startsWith('ollama/') ? model : 'ollama/gemma4:e4b'
    const writeTag = writeModel.replace('ollama/', '')
    if (!installed.includes(writeTag)) {
      return NextResponse.json(
        { error: `Il modello locale "${writeTag}" non è scaricato. Esegui: ollama pull ${writeTag}` },
        { status: 503 },
      )
    }
    const researchModel = installed.includes('llama3.1:8b') ? 'ollama/llama3.1:8b' : writeModel

    let brand: Record<string, unknown> | null = null
    let prodotti: Record<string, unknown>[] = []
    if (!isDemo() && dbReady()) {
      const [brandRows, products] = await Promise.all([
        q('SELECT * FROM brand WHERE cliente_id = $1 LIMIT 1', [effectiveClienteId]),
        q('SELECT * FROM prodotti WHERE cliente_id = $1', [effectiveClienteId]),
      ])
      brand = brandRows[0] ?? null
      prodotti = products as Record<string, unknown>[]
    }

    const { article, steps } = await generateBlogLocal({
      tema: String(tema).trim(),
      brand,
      prodotti,
      writeModel,
      researchModel,
    })

    // Solo URL http(s): blocca javascript:/data: prima di persistere (XSS su src).
    const cover = safeImageUrl(cover_image)

    // Persisti su Neon (stessa tabella della generazione cloud)
    if (!isDemo() && dbReady()) {
      // ON CONFLICT: la tabella ha unique(cliente_id, slug). Rigenerare lo stesso
      // tema produce lo stesso slug → senza questo l'INSERT crasherebbe (duplicate key).
      // Aggiorna la bozza esistente invece di fallire.
      await q(
        `INSERT INTO blog_articoli (
          cliente_id, slug, meta_title, meta_description, h1, intro, sezioni, faq,
          cta_finale, keywords_target, prodotti_linkati, tempo_lettura_min, immagine_cover, autore, status
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
        ON CONFLICT (cliente_id, slug) DO UPDATE SET
          meta_title = EXCLUDED.meta_title, meta_description = EXCLUDED.meta_description,
          h1 = EXCLUDED.h1, intro = EXCLUDED.intro, sezioni = EXCLUDED.sezioni, faq = EXCLUDED.faq,
          cta_finale = EXCLUDED.cta_finale, keywords_target = EXCLUDED.keywords_target,
          prodotti_linkati = EXCLUDED.prodotti_linkati, tempo_lettura_min = EXCLUDED.tempo_lettura_min,
          immagine_cover = EXCLUDED.immagine_cover, autore = EXCLUDED.autore,
          status = 'DA_APPROVARE', updated_at = now()`,
        [
          effectiveClienteId, article.slug, article.meta_title, article.meta_description,
          article.h1, article.intro, JSON.stringify(article.sezioni), JSON.stringify(article.faq),
          article.cta_finale, JSON.stringify(article.keywords_target),
          JSON.stringify(prodotti_linkati || []), article.tempo_lettura_min,
          cover, 'AIM Locale', 'DA_APPROVARE',
        ],
      )
      const calendarioId = await upsertBlogCalendarEntry({
        clienteId: effectiveClienteId,
        slug: article.slug,
        title: article.h1 || article.meta_title,
        intro: article.intro,
        metaDescription: article.meta_description,
        cta: article.cta_finale,
        coverUrl: cover,
        tema: String(tema).trim(),
      })
      return NextResponse.json({
        ok: true,
        generated_by: `${writeModel}${researchModel !== writeModel ? ` + ${researchModel}` : ''} (locale)`,
        steps,
        calendar_id: calendarioId,
        article: { ...article, immagine_cover: cover },
      })
    }

    return NextResponse.json({
      ok: true,
      generated_by: `${writeModel}${researchModel !== writeModel ? ` + ${researchModel}` : ''} (locale)`,
      steps,
      article: { ...article, immagine_cover: cover },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore generazione blog locale'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
