import { dbReady, q } from '@/lib/db'
import { isDemo } from '@/lib/demo'
import { getActiveClienteId, requireClienteAccess } from '@/lib/auth-utils'

export type ClientGenerationContext = {
  clienteId: string | null
  cliente: Record<string, unknown> | null
  brand: Record<string, unknown> | null
  prodotti: Record<string, unknown>[]
  settings: Record<string, unknown>[]
  source: 'selected_client' | 'demo' | 'fallback'
}

export async function getClientGenerationContext(bodyClienteId?: unknown): Promise<ClientGenerationContext> {
  const requestedClienteId = typeof bodyClienteId === 'string' && bodyClienteId.trim()
    ? bodyClienteId.trim()
    : null

  if (isDemo() || !dbReady()) {
    return {
      clienteId: requestedClienteId || 'demo-silkincom',
      cliente: null,
      brand: null,
      prodotti: [],
      settings: [],
      source: 'demo',
    }
  }

  const activeClienteId = requestedClienteId || await getActiveClienteId()
  if (!activeClienteId) throw new Error('Nessun cliente selezionato')
  const clienteId = await requireClienteAccess(activeClienteId)

  const [clientRows, brandRows, prodotti, settings] = await Promise.all([
    q('SELECT * FROM clienti WHERE id = $1 LIMIT 1', [clienteId]),
    q('SELECT * FROM brand WHERE cliente_id = $1 LIMIT 1', [clienteId]),
    q("SELECT * FROM prodotti WHERE cliente_id = $1 AND prodotto_attivo = 'SI' ORDER BY priorita NULLS LAST, created_at DESC", [clienteId]),
    q('SELECT chiave, valore FROM settings WHERE cliente_id = $1', [clienteId]),
  ])

  return {
    clienteId,
    cliente: clientRows[0] || null,
    brand: brandRows[0] || null,
    prodotti,
    settings,
    source: 'selected_client',
  }
}

export function mergeBrandIdentity(context: ClientGenerationContext, fallbackBrand?: unknown) {
  const fallback = fallbackBrand && typeof fallbackBrand === 'object'
    ? fallbackBrand as Record<string, unknown>
    : {}

  return {
    ...fallback,
    ...(context.brand || {}),
    cliente: context.cliente ? {
      nome: context.cliente.nome,
      piano: context.cliente.piano,
      settore: context.cliente.settore,
      contenuti_mese: context.cliente.contenuti_mese,
    } : undefined,
    prodotti_attivi: context.prodotti.slice(0, 12),
    // SICUREZZA: NON includere i segreti nel brand — questo oggetto viene
    // serializzato nel prompt e inviato ai provider AI (OpenRouter/Gemini/…).
    // Filtra le chiavi segrete (blotato_api_key, token, password, webhook…).
    settings: context.settings.filter(s => {
      const k = typeof s.chiave === 'string' ? s.chiave.toLowerCase() : ''
      return !/(api[_-]?key|secret|token|password|webhook)/.test(k)
    }),
    contesto_fonte: context.source,
  }
}

export function brandField(brand: Record<string, unknown>, key: string, fallback = 'non specificato') {
  const value = brand[key]
  return typeof value === 'string' && value.trim() ? value : fallback
}
