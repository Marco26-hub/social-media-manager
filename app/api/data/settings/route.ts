import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { dbReady, q } from '@/lib/db'
import { requireAuth, requireClienteId } from '@/lib/auth-utils'
import { isDemo } from '@/lib/demo'
import { demoSettings } from '@/lib/demo-data'

export async function GET() {
  try {
    await requireAuth()
    if (isDemo() || !dbReady()) return NextResponse.json(demoSettings)
    const cid = await requireClienteId()
    const rows = await q('SELECT * FROM settings WHERE cliente_id = $1 ORDER BY chiave', [cid])
    return NextResponse.json(rows)
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
