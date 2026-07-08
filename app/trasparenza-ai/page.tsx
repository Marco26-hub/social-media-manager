import type { Metadata } from 'next'
import LegalShell from '@/components/LegalShell'
import { TITOLARE } from '@/lib/legal-config'

export const metadata: Metadata = {
  title: 'Trasparenza AI — Social Automation',
  description: 'Nota di trasparenza sull\'uso dell\'intelligenza artificiale ai sensi del Regolamento UE 2024/1689 (AI Act).',
  robots: { index: true, follow: true },
}

export default function TrasparenzaAiPage() {
  return (
    <LegalShell eyebrow="Trasparenza AI · Regolamento UE 2024/1689" title="Nota di Trasparenza sull'AI" currentPath="/trasparenza-ai">
      <p>
        {TITOLARE.brand} utilizza sistemi di intelligenza artificiale per erogare i propri servizi. In conformità al principio
        di trasparenza del <strong>Regolamento UE 2024/1689 (AI Act)</strong> — in particolare l&apos;<strong>art. 50</strong> sugli obblighi di
        trasparenza — forniamo le seguenti informazioni.
      </p>

      <h2>1. Dove usiamo l&apos;AI</h2>
      <ul>
        <li><strong>Generazione di contenuti</strong>: testi (hook, caption, hashtag, CTA), piani editoriali, articoli blog, campagne.</li>
        <li><strong>Generazione di immagini e video</strong>: grafiche, caroselli, reel, immagini prodotto.</li>
        <li><strong>Analisi</strong>: audit SEO/GEO, analisi del brand e dei competitor, scoring dei contenuti.</li>
      </ul>

      <h2>2. Contenuti generati o manipolati dall&apos;AI</h2>
      <p>
        I contenuti prodotti dalla piattaforma sono <strong>generati artificialmente o assistiti dall&apos;AI</strong>. Ai sensi dell&apos;art. 50
        AI Act, quando pubblichiamo o aiutiamo a pubblicare immagini, audio o video generati/manipolati dall&apos;AI che potrebbero
        apparire autentici, questi vanno <strong>etichettati come artificiali</strong>. Ti aiutiamo a rispettare questo obbligo e ad applicare
        le diciture corrette dove richiesto dalla legge o dalle policy delle piattaforme.
      </p>

      <h2>3. Supervisione umana</h2>
      <p>
        Ogni contenuto passa per un&apos;<strong>approvazione umana</strong> prima della pubblicazione: l&apos;AI propone, la persona decide. Non c&apos;è
        pubblicazione automatica senza il tuo via libera. Resti responsabile della verifica di accuratezza e veridicità dei contenuti.
      </p>

      <h2>4. Nessun addestramento sui tuoi dati</h2>
      <p>
        I dati e i materiali che carichi vengono usati <strong>solo per generare i contenuti richiesti</strong>. Non li utilizziamo per
        addestrare modelli AI e selezioniamo fornitori (Anthropic, Google, OpenRouter) che offrono garanzie contrattuali in tal senso.
      </p>

      <h2>5. Limiti dei sistemi AI</h2>
      <p>
        I sistemi AI possono produrre errori, imprecisioni o &quot;allucinazioni&quot;. Non vanno considerati infallibili né sostitutivi di
        una consulenza professionale. Per gli aspetti legali, fiscali o sanitari rivolgiti sempre a un professionista abilitato.
      </p>

      <h2>6. Categorie di rischio (AI Act)</h2>
      <p>
        L&apos;AI Act classifica i sistemi in base al rischio. I nostri usi (marketing, generazione contenuti) rientrano nella categoria
        a <strong>rischio limitato/minimo</strong>, soggetta principalmente a obblighi di trasparenza, non ai requisiti stringenti dei sistemi
        ad &quot;alto rischio&quot;. Il Regolamento diventa pienamente applicabile dal <strong>2 agosto 2026</strong>.
      </p>

      <h2>7. Consulenza dedicata</h2>
      <p>
        Se vuoi verificare come l&apos;AI Act e il GDPR impattano la tua specifica attività, offriamo una consulenza legale con
        l&apos;Avvocato Cassazionista dello {TITOLARE.partnerLegale.split('—')[0].trim()} (€150 / 30 min, parere scritto incluso).
        Contatti: <a href={`mailto:${TITOLARE.email}`}>{TITOLARE.email}</a>.
      </p>
    </LegalShell>
  )
}
