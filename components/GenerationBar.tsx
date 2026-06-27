'use client'

import { useGeneration } from './GenerationProvider'
import { Loader2, CheckCircle2, AlertCircle, X, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function GenerationBar() {
  const { jobs, dismiss } = useGeneration()

  if (jobs.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-[min(92vw,360px)]">
      {jobs.map(job => {
        const running = job.status === 'running'
        const error = job.status === 'error'
        const done = job.status === 'done'
        return (
          <div
            key={job.id}
            className={`rounded-2xl border shadow-lg p-4 bg-white ${
              error ? 'border-red-200' : done ? 'border-emerald-200' : 'border-gray-200'
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex-shrink-0">
                {running && <Loader2 className="w-5 h-5 text-brand-600 animate-spin" />}
                {done && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                {error && <AlertCircle className="w-5 h-5 text-red-600" />}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{job.label}</p>
                <p className={`text-xs mt-0.5 ${error ? 'text-red-600' : 'text-gray-500'}`}>
                  {running && `Generazione in corso… ${job.progress}%`}
                  {done && 'Pronto. Puoi continuare.'}
                  {error && (job.message || 'Errore')}
                </p>
              </div>
              {!running && (
                <button
                  onClick={() => dismiss(job.id)}
                  className="flex-shrink-0 text-gray-400 hover:text-gray-700"
                  aria-label="Chiudi"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Barra progresso 0-100% */}
            <div className="mt-3 h-2 w-full rounded-full bg-gray-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  error ? 'bg-red-500' : done ? 'bg-emerald-500' : 'bg-brand-600'
                }`}
                style={{ width: `${job.progress}%` }}
              />
            </div>

            {done && job.href && (
              <Link
                href={job.href}
                onClick={() => dismiss(job.id)}
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline"
              >
                Vedi risultato <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        )
      })}
    </div>
  )
}
