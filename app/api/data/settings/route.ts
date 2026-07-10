import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { dbReady, q } from '@/lib/db'
import { requireAuth, requireClienteId } from '@/lib/auth-utils'
import { isDemo } from '@/lib/demo'
import { demoSettings } from '@/lib/demo-data'

// Chiavi il cui valore è un segreto: NON va mai restituito in chiaro dal GET.
// La UI mostra il valore mascherato; per cambiarlo l'utente reinserisce (POST/PATCH).
const SECRET_KEY_RE = /(api_key|api-key|apikey|secret|token|password|webhook_secret)/i

function maskSecret(value: string): string {
  const v = String(value || '')
  if (!v) return ''
  if (v.length <= 4) return '••••'
  return `••••••${v.slice(-4)}`
}

function maskSettingsRow(row: Record<string, unknown>): Record<string, unknown> {
  const chiave = String(row.chiave || '')
  if (SECRET_KEY_RE.test(chiave) && row.valore) {
    return { ...row, valore: maskSecret(String(row.valore)), is_secret: true, has_value: true }
  }
  return row
}

export async function GET() {
  try {
    await requireAuth()
    if (isDemo() || !dbReady()) return NextResponse.json(demoSettings)
    const cid = await requireClienteId()
    const rows = await q('SELECT * FROM settings WHERE cliente_id = $1 ORDER BY chiave', [cid])
    // Maschera i valori segreti (es. blotato_api_key) prima di uscire dal server.
    const masked = (rows as Record<string, unknown>[]).map(maskSettingsRow)
    return NextResponse.json(masked)
  } catch (e) {
    return apiError(e)
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAuth()
    if (isDemo() || !dbReady()) return NextResponse.json({ ok: true, demo: true })
    const cid = await requireClienteId()
    const { id, valore } = await request.json()
    if (!id) return NextResponse.json({ error: 'id richiesto' }, { status: 400 })
    // Non riscrivere il placeholder mascherato: se l'utente salva senza toccare il
    // segreto, il valore in arrivo è "••••••xxxx" → ignora l'update per non corromperlo.
    if (typeof valore === 'string' && valore.includes('••••')) {
      return NextResponse.json({ ok: true, unchanged: true, note: 'Valore mascherato: nessuna modifica applicata al segreto.' })
    }
    await q('UPDATE settings SET valore = $1 WHERE id = $2 AND cliente_id = $3', [valore, id, cid])
    return NextResponse.json({ ok: true })
  } catch (e) {
    return apiError(e)
  }
}

// Upsert per chiave: crea o aggiorna una setting del cliente attivo (es. blotato_api_key).
// Serve per impostazioni non seed-ate a priori (key per-cliente).
export async function POST(request: Request) {
  try {
    await requireAuth()
    const { chiave, valore, descrizione } = await request.json()
    if (!chiave || typeof chiave !== 'string') return NextResponse.json({ error: 'chiave richiesta' }, { status: 400 })
    // Whitelist di valori per le chiavi enum (evita stati non validi che il motore
    // AUTO poi non saprebbe interpretare).
    if (chiave === 'generation_mode' && !['MANUAL', 'AUTO'].includes(String(valore ?? '').toUpperCase())) {
      return NextResponse.json({ error: 'generation_mode deve essere MANUAL o AUTO' }, { status: 400 })
    }
    // Stesso guard del PATCH: non salvare il placeholder mascherato al posto del segreto.
    if (typeof valore === 'string' && valore.includes('••••')) {
      return NextResponse.json({ ok: true, unchanged: true, note: 'Valore mascherato: nessuna modifica applicata.' })
    }
    if (isDemo() || !dbReady()) return NextResponse.json({ ok: true, demo: true })
    const cid = await requireClienteId()
    await q(
      `INSERT INTO settings (cliente_id, chiave, valore, descrizione)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (cliente_id, chiave) DO UPDATE SET valore = EXCLUDED.valore, updated_at = now()`,
      [cid, chiave, String(valore ?? ''), descrizione || null],
    )
    return NextResponse.json({ ok: true })
  } catch (e) {
    return apiError(e)
  }
}
