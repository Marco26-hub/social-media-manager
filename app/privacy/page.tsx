import type { Metadata } from 'next'
import LegalShell, { PH } from '@/components/LegalShell'
import { TITOLARE, SUB_RESPONSABILI } from '@/lib/legal-config'
import styles from '@/components/legal.module.css'

export const metadata: Metadata = {
  title: 'Privacy Policy — Social Automation',
  description: 'Informativa sul trattamento dei dati personali ai sensi del Regolamento UE 2016/679 (GDPR).',
  robots: { index: true, follow: true },
}

function val(v: string) {
  return v.startsWith('[DA COMPILARE') ? <PH>{v}</PH> : v
}

export default function PrivacyPage() {
  return (
    <LegalShell eyebrow="Informativa Privacy · GDPR" title="Privacy Policy" currentPath="/privacy">
      <p>
        La presente informativa descrive le modalità di trattamento dei dati personali degli utenti che
        consultano il sito e utilizzano i servizi di {TITOLARE.brand}, ai sensi dell&apos;art. 13 del
        <strong> Regolamento UE 2016/679 (GDPR)</strong> e del D.Lgs. 196/2003 (Codice Privacy) come modificato dal D.Lgs. 101/2018.
      </p>

      <h2>1. Titolare del trattamento</h2>
      <p>
        Il Titolare del trattamento è {val(TITOLARE.ragioneSociale)} ({TITOLARE.brand}), con sede legale in {val(TITOLARE.sedeLegale)},
        P.IVA {val(TITOLARE.partitaIva)}, C.F. {val(TITOLARE.codiceFiscale)}.<br />
        Email: <a href={`mailto:${TITOLARE.email}`}>{TITOLARE.email}</a> · PEC: {val(TITOLARE.pec)} · Tel: {val(TITOLARE.telefono)}.
      </p>
      {TITOLARE.dpo ? (
        <p>Responsabile della Protezione dei Dati (DPO): {TITOLARE.dpo.nome} — <a href={`mailto:${TITOLARE.dpo.email}`}>{TITOLARE.dpo.email}</a>.</p>
      ) : (
        <p>Il Titolare non ha nominato un DPO in quanto non ricorrono i presupposti obbligatori dell&apos;art. 37 GDPR. <PH>Verificare con lo Studio Legale se necessario.</PH></p>
      )}

      <h2>2. Quali dati trattiamo</h2>
      <h3>a) Dati forniti volontariamente</h3>
      <ul>
        <li><strong>Dati di registrazione</strong>: nome, email, azienda, telefono, pacchetto scelto, password (cifrata con bcrypt).</li>
        <li><strong>Dati di contatto</strong>: quando ci scrivi via email, WhatsApp o form.</li>
        <li><strong>Dati di fatturazione</strong>: ragione sociale, P.IVA, indirizzo — gestiti tramite Stripe.</li>
        <li><strong>Contenuti caricati</strong>: immagini, testi, dati del brand e dei prodotti che inserisci nella piattaforma.</li>
      </ul>
      <h3>b) Dati raccolti automaticamente</h3>
      <ul>
        <li><strong>Dati di navigazione</strong>: indirizzo IP, tipo di browser, pagine visitate, orari (log tecnici del server).</li>
        <li><strong>Cookie tecnici</strong>: necessari al funzionamento (sessione, autenticazione). Dettagli nella <a href="/cookie-policy">Cookie Policy</a>.</li>
      </ul>

      <h2>3. Finalità e basi giuridiche</h2>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead><tr><th>Finalità</th><th>Base giuridica (art. 6 GDPR)</th></tr></thead>
          <tbody>
            <tr><td>Erogazione del servizio (account, generazione e pubblicazione contenuti)</td><td>Esecuzione del contratto — lett. b)</td></tr>
            <tr><td>Fatturazione e adempimenti fiscali</td><td>Obbligo legale — lett. c)</td></tr>
            <tr><td>Assistenza e risposta alle richieste</td><td>Esecuzione di misure precontrattuali — lett. b)</td></tr>
            <tr><td>Sicurezza, prevenzione abusi, log tecnici</td><td>Legittimo interesse — lett. f)</td></tr>
            <tr><td>Invio email transazionali (attivazione, notifiche)</td><td>Esecuzione del contratto — lett. b)</td></tr>
            <tr><td>Marketing e newsletter (se attivati)</td><td>Consenso — lett. a)</td></tr>
          </tbody>
        </table>
      </div>

      <h2>4. Uso dell&apos;intelligenza artificiale</h2>
      <p>
        La piattaforma utilizza sistemi di AI di terze parti (es. Anthropic Claude, Google Gemini, OpenRouter) per generare
        testi, immagini e piani editoriali. I dati che inserisci (brand, prodotti, immagini) possono essere inviati a questi
        fornitori esclusivamente per generare i contenuti richiesti. <strong>Non usiamo i tuoi dati per addestrare modelli AI</strong> e
        selezioniamo fornitori che offrono garanzie contrattuali in tal senso. Vedi anche la <a href="/trasparenza-ai">nota di trasparenza AI</a> (art. 50 Regolamento UE 2024/1689).
      </p>

      <h2>5. Destinatari e responsabili esterni</h2>
      <p>I dati possono essere trattati, per nostro conto, dai seguenti fornitori nominati Responsabili del trattamento (art. 28 GDPR):</p>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead><tr><th>Fornitore</th><th>Attività</th><th>Trasferimento extra-UE</th></tr></thead>
          <tbody>
            {SUB_RESPONSABILI.map(s => (
              <tr key={s.nome}><td>{s.nome}</td><td>{s.ruolo}</td><td>{s.extraUe}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        Alcuni fornitori hanno sede negli USA: i trasferimenti avvengono sulla base di <strong>Clausole Contrattuali Standard (SCC)</strong> e/o
        adesione al <strong>Data Privacy Framework</strong>, come previsto dagli artt. 44-49 GDPR.
      </p>

      <h2>6. Periodo di conservazione</h2>
      <ul>
        <li><strong>Dati account</strong>: per tutta la durata del rapporto e fino a 24 mesi dopo la cessazione.</li>
        <li><strong>Dati di fatturazione</strong>: 10 anni (obbligo civilistico/fiscale).</li>
        <li><strong>Log tecnici</strong>: massimo 12 mesi.</li>
        <li><strong>Dati marketing</strong>: fino a revoca del consenso.</li>
      </ul>

      <h2>7. I tuoi diritti</h2>
      <p>Ai sensi degli artt. 15-22 GDPR hai diritto di: accesso, rettifica, cancellazione (&quot;diritto all&apos;oblio&quot;), limitazione,
        portabilità, opposizione, e di revocare il consenso in qualsiasi momento. Per esercitarli scrivi a <a href={`mailto:${TITOLARE.email}`}>{TITOLARE.email}</a>.
        Hai inoltre diritto di proporre reclamo al <strong>Garante per la Protezione dei Dati Personali</strong> (<a href="https://www.garanteprivacy.it" target="_blank" rel="noopener noreferrer">garanteprivacy.it</a>).</p>

      <h2>8. Sicurezza</h2>
      <p>Adottiamo misure tecniche e organizzative adeguate: password cifrate (bcrypt), connessioni HTTPS, controllo accessi
        multi-tenant, rate limiting, isolamento dei dati per cliente. Nessun sistema è sicuro al 100%, ma ci impegniamo a
        proteggere i tuoi dati e a notificarti eventuali violazioni ai sensi dell&apos;art. 33-34 GDPR.</p>

      <h2>9. Modifiche</h2>
      <p>Ci riserviamo di aggiornare questa informativa. Le modifiche sostanziali saranno comunicate via email o tramite avviso sul sito.</p>
    </LegalShell>
  )
}
