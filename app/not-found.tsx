import Link from 'next/link'
import { Home } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div className="text-center">
        <p className="text-7xl font-bold text-gray-300 mb-2">404</p>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Pagina non trovata</h2>
        <p className="text-sm text-gray-500 mb-6">La pagina cercata non esiste o è stata spostata</p>
        <Link href="/dashboard" className="btn-primary">
          <Home className="w-4 h-4" />
          Torna alla dashboard
        </Link>
      </div>
    </div>
  )
}
