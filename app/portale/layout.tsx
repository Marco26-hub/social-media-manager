import Link from 'next/link'
import { LogOut } from 'lucide-react'
import styles from './portale.module.css'

// Area CLIENTE — separata dalla dashboard operatore/admin. Look premium
// (cream/forest/gold, Fraunces) coerente con la landing. Nessuna sidebar di
// gestione: il cliente vede solo risultati, piano e pagamenti.
export default function PortaleLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <div className={styles.topInner}>
          <Link href="/portale" className={styles.brand}>
            <span className={styles.brandMark}>SA</span>
            <span className={styles.brandName}>
              <b>Social Automation</b>
              <span>Area cliente</span>
            </span>
          </Link>
          <Link href="/api/auth/signout?callbackUrl=/" className={styles.exit}>
            <LogOut size={16} />
            Esci
          </Link>
        </div>
      </header>
      <div className={styles.wrap}>{children}</div>
    </div>
  )
}
