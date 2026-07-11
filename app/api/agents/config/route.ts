import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { dbReady, q } from '@/lib/db'
import { requireAdmin } from '@/lib/auth-utils'
import { getAgentConfig, AGENT_KEYS, type AgentKey } from '@/lib/agent-config'

export const dynamic = 'force-dynamic'

// Stato/abilitazione GLOBALE degli agenti automatici. Solo admin (è configurazione
// operativa dell'agenzia). Consumato dal pannello /dashboard/agenti.
export async function GET() {
  try {
    await requireAdmin()
    return NextResponse.json(await getAgentConfig())
  } catch (e) {
    return apiError(e)
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin()
    const { agent_key, enabled } = await request.json()
    if (!AGENT_KEYS.includes(agent_key as AgentKey)) {
      return NextResponse.json({ error: 'agent_key non valido' }, { status: 400 })
    }
    if (typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'enabled deve essere boolean' }, { status: 400 })
    }
    if (!dbReady()) return NextResponse.json({ ok: true, demo: true })
    await q(
      `INSERT INTO agent_config (agent_key, enabled, updated_at)
       VALUES ($1, $2, now())
       ON CONFLICT (agent_key) DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = now()`,
      [agent_key, enabled],
    )
    return NextResponse.json({ ok: true, agent_key, enabled })
  } catch (e) {
    return apiError(e)
  }
}
