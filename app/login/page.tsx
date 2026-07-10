'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

type AccessHint = {
  enabled: boolean
  mode: 'demo' | 'production-hint'
  // Presenti SOLO in demo: in production-hint l'API non rivela le credenziali admin.
  username?: string
  password?: string
  note?: string
}

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [isDemo, setIsDemo]     = useState(false)
  const [accessHint, setAccessHint] = useState<AccessHint | null>(null)
  const router = useRouter()

  // Check demo mode and auto-login
  useEffect(() => {
    async function checkDemo() {
      try {
        const res = await fetch('/api/system/health')
        const data = await res.json()
        const hintRes = await fetch('/api/system/access')
        const hint = hintRes.ok ? await hintRes.json() as AccessHint : null
        if (hint?.enabled) {
          setAccessHint(hint)
          // In production-hint username/password sono assenti: non pre-compilare.
          if (hint.username) setEmail(hint.username)
          if (hint.password) setPassword(hint.password)
        }
        if (data.mode === 'demo') {
          setIsDemo(true)
          setLoading(true)
          const result = await signIn('credentials', {
            email: hint?.username || 'admin',
            password: hint?.password || '1234567',
            redirect: false,
          })
          if (result?.ok) {
            router.push('/dashboard/clienti')
          } else {
            setLoading(false)
          }
        }
      } catch {
        // Not in demo mode, show login form
      }
    }
    checkDemo()
  }, [router])

  function fillAccessHint() {
    if (!accessHint?.username || !accessHint?.password) return
    setEmail(accessHint.username)
    setPassword(accessHint.password)
    setError('')
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await signIn('credentials', { email, password, redirect: false })
    if (res?.error) {
      const err = res.error || ''
      if (/IN_ATTESA/.test(err)) {
        setError('Account in attesa di attivazione. Ti avvisiamo via email appena è pronto.')
      } else if (/RIFIUTATO|NON_ATTIVO/.test(err)) {
        setError('Questo account non è attivo. Contattaci per assistenza.')
      } else {
        setError('Credenziali non valide')
      }
      setLoading(false)
    } else {
      router.push('/dashboard/clienti')
    }
  }

  if (isDemo && loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sidebar">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-600 rounded-2xl mb-4 animate-pulse">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Social Automation</h1>
          <p className="text-gray-400 text-sm">Accesso demo in corso...</p>
          <div className="mt-4 rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-left text-xs text-gray-200">
            <p className="font-semibold text-white">Accesso Admin Demo</p>
            <p className="mt-1">Utente: <span className="font-mono">{accessHint?.username || 'admin'}</span></p>
            <p>Password: <span className="font-mono">{accessHint?.password || '1234567'}</span></p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-sidebar">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-600 rounded-2xl mb-4">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Social Automation</h1>
          <p className="text-gray-400 text-sm mt-1">Automazione contenuti</p>
        </div>
        <div className="card p-6">
          {(isDemo || accessHint) && (
            <div className="mb-4 p-3 bg-brand-50 rounded-lg border border-brand-200">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-brand-700 font-medium">Accesso Admin</p>
                  {/* Credenziali mostrate SOLO in demo (non segrete). In production-hint
                      l'API non le rivela: mostriamo solo la nota. */}
                  {accessHint?.username && accessHint?.password && (
                    <p className="text-xs text-brand-600 mt-1">
                      Utente: <span className="font-mono font-semibold">{accessHint.username}</span>
                      {' '}· Password: <span className="font-mono font-semibold">{accessHint.password}</span>
                    </p>
                  )}
                  {accessHint?.note && <p className="text-[11px] text-brand-500 mt-1">{accessHint.note}</p>}
                </div>
                {accessHint?.username && accessHint?.password && (
                  <button type="button" onClick={fillAccessHint} className="text-xs px-2 py-1 rounded-md bg-white text-brand-700 border border-brand-200 hover:bg-brand-100">
                    Compila
                  </button>
                )}
              </div>
            </div>
          )}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input type="text" value={email} onChange={e => setEmail(e.target.value)} className="input" placeholder="admin" required autoComplete="username" />
            </div>
            <div>
              <label className="label">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="input" placeholder="••••••••" required autoComplete="current-password" />
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <button type="submit" className="btn-primary w-full justify-center" disabled={loading}>{loading ? 'Accesso...' : 'Accedi'}</button>
          </form>
        </div>
      </div>
    </div>
  )
}
