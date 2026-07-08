'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

// Banner cookie leggero. Il sito usa SOLO cookie tecnici (nessuna profilazione),
// quindi la legge non impone il consenso preventivo: il banner INFORMA e permette
// di prendere atto. Se in futuro si aggiungono cookie di terze parti (analytics,
// pixel), il banner va esteso con accetta/rifiuta granulare PRIMA di installarli.
const CONSENT_KEY = 'cookie_consent'

function readConsent(): string | null {
  if (typeof document === 'undefined') return null
  const m = document.cookie.match(/(?:^|;\s*)cookie_consent=([^;]+)/)
  return m ? decodeURIComponent(m[1]) : null
}

function writeConsent(value: string) {
  const sixMonths = 60 * 60 * 24 * 182
  document.cookie = `${CONSENT_KEY}=${encodeURIComponent(value)}; Max-Age=${sixMonths}; Path=/; SameSite=Lax`
}

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!readConsent()) setVisible(true)
  }, [])

  if (!visible) return null

  const accept = () => { writeConsent('technical'); setVisible(false) }

  return (
    <div
      role="dialog"
      aria-label="Informativa cookie"
      style={{
        position: 'fixed', left: 16, right: 16, bottom: 16, zIndex: 60, maxWidth: 720, margin: '0 auto',
        display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
        padding: '16px 20px', borderRadius: 16,
        background: 'rgba(16,18,14,0.96)', color: '#fffaf0',
        border: '1px solid rgba(214,168,57,0.3)',
        boxShadow: '0 20px 50px rgba(0,0,0,0.35)', backdropFilter: 'blur(6px)',
      }}
    >
      <p style={{ margin: 0, flex: '1 1 320px', fontSize: 13.5, lineHeight: 1.5, color: 'rgba(255,250,240,0.85)' }}>
        Usiamo <strong style={{ color: '#fffaf0' }}>solo cookie tecnici</strong> necessari al funzionamento del sito (nessuna
        profilazione). Continuando, ne prendi atto. Dettagli nella{' '}
        <Link href="/cookie-policy" style={{ color: '#e7bf57', fontWeight: 700 }}>Cookie Policy</Link>.
      </p>
      <button
        onClick={accept}
        style={{
          flexShrink: 0, padding: '10px 22px', borderRadius: 999, border: 'none', cursor: 'pointer',
          background: 'linear-gradient(135deg,#e7bf57,#c39528)', color: '#10120e', fontSize: 14, fontWeight: 800,
        }}
      >
        Ho capito
      </button>
    </div>
  )
}
