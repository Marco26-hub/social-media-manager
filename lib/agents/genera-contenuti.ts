import { q } from '@/lib/db'
import { callAI, extractJSON } from '@/lib/ai'
import { brandField } from '@/lib/client-context'
import { PRO_COPY_STANDARDS, SEO_GEO_STANDARDS, pickAngle, proSystemPrompt } from '@/lib/prompt-standards'
import { insertCalendarioRow } from '@/lib/calendario-insert'

type Row = Record<string, unknown>

export type AgentResult = { clienteId: string; generati: number; errori: string[] }
export type AiKeys = { model?: string; openrouterKey?: string; geminiKey?: string; opencodeKey?: string }

// Carica il contesto cliente SENZA guardia di sessione: il chiamante è un job
// autenticato via CRON_SECRET e il clienteId arriva già validato dalla query dei
// clienti AUTO. Non riusa getClientGenerationContext perché quella passa da
// requireClienteAccess (che richiede una sessione utente).
async function loadContext(clienteId: string): Promise<{ cliente: Row | null; brand: Row | null; prodotti: Row[] }> {
  const [cli, br, prod] = await Promise.all([
    q('SELECT * FROM clienti WHERE id = $1 LIMIT 1', [clienteId]),
    q('SELECT * FROM brand WHERE cliente_id = $1 LIMIT 1', [clienteId]),
    q("SELECT * FROM prodotti WHERE cliente_id = $1 AND prodotto_attivo = 'SI' ORDER BY priorita NULLS LAST, created_at DESC LIMIT 12", [clienteId]),
  ])
  return { cliente: (cli[0] as Row) || null, brand: (br[0] as Row) || null, prodotti: prod as Row[] }
}

function pickStr(obj: Row, keys: string[]): string {
  for (const k of keys) {
    const v = obj[k]
    if (typeof v === 'string' && v.trim()) return v.trim()
    if (Array.isArray(v) && v.length) return v.filter(x => typeof x === 'string').join(' ')
  }
  return ''
}

function tomorrow(): string {
  return new Date(Date.now() + 86400000).toISOString().split('T')[0]
}

function buildUserPrompt(p: {
  canale: string; nomeBrand: string; settore: string; tono: string; tema: string
  prodotto?: Row; angle: string
}): string {
  const prodInfo = p.prodotto
    ? `Prodotto in focus: ${p.prodotto.nome_prodotto || p.tema}${p.prodotto.categoria ? ` (${p.prodotto.categoria})` : ''}.`
    : `Focus sul brand nel suo insieme (nessun prodotto specifico).`
  return `Genera UN post social pronto per l'approvazione umana.

Brand: ${p.nomeBrand} — settore: ${p.settore} — tono di voce: ${p.tono}.
Canale: ${p.canale}. ${prodInfo}
Angolo creativo da usare: ${p.angle}.

${PRO_COPY_STANDARDS}

${SEO_GEO_STANDARDS}

Rispondi SOLO con JSON valido, nessun altro testo:
{
  "hook": "prima riga che ferma lo scroll",
  "caption": "testo completo del post, pronto da pubblicare (no placeholder)",
  "hashtag": "hashtag pertinenti separati da spazio",
  "cta": "call to action",
  "angle": "${p.angle}"
}`
}

// SKILL dell'agente: copy social brand-aware. Genera N bozze e le scrive nel
// calendario in stato DA_APPROVARE (l'umano approva prima di pubblicare — il
// valore "approvazione umana" del prodotto resta intatto). NON pubblica nulla.
export async function generaContenutiPerCliente(
  clienteId: string,
  opts: { count?: number; canali?: string[]; aiKeys?: AiKeys } = {},
): Promise<AgentResult> {
  const count = Math.max(1, Math.min(opts.count ?? 2, 5))
  const canali = opts.canali?.length ? opts.canali : ['instagram']
  const { cliente, brand, prodotti } = await loadContext(clienteId)
  const brandObj: Row = brand || {}
  const cliObj: Row = cliente || {}
  const settore = brandField(brandObj, 'settore', brandField(cliObj, 'settore', 'generico'))
  const nomeBrand = brandField(brandObj, 'nome', brandField(cliObj, 'nome', 'il brand'))
  const tono = brandField(brandObj, 'tono_voce', 'professionale')

  const errori: string[] = []
  let generati = 0

  for (let i = 0; i < count; i++) {
    const canale = canali[i % canali.length]
    const prodotto = prodotti.length ? prodotti[i % prodotti.length] : undefined
    const tema = (prodotto?.nome_prodotto as string) || nomeBrand
    try {
      const systemPrompt = proSystemPrompt('social media manager senior', { settore, brand: nomeBrand, quality: 'alta' })
      const userPrompt = buildUserPrompt({ canale, nomeBrand, settore, tono, tema, prodotto, angle: pickAngle() })
      const raw = await callAI({
        model: opts.aiKeys?.model || 'gemini-2.5-flash',
        systemPrompt,
        userPrompt,
        openrouterKey: opts.aiKeys?.openrouterKey,
        geminiKey: opts.aiKeys?.geminiKey,
        opencodeKey: opts.aiKeys?.opencodeKey,
        maxTokens: 900,
      })
      const parsed = (extractJSON(raw) as Row) || {}
      const caption = pickStr(parsed, ['caption', 'testo', 'didascalia'])
      if (!caption) { errori.push(`${canale}: caption vuota dall'AI`); continue }
      const id = `auto-${clienteId.slice(0, 8)}-${Date.now()}-${i}`
      await insertCalendarioRow(
        ['cliente_id', 'id_contenuto', 'data_pubblicazione', 'ora_pubblicazione', 'canale', 'formato',
          'tema', 'hook', 'caption', 'hashtag', 'cta', 'note', 'status', 'media_type',
          'production_cycle_stage', 'angle', 'fonte_generazione'],
        [clienteId, id, tomorrow(), '10:00', canale, 'post',
          tema, pickStr(parsed, ['hook', 'gancio']) || null, caption,
          pickStr(parsed, ['hashtag', 'hashtags']) || null, pickStr(parsed, ['cta']) || null,
          JSON.stringify(parsed).slice(0, 3000), 'DA_APPROVARE', 'image',
          'review', pickStr(parsed, ['angle', 'angolo']) || null, 'agente_auto'],
      )
      generati++
    } catch (e) {
      errori.push(`${canale}: ${(e instanceof Error ? e.message : String(e)).slice(0, 120)}`)
    }
  }

  return { clienteId, generati, errori }
}
