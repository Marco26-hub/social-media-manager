import Link from 'next/link'
import type { Metadata } from 'next'
import {
  ArrowRight,
  BarChart3,
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  Globe2,
  Layers3,
  LineChart,
  LockKeyhole,
  MessageCircle,
  PlayCircle,
  Scale,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Target,
  Wand2,
  Zap,
  FileCheck2,
} from 'lucide-react'
import { PACCHETTI } from '@/lib/pacchetti'
import styles from './servizi.module.css'

// ⚙️ CONFIG CONTATTI — cambia questi 2 valori col tuo numero/email reali
const WHATSAPP_NUMERO = '393477196603' // prefisso 39, no +, no spazi
const EMAIL_CONTATTO = 'swsdautomation@gmail.com'

function waLink(messaggio: string) {
  return `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(messaggio)}`
}

export const metadata: Metadata = {
  title: 'Social Automation | Gestione social con AI per la tua attività',
  description: 'Sito, e-commerce e social gestiti con AI. Piano editoriale, contenuti, pubblicazione e report. Scrivici su WhatsApp e parti questa settimana.',
}

const outcomes = [
  { icon: Globe2, title: 'Sito che presenta e converte', text: 'Non solo una vetrina: struttura, messaggi, contatti e CTA pensati per far capire subito il valore.' },
  { icon: ShoppingBag, title: 'E-commerce pronto alla vendita', text: 'Catalogo, prodotti, promozioni e contenuti social collegati per sostenere il traffico commerciale.' },
  { icon: CalendarCheck, title: 'Calendario editoriale continuo', text: 'Ogni mese una direzione chiara: temi, contenuti, canali, pubblicazione e controllo qualita.' },
  { icon: BarChart3, title: 'Report e miglioramento', text: 'Non ci fermiamo alla pubblicazione: leggiamo i dati e ottimizziamo il mese successivo.' },
]

const method = [
  { step: '01', title: 'Analisi', text: 'Studiamo brand, pubblico, offerta, canali attuali e obiettivi commerciali.' },
  { step: '02', title: 'Architettura', text: 'Definiamo sito, e-commerce, canali social, contenuti e priorita operative.' },
  { step: '03', title: 'Produzione', text: 'Creiamo calendario, copy, format, grafiche, video brevi e contenuti collegati ai prodotti.' },
  { step: '04', title: 'Pubblicazione', text: 'Programmiamo e controlliamo i contenuti con approvazione cliente solo quando serve.' },
  { step: '05', title: 'Ottimizzazione', text: 'Misuriamo, correggiamo e rendiamo il sistema piu efficace mese dopo mese.' },
]

const extras = [
  'Gestione ADS separata dal budget pubblicitario',
  'Landing page dedicate per campagne o promozioni',
  'Blog SEO/GEO e articoli lunghi per autorevolezza',
  'Shooting, reel extra e contenuti premium su richiesta',
  'Consulenze legali e AI compliance su richiesta (AI Act, GDPR, trasparenza contenuti AI)',
]

const legalCards = [
  { icon: Scale, title: 'Audit AI Act', text: 'Verifichiamo se e come i sistemi AI che usi rientrano nelle categorie di rischio del Regolamento UE 2024/1689, e ti diciamo cosa devi fare per essere a norma entro le scadenze.' },
  { icon: ShieldCheck, title: 'Privacy & GDPR con l’AI', text: 'Ti aiutiamo a usare l’AI rispettando la privacy: dai dati che alimentano i modelli al diritto di spiegazione, con informativa e consensi in regola.' },
  { icon: FileCheck2, title: 'Trasparenza contenuti AI', text: 'Quando un contenuto è generato dall’AI, va dichiarato. Ti diciamo quando è obbligatorio e mettiamo le etichette giuste su post, immagini e articoli, come chiede la legge.' },
  { icon: LockKeyhole, title: 'Copyright e contratti AI', text: 'Chiariamo a chi appartengono i contenuti e le immagini creati dall’AI e scriviamo i contratti giusti con clienti, fornitori e piattaforme, così sai cosa puoi usare e pubblicare.' },
]

const compareRows = [
  { label: 'Contenuti', trad: '2-12 post al mese', us: 'Contenuti multi-canale + reel', usWin: true },
  { label: 'Audit SEO + GEO', trad: false, us: 'Incluso da Crescita' },
  { label: 'Lead generation', trad: false, us: 'Scraping + scoring caldo/tiepido/freddo' },
  { label: 'Analisi competitor', trad: false, us: 'Monitoraggio continuo' },
  { label: 'Campagne ADS', trad: 'A volte, a parte', us: 'Struttura + ottimizzazione' },
  { label: 'Report', trad: 'Manuale, se previsto', us: 'Automatico + storico consultabile' },
  { label: 'Approvazione contenuti', trad: 'Email / chat sparse', us: '1 click nel pannello' },
  { label: 'Flagship / mese', trad: '€940 - €1.290 (solo social)', us: '€1.090 (sistema completo)', usWin: true },
]

const faqs = [
  {
    question: 'Il cliente deve usare un software?',
    answer: 'No. Il cliente compra un servizio gestito. Social Automation segue strategia, contenuti, pubblicazione e report.',
  },
  {
    question: 'Posso approvare i contenuti prima della pubblicazione?',
    answer: 'Si, se previsto dagli accordi. L’approvazione e controllata, con un numero chiaro di revisioni incluse.',
  },
  {
    question: 'Il budget pubblicitario e incluso?',
    answer: 'No. Il budget ADS resta sempre separato dal canone, cosi i costi sono chiari e misurabili.',
  },
  {
    question: 'Quanto tempo serve per vedere risultati?',
    answer: 'La continuita conta: i primi segnali arrivano spesso nei primi mesi, mentre crescita solida e dati affidabili richiedono lavoro costante.',
  },
]

export default function ServiziPage() {
  return (
    <main className={styles.pageShell}>
      <header className={styles.navbar}>
        <Link href="/servizi" className={styles.brand} aria-label="Social Automation servizi">
          <span className={styles.brandMark}>SA</span>
          <span>Social Automation</span>
        </Link>
        <nav className={styles.navLinks} aria-label="Navigazione landing servizi">
          <a href="#pacchetti">Pacchetti</a>
          <a href="#consulenze-legali">Legale &amp; AI</a>
          <a href="#metodo">Metodo</a>
          <a href="#faq">FAQ</a>
        </nav>
        <a href="#contatto" className={styles.navCta}>Richiedi consulenza</a>
      </header>

      <a href={waLink('Ciao! Vorrei informazioni sui pacchetti Social Automation.')} target="_blank" rel="noopener" className={styles.mobileStickyCta}>
        Scrivici su WhatsApp
        <ArrowRight size={17} />
      </a>

      <section className={styles.hero}>
        <div className={styles.heroGlow} />
        <div className={styles.heroContent}>
          <div className={styles.kicker}>
            <Sparkles size={16} />
            Sito, e-commerce e social gestiti in un unico sistema
          </div>
          <h1>Trasforma la tua presenza digitale in una macchina commerciale continua.</h1>
          <p className={styles.heroLead}>
            Social Automation crea e gestisce il tuo ecosistema digitale: sito, e-commerce, piano editoriale, contenuti social, pubblicazione controllata e report. Tu guidi l’azienda, noi teniamo acceso il motore digitale.
          </p>
          <div className={styles.heroActions}>
            <a href={waLink('Ciao! Ho visto Social Automation e vorrei capire quale pacchetto fa per la mia attività.')} target="_blank" rel="noopener" className={styles.primaryButton}>
              Scrivici su WhatsApp
              <ArrowRight size={18} />
            </a>
            <a href="#metodo" className={styles.secondaryButton}>
              Come funziona
            </a>
          </div>
          <p className={styles.heroReassure}>
            <ShieldCheck size={15} /> Primo contenuto di prova gratuito · Nessun vincolo · Stop quando vuoi
          </p>
          <div className={styles.heroStats}>
            <div><strong>5</strong><span>pacchetti scalabili</span></div>
            <div><strong>3-4</strong><span>canali gestibili</span></div>
            <div><strong>60</strong><span>contenuti/mese nei piani avanzati</span></div>
          </div>
        </div>

        <aside className={styles.heroPanel} aria-label="Anteprima sistema Social Automation">
          <div className={styles.panelHeader}>
            <span className={styles.liveDot} />
            Sistema operativo mensile
          </div>
          <div className={styles.panelCardLarge}>
            <span className={styles.panelIcon}><Wand2 size={24} /></span>
            <div>
              <strong>Piano editoriale pronto</strong>
              <p>Strategia, canali, contenuti, promo e pubblicazioni coordinati.</p>
            </div>
          </div>
          <div className={styles.pipelineMini}>
            {['Analisi', 'Contenuti', 'Controllo', 'Pubblicazione'].map(item => <span key={item}>{item}</span>)}
          </div>
          <div className={styles.panelRows}>
            <div><CheckCircle2 size={16} /> 18 contenuti approvati</div>
            <div><ShieldCheck size={16} /> revisioni sotto controllo</div>
            <div><LineChart size={16} /> report mensile leggibile</div>
          </div>
        </aside>
      </section>

      <section className={styles.problemSection}>
        <div className={styles.problemText}>
          <p className={styles.sectionLabel}>Il problema</p>
          <h2>Molte aziende hanno strumenti. Poche hanno un sistema.</h2>
        </div>
        <div className={styles.problemCards}>
          <article>
            <span><Zap size={20} /></span>
            <h3>Pubblicazione casuale</h3>
            <p>Si posta quando c’e tempo, senza continuita e senza una linea editoriale chiara.</p>
          </article>
          <article>
            <span><Layers3 size={20} /></span>
            <h3>Sito scollegato dai social</h3>
            <p>Il sito dice una cosa, i social un’altra, le promozioni non hanno una direzione unica.</p>
          </article>
          <article>
            <span><MessageCircle size={20} /></span>
            <h3>Revisioni infinite</h3>
            <p>Il lavoro si blocca per commenti sparsi, approvazioni lente e decisioni non ordinate.</p>
          </article>
        </div>
      </section>

      <section className={styles.outcomesSection}>
        <div className={styles.sectionIntro}>
          <p className={styles.sectionLabel}>Cosa ottieni</p>
          <h2>Un servizio gestito, non un altro pannello da imparare.</h2>
          <p>Social Automation coordina strategia, produzione e pubblicazione, lasciando al cliente solo le decisioni importanti.</p>
        </div>
        <div className={styles.outcomeGrid}>
          {outcomes.map(({ icon: Icon, title, text }) => (
            <article key={title} className={styles.outcomeCard}>
              <span><Icon size={24} /></span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="pacchetti" className={styles.packagesSection}>
        <div className={styles.sectionIntroNarrow}>
          <p className={styles.sectionLabel}>Offerte</p>
          <h2>Pacchetti semplici, chiari e profittevoli.</h2>
          <p>Prezzi IVA esclusa. Budget pubblicitario, shooting e abbonamenti esterni sono separati, cosi ogni voce resta trasparente.</p>
        </div>
        <div className={styles.packageGrid}>
          {PACCHETTI.map(pack => (
            <article key={pack.slug} className={pack.consigliato ? `${styles.packageCard} ${styles.featuredPackage}` : styles.packageCard}>
              <div className={styles.packageTopline}>{pack.eyebrow}</div>
              <h3>{pack.nome}</h3>
              <p>{pack.sottotitolo}</p>
              <div className={styles.priceBlock}>
                <strong>{pack.setup}</strong>
                <span>{pack.prezzo}/mese</span>
              </div>
              {pack.includeDa && (
                <p className={styles.packageInclude}>Tutto di <strong>{pack.includeDa}</strong>, più:</p>
              )}
              <ul>
                {pack.features.map(feature => (
                  <li key={feature}><CheckCircle2 size={16} /> {feature}</li>
                ))}
              </ul>
              <Link href={`/register?piano=${pack.slug}`} className={pack.consigliato ? styles.packageCtaFeatured : styles.packageCta}>
                Attiva ora
                <ChevronRight size={16} />
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.compareSection}>
        <div className={styles.sectionIntroNarrow}>
          <p className={styles.sectionLabel}>Perché noi</p>
          <h2>Non paghi i post. Paghi un sistema.</h2>
          <p>La gestione social tradizionale vende un numero di post al mese. Social Automation coordina sei agenti AI e la pubblicazione, con l’approvazione umana al centro.</p>
        </div>
        <div className={styles.compareTableWrap}>
          <table className={styles.compareTable}>
            <thead>
              <tr>
                <th></th>
                <th>Gestione tradizionale</th>
                <th className={styles.compareUs}>Social Automation</th>
              </tr>
            </thead>
            <tbody>
              {compareRows.map(row => (
                <tr key={row.label}>
                  <td className={styles.compareLabel}>{row.label}</td>
                  <td className={styles.compareTrad}>
                    {row.trad === false ? <span className={styles.compareNo}>✕</span> : row.trad}
                  </td>
                  <td className={row.usWin ? `${styles.compareUsCell} ${styles.compareUsWin}` : styles.compareUsCell}>
                    <CheckCircle2 size={15} /> {row.us}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="metodo" className={styles.methodSection}>
        <div className={styles.methodIntro}>
          <p className={styles.sectionLabel}>Metodo Social Automation</p>
          <h2>Una direzione unica, mese dopo mese.</h2>
          <p>Il lavoro digitale diventa un ritmo: strategia, contenuti, approvazione controllata, pubblicazione e miglioramento.</p>
        </div>
        <div className={styles.methodTimeline}>
          {method.map(item => (
            <article key={item.step}>
              <span>{item.step}</span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.approvalSection}>
        <div className={styles.approvalCardDark}>
          <LockKeyhole size={28} />
          <h2>La strategia resta guidata da noi.</h2>
          <p>Il cliente puo approvare quando serve, ma non trasformiamo ogni contenuto in una trattativa infinita. Ogni pacchetto ha revisioni chiare, tempi chiari e responsabilita chiare.</p>
        </div>
        <div className={styles.approvalCardLight}>
          <Target size={28} />
          <h2>Il risultato e continuita.</h2>
          <p>Non vendiamo “post con AI”. Vendiamo presenza digitale costante, coordinata e controllata da una regia unica.</p>
        </div>
      </section>

      <section className={styles.extrasSection}>
        <div>
          <p className={styles.sectionLabel}>Extra</p>
          <h2>Quando serve piu spinta, aggiungiamo moduli mirati.</h2>
        </div>
        <div className={styles.extrasList}>
          {extras.map(extra => <div key={extra}><PlayCircle size={18} /> {extra}</div>)}
        </div>
      </section>

      <section id="consulenze-legali" className={styles.outcomesSection} aria-labelledby="consulenze-legali-title">
        <div className={styles.sectionIntro}>
          <p className={styles.sectionLabel}>Consulenze Legali e AI Compliance</p>
          <h2 id="consulenze-legali-title">La tua attività, a norma anche con l’AI.</h2>
          <p>L’AI lavora per te, ma la responsabilita resta tua. Ti affianchiamo per restare in regola con GDPR e AI Act, senza fermare il business. Modulo extra su preventivo.</p>
        </div>
        <div className={styles.outcomeGrid}>
          {legalCards.map(({ icon: Icon, title, text }) => (
            <article key={title} className={styles.outcomeCard}>
              <span><Icon size={24} /></span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
        {/* Partner legale — blocco autorevolezza (inline: servizi ha un module diverso) */}
        <div style={{
          position: 'relative', maxWidth: 820, margin: '2.5rem auto 0', padding: '1.75rem 1.75rem 1.5rem',
          borderRadius: 22, border: '1px solid rgba(34,63,44,0.18)',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.9), rgba(255,250,240,0.7))',
          boxShadow: '0 20px 50px rgba(16,18,14,0.1)',
          display: 'flex', alignItems: 'center', gap: 22, flexWrap: 'wrap',
        }}>
          <span style={{
            position: 'absolute', top: -12, left: 28, display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '5px 12px', borderRadius: 999, background: 'linear-gradient(135deg,#223f2c,#617c45)',
            color: '#fffaf0', fontSize: 11, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase',
          }}><ShieldCheck size={12} /> Partner legale verificato</span>
          <div style={{
            flexShrink: 0, width: 84, height: 84, display: 'grid', placeItems: 'center', borderRadius: 18,
            background: 'linear-gradient(155deg,#10120e,#223f2c)', color: '#e7bf57',
            fontFamily: 'Fraunces, Georgia, serif', fontWeight: 700, fontSize: 27, letterSpacing: '0.06em',
          }} aria-hidden="true">BCS</div>
          <div style={{ flex: '1 1 320px', minWidth: 0 }}>
            <h3 style={{ margin: '0 0 2px', fontFamily: 'Fraunces, Georgia, serif', fontSize: 24, lineHeight: 1.1, color: '#10120e' }}>Studio Legale BCS</h3>
            <p style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 700, color: '#223f2c' }}>Avv. Vincenzo Sapone — Cassazionista</p>
            <p style={{ margin: '0 0 12px', fontSize: 14, lineHeight: 1.55, color: 'rgba(16,18,14,0.72)' }}>
              Specializzato in Diritto Penale, GDPR, AI Act e diritto delle nuove tecnologie. Le consulenze legali sono erogate direttamente dallo Studio: un professionista abilitato al tuo fianco.
            </p>
            <a href="https://studiodigitale.eu/" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 800, color: '#c39528', textDecoration: 'none' }}>
              Scopri lo Studio <ArrowRight size={14} />
            </a>
          </div>
        </div>
        <div className={styles.ctaActions} style={{ justifyContent: 'center', marginTop: '1.75rem' }}>
          <a href={waLink('Ciao! Vorrei un preventivo per le consulenze legali e AI compliance con lo Studio Legale BCS.')} target="_blank" rel="noopener" className={styles.primaryButton}>
            <Scale size={18} />
            Richiedi preventivo su WhatsApp
          </a>
        </div>
      </section>

      <section id="faq" className={styles.faqSection}>
        <div className={styles.sectionIntroNarrow}>
          <p className={styles.sectionLabel}>Domande frequenti</p>
          <h2>Chiarezza prima di partire.</h2>
        </div>
        <div className={styles.faqGrid}>
          {faqs.map(faq => (
            <article key={faq.question}>
              <h3>{faq.question}</h3>
              <p>{faq.answer}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="contatto" className={styles.ctaSection}>
        <div className={styles.ctaBox}>
          <div>
            <p className={styles.sectionLabel}>Consulenza iniziale</p>
            <h2>Vediamo qual e il pacchetto giusto per la tua azienda.</h2>
            <p>Analizziamo presenza attuale, obiettivi, canali e possibilita operative. Poi proponiamo una strada semplice, sostenibile e misurabile.</p>
          </div>
          <div className={styles.ctaActions}>
            <a href={waLink('Ciao! Vorrei una consulenza gratuita per la mia presenza social.')} target="_blank" rel="noopener" className={styles.primaryButton}>
              <MessageCircle size={18} />
              Consulenza gratuita su WhatsApp
            </a>
            <a href={`mailto:${EMAIL_CONTATTO}?subject=Consulenza%20Social%20Automation`} className={styles.secondaryButtonDark}>
              Scrivici via email
            </a>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>SA</span>
          <span>Social Automation</span>
        </div>
        <span>Servizio gestito per sito, e-commerce e social automation.</span>
        <Link href="/login" className={styles.footerAdmin} aria-label="Apri area admin">
          <LockKeyhole size={15} /> Apri admin
        </Link>
      </footer>
    </main>
  )
}
