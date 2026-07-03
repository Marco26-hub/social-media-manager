import { isDemo } from '@/lib/demo'

// Unica fonte del secret NextAuth, usata sia da lib/auth.ts (Node, getServerSession)
// sia da middleware.ts (Edge, getToken). Se divergono, il middleware verifica il JWT
// con un secret diverso da quello usato per firmarlo e rifiuta sessioni valide.
export const AUTH_SECRET: string | undefined =
  process.env.AUTH_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  (process.env.NODE_ENV === 'production' && !isDemo() ? undefined : 'dev-secret-change-in-development')
