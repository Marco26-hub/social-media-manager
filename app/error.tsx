'use client'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { useEffect } from 'react'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div className="max-w-md w-full card p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6 text-red-600" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Si è verificato un errore</h2>
        <p className="text-sm text-gray-500 mb-4">{error.message || 'Errore sconosciuto'}</p>
        {error.digest && <p className="text-[10px] text-gray-400 font-mono mb-4">ID: {error.digest}</p>}
        <button onClick={reset} className="btn-primary justify-center w-full">
          <RefreshCw className="w-4 h-4" />
          Riprova
        </button>
      </div>
    </div>
  )
}
