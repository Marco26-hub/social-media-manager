import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { q, dbReady } from '@/lib/db'
import { AUTH_SECRET } from '@/lib/auth-secret'

declare module 'next-auth' {
  interface User { id: string; email: string; name: string }
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
          return { id: 'demo-user', email: credentials.email, name: 'Admin Demo' }
        }
        try {
          const rows = await q('SELECT id, email, nome, password_hash FROM profiles WHERE email = $1 LIMIT 1', [credentials.email])
          if (!rows.length) return null
          const user = rows[0] as { id: string; email: string; nome: string; password_hash: string }
          const valid = await bcrypt.compare(credentials.password, user.password_hash)
          if (!valid) return null
          return { id: user.id, email: user.email, name: user.nome || user.email }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          console.error('[auth credentials] database lookup failed:', message.slice(0, 500))
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) { token.id = user.id; token.email = user.email; token.name = user.name }
      return token
    },
    async session({ session, token }) {
      if (session.user) { session.user.id = token.id as string; session.user.email = token.email as string; session.user.name = token.name as string }
      return session
    },
  },
  pages: { signIn: '/login' },
  session: { strategy: 'jwt' },
  secret: AUTH_SECRET,
}
