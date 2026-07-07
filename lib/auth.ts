import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { q, dbReady } from '@/lib/db'
import { AUTH_SECRET } from '@/lib/auth-secret'

declare module 'next-auth' {
  interface User { id: string; email: string; name: string; ruolo?: string }
  interface Session { user: User }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Login',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        if (!dbReady()) {
          // Fail-closed in produzione: se DATABASE_URL manca in prod NON promuovere
          // chiunque a super_admin. La modalità demo con login libero è consentita
          // solo se il flag NEXT_PUBLIC_DEMO_MODE è esplicito o non siamo in prod.
          if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_DEMO_MODE !== 'true') {
            console.error('[auth] DATABASE_URL missing in production — refuse login (fail-closed)')
            return null
          }
          return { id: 'demo-user', email: credentials.email, name: 'Admin Demo', ruolo: 'super_admin' }
        }
        try {
          const rows = await q('SELECT id, email, nome, password_hash, status, ruolo_globale FROM profiles WHERE email = $1 LIMIT 1', [credentials.email])
          if (!rows.length) return null
          const user = rows[0] as { id: string; email: string; nome: string; password_hash: string; status?: string; ruolo_globale?: string }
          const valid = await bcrypt.compare(credentials.password, user.password_hash)
          if (!valid) return null
          // Gate attivazione (fail-closed): entra SOLO chi è 'active'.
          if (user.status === 'pending') throw new Error('IN_ATTESA')
          if (user.status === 'rejected') throw new Error('RIFIUTATO')
          if (user.status && user.status !== 'active') throw new Error('NON_ATTIVO')
          return { id: user.id, email: user.email, name: user.nome || user.email, ruolo: user.ruolo_globale || 'user' }
        } catch (error) {
          // Errori di gate espliciti: propaga a NextAuth per mostrare il messaggio.
          if (error instanceof Error && ['IN_ATTESA', 'RIFIUTATO', 'NON_ATTIVO'].includes(error.message)) throw error
          const message = error instanceof Error ? error.message : String(error)
          console.error('[auth credentials] database lookup failed:', message.slice(0, 500))
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) { token.id = user.id; token.email = user.email; token.name = user.name; token.ruolo = user.ruolo }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.email = token.email as string
        session.user.name = token.name as string
        session.user.ruolo = token.ruolo as string
      }
      return session
    },
  },
  pages: { signIn: '/login' },
  session: { strategy: 'jwt' },
  secret: AUTH_SECRET,
}
