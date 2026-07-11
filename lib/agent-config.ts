import { dbReady, q } from '@/lib/db'

export const AGENT_KEYS = ['content', 'seo', 'ads', 'report', 'competitor'] as const
export type AgentKey = typeof AGENT_KEYS[number]

// Abilitazione GLOBALE (agenzia) di un agente. Riga assente o DB non pronto =
// abilitato (default fail-open: un agente non deve smettere di girare per una config
// mancante; il gate reale "chi" è generation_mode per-cliente). Ritorna true/false.
export async function isAgentEnabled(key: AgentKey): Promise<boolean> {
  if (!dbReady()) return true
  try {
    const rows = await q('SELECT enabled FROM agent_config WHERE agent_key = $1 LIMIT 1', [key])
    if (!rows.length) return true
    return Boolean((rows[0] as { enabled: unknown }).enabled)
  } catch {
    return true
  }
}

// Stato di tutti gli agenti (per il pannello). Default true per le chiavi mancanti.
export async function getAgentConfig(): Promise<Record<AgentKey, boolean>> {
  const out = Object.fromEntries(AGENT_KEYS.map(k => [k, true])) as Record<AgentKey, boolean>
  if (!dbReady()) return out
  try {
    const rows = await q('SELECT agent_key, enabled FROM agent_config') as Array<{ agent_key: string; enabled: unknown }>
    for (const r of rows) {
      if ((AGENT_KEYS as readonly string[]).includes(r.agent_key)) out[r.agent_key as AgentKey] = Boolean(r.enabled)
    }
  } catch { /* default tutti abilitati */ }
  return out
}
