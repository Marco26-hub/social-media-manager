'use client'

import { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'

// Pulsante "torna su" — appare dopo lo scroll, riporta in cima in modo fluido.
export default function BackToTop() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 640)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  function toTop() {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
  }

  return (
    <button
      type="button"
      onClick={toTop}
      aria-label="Torna su"
      title="Torna su"
      style={{
        position: 'fixed',
        right: '20px',
        bottom: '20px',
        zIndex: 60,
        width: '46px',
        height: '46px',
        display: 'grid',
        placeItems: 'center',
        borderRadius: '999px',
        border: '1px solid rgba(16,18,14,0.12)',
        background: '#10120e',
        color: '#fffaf0',
        boxShadow: '0 14px 34px rgba(16,18,14,0.28)',
        cursor: 'pointer',
        opacity: show ? 1 : 0,
        transform: show ? 'translateY(0) scale(1)' : 'translateY(12px) scale(0.9)',
        pointerEvents: show ? 'auto' : 'none',
        transition: 'opacity 0.3s ease, transform 0.3s cubic-bezier(0.22,1,0.36,1)',
      }}
    >
      <ArrowUp size={20} />
    </button>
  )
}
