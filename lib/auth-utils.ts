import { getServerSession } from 'next-auth'
import { cookies } from 'next/headers'
import { authOptions } from '@/lib/auth'
import { dbReady, q } from '@/lib/db'
import { isDemo } from '@/lib/demo'

export const ACTIVE_CLIENTE_COOKIE = 'active_cliente_id'

export async function getSession() {
  return getServerSession(authOptions)
}

export async function requireAuth() {
  const session = await getSession()
  if (!session?.user?.id) {
    if (isDemo() || !dbReady()) {
      return { id: 'demo-user', email: 'demo@social-automation.local', name: 'Admin Demo' }
    }
    throw new Error('Non autenticato')
  }
  return session.user as { id: string; email: string; name: string }
}

export async function getActiveClienteId(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(ACTIVE_CLIENTE_COOKIE)?.value || null
}

export async function requireClienteId(): Promise<string> {
  const id = await getActiveClienteId()
  if (!id) throw new Error('Nessun cliente selezionato')
  return requireClienteAccess(id)
}

export async function requireClienteAccess(clienteId?: string): Promise<string> {
  const user = await requireAuth()
  const id = clienteId || await getActiveClienteId()
  if (!id) throw new Error('Nessun cliente selezionato')

  if (isDemo() || !dbReady()) return id

  const rows = await q(
    `SELECT 1
     FROM profiles p
     WHERE p.id = $1 AND p.ruolo_globale = 'super_admin'
     UNION ALL
     SELECT 1
     FROM user_client_access uca
     WHERE uca.user_id = $1
       AND uca.cliente_id = $2
       AND uca.attivo = true
     LIMIT 1`,
    [user.id, id],
  )

  if (!rows.length) throw new Error('Accesso cliente negato')
  return id
}

export async function requireAdmin() {
  const user = await requireAuth()

  if (isDemo() || !dbReady()) return user

  const rows = await q(
    `SELECT ruolo_globale
     FROM profiles
     WHERE id = $1
       AND ruolo_globale IN ('super_admin','admin')
     LIMIT 1`,
    [user.id],
  )

  if (!rows.length) throw new Error('Operazione riservata ad admin')
  return user
}
