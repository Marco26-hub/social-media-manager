import Link from 'next/link'
import { ArrowLeft, AlertTriangle } from 'lucide-react'
import styles from './legal.module.css'
import { TITOLARE } from '@/lib/legal-config'

// Layout condiviso per le pagine legali (Privacy, Cookie, Termini, Trasparenza AI).
// Header sticky con back, titolo, data aggiornamento, disclaimer "bozza da validare",
// e link alle altre pagine legali in fondo.
export default function LegalShell({
  eyebrow,
  title,
  children,
  currentPath,
}: {
  eyebrow: string
  title: string
  children: React.ReactNode
  currentPath: string
}) {
  const related = [
    { href: '/privacy', label: 'Privacy Policy' },
    { href: '/cookie-policy', label: 'Cookie Policy' },
    { href: '/termini', label: 'Termini e Condizioni' },
    { href: '/trasparenza-ai', label: 'Trasparenza AI' },
  ].filter(r => r.href !== currentPath)

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.back}><ArrowLeft size={16} /> Torna al sito</Link>
        <Link href="/" className={styles.headerBrand}>
          <span className={styles.headerMark}>SA</span> {TITOLARE.brand}
        </Link>
      </header>

      <div className={styles.doc}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.updated}>Ultimo aggiornamento: {TITOLARE.ultimoAggiornamento}</p>

        <div className={styles.disclaimer}>
          <AlertTriangle size={17} />
          <span>
            Documento in <strong>bozza</strong>, da validare con lo Studio Legale BCS prima della pubblicazione ufficiale.
            I campi evidenziati in rosso vanno compilati con i dati reali dell&apos;azienda.
          </span>
        </div>

        <div className={styles.body}>{children}</div>

        <div className={styles.footerNote}>
          <p>
            Titolare: {TITOLARE.ragioneSociale} · {TITOLARE.brand} · Contatti: <a href={`mailto:${TITOLARE.email}`}>{TITOLARE.email}</a>
          </p>
          <div className={styles.relatedLinks}>
            {related.map(r => <Link key={r.href} href={r.href}>{r.label}</Link>)}
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper per evidenziare i placeholder da compilare.
export function PH({ children }: { children: React.ReactNode }) {
  return <span className={styles.placeholder}>{children}</span>
}
