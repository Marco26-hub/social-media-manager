import { AsyncLocalStorage } from 'node:async_hooks'
import { dbReady, q } from '@/lib/db'
import { isDemo } from '@/lib/demo'

export type TokenUsage = { prompt_tokens?: unknown; completion_tokens?: unknown; total_tokens?: unknown }
export type TokenMeta = { clienteId?: string | null; tipo?: string | null; agentName?: string | null }

// Contesto propagato (senza threading di parametri) da callAI fino a logTokenUsage,
// che è chiamato in profondità nelle call*. callAI avvolge la sua esecuzione con il
// meta; le call* loggano senza saperne nulla e l'attribuzione arriva da qui.
export const tokenMetaStore = new AsyncLocalStorage<TokenMeta>()

function toInt(v: unknown): number {
  const x = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(x) && x > 0 ? Math.round(x) : 0
}

// Log BEST-EFFORT dei token consumati da una chiamata AI riuscita. Fire-and-forget:
// NON va mai awaited in modo bloccante e non deve MAI rompere la generazione. Salta
// in demo / senza DB / se non ci sono token da registrare.
export async function logTokenUsage(entry: {
  provider: string
  model: string
  usage?: TokenUsage
  meta?: TokenMeta
}): Promise<void> {
  try {
    if (isDemo() || !dbReady()) return
    const u = entry.usage || {}
    const prompt = toInt(u.prompt_tokens)
    const completion = toInt(u.completion_tokens)
    const total = toInt(u.total_tokens) || (prompt + completion)
    if (!prompt && !completion && !total) return
    // meta esplicito, altrimenti dal contesto AsyncLocalStorage impostato da callAI.
    const meta = entry.meta ?? tokenMetaStore.getStore()
    await q(
      `INSERT INTO token_usage (cliente_id, tipo, agent_name, provider, model, prompt_tokens, completion_tokens, total_tokens)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [meta?.clienteId || null, meta?.tipo || null, meta?.agentName || null,
        entry.provider, entry.model, prompt, completion, total],
    )
  } catch {
    // best-effort: il logging non deve mai influenzare la generazione.
  }
}
