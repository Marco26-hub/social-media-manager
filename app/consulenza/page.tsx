'use client'

export const dynamic = 'force-dynamic'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, Scale, ShieldCheck, CheckCircle2, Clock } from 'lucide-react'

const C = {
  ink: '#10120e', forest: '#223f2c', moss: '#617c45', gold: '#c39528', goldSoft: '#e7bf57', cream: '#fffaf0',
}

function ConsulenzaForm() {
  const params = useSearchParams()
  const esito = params.get('esito')

  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')
  const [messaggio, setMessaggio] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const res = await fetch('/api/consulenza', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, email, telefono, messaggio }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Errore. Riprova.'); setLoading(false); return }
      if (data.checkout_url) { window.location.href = data.checkout_url; return }
      if (data.demo) { setError(data.message || 'Non disponibile in demo.'); setLoading(false); return }
      setPending(true)
    } catch { setError('Errore di rete. Riprova.'); setLoading(false) }
  }

  const box: React.CSSProperties = {
    maxWidth: 560, margin: '0 auto', background: C.cream, borderRadius: 24,
    border: '1px solid rgba(16,18,14,0.1)', padding: '32px 30px', boxShadow: '0 24px 60px rgba(16,18,14,0.1)',
  }
  const input: React.CSSProperties = {
    width: '100%', padding: '11px 13px', borderRadius: 10, border: '1px solid rgba(16,18,14,0.18)',
    fontSize: 15, marginTop: 5, background: '#fff', color: C.ink,
  }
  const label: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: C.forest }

  if (esito === 'ok') {
    return (
      <div style={box}>
        <span style={{ display: 'grid', placeItems: 'center', width: 60, height: 60, margin: '0 auto 16px', borderRadius: 999, background: 'rgba(97,124,69,0.15)', color: C.moss }}><CheckCircle2 size={32} /></span>
        <h1 style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 26, textAlign: 'center', margin: '0 0 8px', color: C.ink }}>Pagamento ricevuto</h1>
        <p style={{ textAlign: 'center', color: 'rgba(16,18,14,0.72)', fontSize: 15, lineHeight: 1.6 }}>
          Grazie! La tua consulenza è confermata. Ti contattiamo via email per fissare l&apos;appuntamento con l&apos;Avvocato dello Studio BCS.
        </p>
        <div style={{ textAlign: 'center', marginTop: 20 }}><Link href="/" style={{ color: C.gold, fontWeight: 700 }}>Torna al sito</Link></div>
      </div>
    )
  }

  if (pending) {
    return (
      <div style={box}>
        <h1 style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 24, textAlign: 'center', margin: '0 0 8px', color: C.ink }}>Richiesta registrata</h1>
        <p style={{ textAlign: 'center', color: 'rgba(16,18,14,0.72)', fontSize: 15, lineHeight: 1.6 }}>Ti contattiamo a breve per completare la prenotazione.</p>
        <div style={{ textAlign: 'center', marginTop: 20 }}><Link href="/" style={{ color: C.gold, fontWeight: 700 }}>Torna al sito</Link></div>
      </div>
    )
  }

  return (
    <div style={box}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.gold, marginBottom: 10 }}>
        <Scale size={14} /> Consulenza Legale AI &amp; GDPR
      </span>
      <h1 style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 30, lineHeight: 1.1, margin: '0 0 6px', color: C.ink }}>Prenota la consulenza</h1>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
        <span style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 34, fontWeight: 700, color: C.ink }}>€150</span>
        <span style={{ fontSize: 14, color: 'rgba(16,18,14,0.6)', display: 'inline-flex', alignItems: 'center', gap: 5 }}><Clock size={14} /> 30 minuti</span>
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: '10px 0 20px', display: 'grid', gap: 7 }}>
        {['Avvocato Cassazionista Studio BCS', 'Parere scritto sintetico incluso', 'Pagamento sicuro con Stripe'].map(t => (
          <li key={t} style={{ display: 'flex', gap: 8, fontSize: 14, color: 'rgba(16,18,14,0.8)' }}><CheckCircle2 size={15} style={{ color: C.moss, flexShrink: 0, marginTop: 2 }} /> {t}</li>
        ))}
      </ul>

      {esito === 'annullato' && (
        <p style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(224,100,60,0.12)', color: '#a23b1e', fontSize: 13.5, marginBottom: 14 }}>
          Pagamento annullato. Puoi riprovare quando vuoi.
        </p>
      )}
      {error && <p style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(224,100,60,0.12)', color: '#a23b1e', fontSize: 13.5, marginBottom: 14 }}>{error}</p>}

      <form onSubmit={submit} style={{ display: 'grid', gap: 13 }}>
        <label style={label}>Nome e cognome
          <input style={input} value={nome} onChange={e => setNome(e.target.value)} required placeholder="Mario Rossi" />
        </label>
        <label style={label}>Email
          <input style={input} type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="mario@azienda.it" />
        </label>
        <label style={label}>Telefono (opzionale)
          <input style={input} value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="+39 ..." />
        </label>
        <label style={label}>Di cosa vuoi parlare? (opzionale)
          <textarea style={{ ...input, minHeight: 72, resize: 'vertical' }} value={messaggio} onChange={e => setMessaggio(e.target.value)} placeholder="Es. adeguamento AI Act, privacy dati clienti, contratti..." />
        </label>
        <button type="submit" disabled={loading} style={{
          marginTop: 4, padding: '13px 20px', borderRadius: 999, border: 'none', cursor: loading ? 'default' : 'pointer',
          background: 'linear-gradient(135deg,#e7bf57,#c39528)', color: C.ink, fontSize: 15, fontWeight: 800,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: loading ? 0.7 : 1,
        }}>
          {loading ? 'Attendi…' : <>Paga €150 e prenota <Scale size={17} /></>}
        </button>
      </form>
      <p style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 14, fontSize: 12.5, color: 'rgba(16,18,14,0.55)' }}>
        <ShieldCheck size={14} /> Pagamento gestito da Stripe. Consulenza erogata dallo Studio Legale BCS.
      </p>
    </div>
  )
}

export default function ConsulenzaPage() {
  return (
    <main style={{ minHeight: '100vh', background: 'linear-gradient(180deg,#f3ede0,#fffaf0)', padding: '24px 18px 70px' }}>
      <div style={{ maxWidth: 560, margin: '0 auto 20px' }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: '#223f2c', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
          <ArrowLeft size={16} /> Torna al sito
        </Link>
      </div>
      <Suspense fallback={<div style={{ textAlign: 'center', color: '#223f2c' }}>Caricamento…</div>}>
        <ConsulenzaForm />
      </Suspense>
    </main>
  )
}
