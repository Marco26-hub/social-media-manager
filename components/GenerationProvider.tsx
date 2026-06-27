'use client'

import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'

export type GenStatus = 'running' | 'done' | 'error'

export type GenJob = {
  id: string
  key: string          // identificatore logico, es. 'piano' o 'content:instagram:post'
  label: string        // testo mostrato all'utente
  status: GenStatus
  progress: number     // 0-100
  message?: string     // messaggio risultato o errore
  href?: string        // dove vedere il risultato
  startedAt: number
}

type RunOptions = {
  key: string
  label: string
  url: string
  body: unknown
  href?: string
  estMs?: number       // durata stimata per animare la barra (default 30s)
  timeoutMs?: number   // timeout fetch (default 95s)
}

type GenerationContextValue = {
  jobs: GenJob[]
  run: <T = unknown>(opts: RunOptions) => Promise<{ ok: boolean; data?: T; error?: string }>
  isRunning: (key: string) => boolean
  dismiss: (id: string) => void
}

const GenerationContext = createContext<GenerationContextValue | null>(null)

let counter = 0
function nextId() {
  counter += 1
  return `gen_${Date.now().toString(36)}_${counter}`
}

async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.clone().json()
    if (typeof data?.error === 'string' && data.error.trim()) return data.error
    if (typeof data?.message === 'string' && data.message.trim()) return data.message
  } catch {
    try {
      const text = await res.text()
      if (text.trim()) return text.trim().slice(0, 300)
    } catch {
      /* keep fallback */
    }
  }
  return fallback
}

export function GenerationProvider({ children }: { children: React.ReactNode }) {
  const [jobs, setJobs] = useState<GenJob[]>([])
  const timers = useRef<Record<string, ReturnType<typeof setInterval>>>({})

  const clearTimer = useCallback((id: string) => {
    const t = timers.current[id]
    if (t) {
      clearInterval(t)
      delete timers.current[id]
    }
  }, [])

  useEffect(() => {
    const map = timers.current
    return () => {
      Object.values(map).forEach(clearInterval)
    }
  }, [])

  const dismiss = useCallback((id: string) => {
    clearTimer(id)
    setJobs(prev => prev.filter(j => j.id !== id))
  }, [clearTimer])

  const isRunning = useCallback(
    (key: string) => jobs.some(j => j.key === key && j.status === 'running'),
    [jobs],
  )

  const run = useCallback(async function run<T = unknown>(opts: RunOptions) {
    const { key, label, url, body, href, estMs = 30000, timeoutMs = 95000 } = opts
    const id = nextId()
    const startedAt = Date.now()

    setJobs(prev => [
      ...prev.filter(j => j.status !== 'running' || j.key !== key),
      { id, key, label, status: 'running', progress: 4, href, startedAt },
    ])

    // Avanzamento simulato: sale verso 92% in base alla durata stimata, poi 100% a fine.
    timers.current[id] = setInterval(() => {
      const elapsed = Date.now() - startedAt
      const ratio = Math.min(1, elapsed / estMs)
      const eased = 92 * (1 - Math.pow(1 - ratio, 2)) // ease-out, cap 92
      setJobs(prev => prev.map(j => (j.id === id && j.status === 'running'
        ? { ...j, progress: Math.max(j.progress, Math.round(eased)) }
        : j)))
    }, 600)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
      clearTimeout(timeout)
      clearTimer(id)

      if (!res.ok) {
        const error = await readError(res, 'Generazione fallita')
        setJobs(prev => prev.map(j => (j.id === id ? { ...j, status: 'error', progress: 100, message: error } : j)))
        return { ok: false, error }
      }

      const data = (await res.json()) as T
      setJobs(prev => prev.map(j => (j.id === id ? { ...j, status: 'done', progress: 100, message: 'Completato' } : j)))
      return { ok: true, data }
    } catch (e) {
      clearTimeout(timeout)
      clearTimer(id)
      const error = (e as Error)?.name === 'AbortError'
        ? 'Richiesta troppo lunga. Riprova o cambia modello AI.'
        : (e as Error)?.message || 'Errore di rete'
      setJobs(prev => prev.map(j => (j.id === id ? { ...j, status: 'error', progress: 100, message: error } : j)))
      return { ok: false, error }
    }
  }, [clearTimer])

  return (
    <GenerationContext.Provider value={{ jobs, run, isRunning, dismiss }}>
      {children}
    </GenerationContext.Provider>
  )
}

export function useGeneration() {
  const ctx = useContext(GenerationContext)
  if (!ctx) throw new Error('useGeneration deve stare dentro <GenerationProvider>')
  return ctx
}
