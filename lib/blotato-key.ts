import { q } from '@/lib/db'

// Key Blotato PER-CLIENTE: ogni cliente può avere il proprio account Blotato, quindi
// la sua key. Si legge da settings (chiave 'blotato_api_key' del cliente); se assente,
// fallback alla env globale BLOTATO_API_KEY (utile per agenzia mono-account).
export async function getBlotatoKey(clienteId?: string): Promise<string | null> {
  if (clienteId) {
    try {
      const rows = await q(
        "SELECT valore FROM settings WHERE cliente_id = $1 AND chiave = 'blotato_api_key' LIMIT 1",
        [clienteId],
      )
      const val = (rows[0] as { valore?: string } | undefined)?.valore?.trim()
      if (val) return val
    } catch { /* tabella/valore assente → fallback env */ }
  }
  return process.env.BLOTATO_API_KEY?.trim() || null
}
