import type { Metadata } from 'next'
import LegalShell, { PH } from '@/components/LegalShell'
import { TITOLARE } from '@/lib/legal-config'

export const metadata: Metadata = {
  title: 'Termini e Condizioni — Social Automation',
  description: 'Condizioni generali di utilizzo del servizio Social Automation.',
  robots: { index: true, follow: true },
}

function val(v: string) {
  return v.startsWith('[DA COMPILARE') ? <PH>{v}</PH> : v
}

export default function TerminiPage() {
  return (
    <LegalShell eyebrow="Termini e Condizioni" title="Termini e Condizioni d'uso" currentPath="/termini">
      <p>
        Le presenti Condizioni Generali regolano l&apos;utilizzo dei servizi di {TITOLARE.brand}, forniti da {val(TITOLARE.ragioneSociale)},
        P.IVA {val(TITOLARE.partitaIva)}. Utilizzando il servizio accetti integralmente questi termini.
      </p>

      <h2>1. Oggetto del servizio</h2>
      <p>{TITOLARE.brand} è una piattaforma e un servizio gestito che, tramite intelligenza artificiale, genera contenuti social,
        piani editoriali, articoli, campagne e li pubblica sui canali del cliente previa <strong>approvazione umana</strong>. Sono inoltre
        offerti servizi di siti/e-commerce, visibilità e — tramite lo Studio Legale BCS — consulenze legali e AI compliance.</p>

      <h2>2. Registrazione e account</h2>
      <ul>
        <li>La registrazione richiede dati veritieri e completi. L&apos;account è attivato previa approvazione.</li>
        <li>Sei responsabile della custodia delle credenziali e delle attività svolte con il tuo account.</li>
        <li>Devi avere almeno 18 anni e, se agisci per un&apos;azienda, i poteri per vincolarla.</li>
      </ul>

      <h2>3. Piani, prezzi e pagamenti</h2>
      <ul>
        <li>I canoni e i setup sono indicati nella pagina <a href="/servizi#pacchetti">Pacchetti</a>. I prezzi sono mensili, IVA esclusa salvo diversa indicazione.</li>
        <li>La fatturazione degli abbonamenti è gestita tramite Stripe, con rinnovo automatico mensile salvo disdetta.</li>
        <li>Il budget pubblicitario (ADS) è sempre separato dal canone.</li>
        <li>Le consulenze legali (€150/30 min) sono erogate dallo Studio Legale BCS e regolate anche dalle condizioni dello Studio.</li>
      </ul>

      <h2>4. Contenuti generati dall&apos;AI</h2>
      <ul>
        <li>I contenuti sono generati da sistemi AI e <strong>rivisti/approvati dal cliente</strong> prima della pubblicazione: l&apos;approvazione finale è tua.</li>
        <li>Non garantiamo che i contenuti siano privi di errori: sei tenuto a verificarne accuratezza, veridicità e conformità prima di pubblicarli.</li>
        <li>Sei responsabile dei diritti sui materiali che carichi (immagini, marchi, testi) e delle autorizzazioni necessarie.</li>
      </ul>

      <h2>5. Uso consentito</h2>
      <p>È vietato utilizzare il servizio per contenuti illeciti, diffamatori, ingannevoli, che violino diritti di terzi o le
        policy delle piattaforme social. Ci riserviamo di sospendere account che violino queste condizioni.</p>

      <h2>6. Proprietà intellettuale</h2>
      <p>Il software, il marchio e la struttura della piattaforma restano di proprietà del Titolare. I contenuti generati per
        il cliente e i materiali da lui caricati restano di proprietà del cliente.</p>

      <h2>7. Limitazione di responsabilità</h2>
      <p>Il servizio è fornito &quot;così com&apos;è&quot;. Nei limiti di legge, il Titolare non risponde di danni indiretti, perdita di
        profitti, o conseguenze derivanti dalla pubblicazione di contenuti approvati dal cliente. La responsabilità complessiva
        è comunque limitata all&apos;importo dei canoni versati negli ultimi 12 mesi.</p>

      <h2>8. Recesso e cessazione</h2>
      <ul>
        <li>Puoi disdire l&apos;abbonamento con effetto dal periodo di fatturazione successivo, dal pannello o scrivendo a <a href={`mailto:${TITOLARE.email}`}>{TITOLARE.email}</a>.</li>
        <li>Per i consumatori si applica il diritto di recesso di 14 giorni (art. 52 Codice del Consumo), salvo esecuzione anticipata richiesta.</li>
      </ul>

      <h2>9. Legge applicabile e foro</h2>
      <p>Le presenti condizioni sono regolate dalla legge italiana. Per le controversie con consumatori è competente il foro di
        residenza del consumatore; negli altri casi il foro di <PH>[DA COMPILARE — città sede legale]</PH>.</p>

      <h2>10. Modifiche</h2>
      <p>Ci riserviamo di modificare i presenti termini. Le modifiche saranno comunicate e si intendono accettate proseguendo nell&apos;uso del servizio.</p>
    </LegalShell>
  )
}
