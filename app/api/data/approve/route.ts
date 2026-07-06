import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { dbReady, q } from '@/lib/db'
import crypto from 'crypto'
import { requireAuth, requireClienteAccess } from '@/lib/auth-utils'
import { getPublicBaseUrl } from '@/lib/base-url'
import { getTableColumns, mediaSlotColumns, selectExistingColumns } from '@/lib/db-schema'

export async function GET(request: Request) {
  try {
    if (!dbReady()) {
      return NextResponse.json({ error: 'Portale approvazione non disponibile: database non configurato' }, { status: 503 })
    }

    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) return NextResponse.json({ error: 'token richiesto' }, { status: 400 })

    const calendarioColumns = await getTableColumns('calendario')
    const mediaSelect = selectExistingColumns('c', mediaSlotColumns(), calendarioColumns).join(',\n              ')
    const rows = await q(
      `SELECT ct.*, c.canale, c.formato, c.hook, c.caption, c.hashtag, c.cta,
              ${mediaSelect},
              c.link_prodotto, c.link_prodotto_finale,
              c.data_pubblicazione, c.ora_pubblicazione, c.nome_prodotto, c.tema,
              cl.nome as cliente_nome, cl.slug as cliente_slug,
              b.social_handle, b.sito_url
       FROM approval_tokens ct
       JOIN calendario c ON c.id_contenuto = ct.contenuto_id AND c.cliente_id = ct.cliente_id::uuid
       JOIN clienti cl ON cl.id = ct.cliente_id::uuid
       LEFT JOIN brand b ON b.cliente_id = ct.cliente_id::uuid
       WHERE ct.token = $1 AND ct.expires_at > now() AND ct.status = 'pending'`,
      [token],
    )

    if (!rows.length) return NextResponse.json({ error: 'Token non valido o scaduto' }, { status: 404 })

    const row = rows[0] as Record<string, unknown>
    await q('UPDATE approval_tokens SET visualizzato_at = now() WHERE token = $1 AND visualizzato_at IS NULL', [token])

    return NextResponse.json(row)
  } catch (e) {
    console.error('[approval portal GET]', e)
    return NextResponse.json({ error: 'Portale approvazione temporaneamente non disponibile' }, { status: 503 })
  }
}

export async function PATCH(request: Request) {
  try {
    if (!dbReady()) {
      return NextResponse.json({ error: 'Portale approvazione non disponibile: database non configurato' }, { status: 503 })
    }

    const { token, status, note_cliente } = await request.json()
    if (!token || !status) {
      return NextResponse.json({ error: 'token e status richiesti' }, { status: 400 })
    }
    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'status non valido' }, { status: 400 })
    }

    const rows = await q('SELECT id, cliente_id, contenuto_id FROM approval_tokens WHERE token = $1 AND expires_at > now()', [token])
    if (!rows.length) return NextResponse.json({ error: 'Token non valido o scaduto' }, { status: 404 })

    const row = rows[0] as Record<string, string>

    // Update token
    const now = new Date().toISOString()
    await q(
      `UPDATE approval_tokens SET status = $1, note_cliente = $2, approvato_at = $3 WHERE token = $4`,
      [status, note_cliente || null, now, token],
    )

    // If approved, update calendario status
    if (status === 'approved') {
      await q(
        `UPDATE calendario SET status = 'APPROVATO', approvato_da = 'cliente', data_approvazione = $1 WHERE id_contenuto = $2 AND cliente_id = $3`,
        [now, row.contenuto_id, row.cliente_id],
      )
    }

    return NextResponse.json({ ok: true, status })
  } catch (e) {
    console.error('[approval portal PATCH]', e)
    return NextResponse.json({ error: 'Portale approvazione temporaneamente non disponibile' }, { status: 503 })
  }
}

export async function POST(request: Request) {
  try {
    await requireAuth()
    const { cliente_id, contenuto_id, email_inviato, tipo_invio } = await request.json()
    if (!cliente_id || !contenuto_id) {
      return NextResponse.json({ error: 'cliente_id e contenuto_id richiesti' }, { status: 400 })
    }
    await requireClienteAccess(cliente_id)

    const token = crypto.randomBytes(24).toString('hex')
    const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString()
    const tipo = tipo_invio === 'feedback' ? 'feedback' : 'approvazione'

    await q(
      `INSERT INTO approval_tokens (cliente_id, contenuto_id, token, email_inviato, tipo_invio, expires_at) VALUES ($1,$2,$3,$4,$5,$6)`,
      [cliente_id, contenuto_id, token, email_inviato || null, tipo, expiresAt],
    )

    return NextResponse.json({
      token,
      tipo_invio: tipo,
      url: `${getPublicBaseUrl(request)}/approve/${token}`,
    })
  } catch (e) {
    return apiError(e)
  }
}
