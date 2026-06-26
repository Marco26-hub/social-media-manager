import { NextResponse } from 'next/server'
import { dbReady, q } from '@/lib/db'
import { demoBlogArticoli, demoContenuti, demoLogs } from '@/lib/demo-data'
import { isDemo } from '@/lib/demo'
import { getActiveClienteId, requireAuth, requireClienteId } from '@/lib/auth-utils'

export const dynamic = 'force-dynamic'

function backupResponse(payload: unknown, clienteId: string) {
  const date = new Date().toISOString().slice(0, 10)
  const body = JSON.stringify(payload, null, 2)
  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="social-automation-backup-${clienteId}-${date}.json"`,
      'Cache-Control': 'no-store',
    },
  })
}

export async function GET() {
  try {
    await requireAuth()
    const demoMode = isDemo() || !dbReady()
    const clienteId = demoMode ? (await getActiveClienteId()) || 'demo-silkincom' : await requireClienteId()
    const exportedAt = new Date().toISOString()

    if (demoMode) {
      return backupResponse({
        version: 1,
        exported_at: exportedAt,
        mode: 'demo',
        cliente_id: clienteId,
        calendario: demoContenuti,
        blog_articoli: demoBlogArticoli,
        log_pubblicazioni: demoLogs,
      }, clienteId)
    }

    const [calendario, blogArticoli, logPubblicazioni, clienteRows] = await Promise.all([
      q('SELECT * FROM calendario WHERE cliente_id = $1 ORDER BY created_at DESC', [clienteId]),
      q('SELECT * FROM blog_articoli WHERE cliente_id = $1 ORDER BY created_at DESC', [clienteId]),
      q('SELECT * FROM log_pubblicazioni WHERE cliente_id = $1 ORDER BY timestamp DESC LIMIT 1000', [clienteId]),
      q('SELECT id, nome, slug, settore, piano, created_at, updated_at FROM clienti WHERE id = $1 LIMIT 1', [clienteId]),
    ])

    return backupResponse({
      version: 1,
      exported_at: exportedAt,
      mode: 'production',
      cliente: clienteRows[0] || { id: clienteId },
      counts: {
        calendario: calendario.length,
        blog_articoli: blogArticoli.length,
        log_pubblicazioni: logPubblicazioni.length,
      },
      calendario,
      blog_articoli: blogArticoli,
      log_pubblicazioni: logPubblicazioni,
    }, clienteId)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
