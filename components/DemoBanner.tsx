'use client'

export default function DemoBanner() {
  const isDemo = !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')
  if (!isDemo) return null

  return (
    <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-b border-amber-200 px-6 py-2 text-center text-sm text-amber-900">
      🎬 <strong>Demo Mode</strong> — dati finti, modifiche non salvate. Configura Supabase per attivare live.
    </div>
  )
}
