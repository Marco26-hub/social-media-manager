import Link from 'next/link'
import type { Metadata } from 'next'
import {
  ArrowRight,
  BarChart3,
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  FileText,
  Globe2,
  Layers3,
  LineChart,
  LockKeyhole,
  MessageCircle,
  PlayCircle,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Target,
  Wand2,
  Zap,
} from 'lucide-react'
import styles from './servizi.module.css'

export const metadata: Metadata = {
  title: 'Social Automation | Servizi digitali gestiti',
  description: 'Landing premium per sito, e-commerce e gestione social automatizzata. Servizio gestito Social Automation.',
}

const packages = [
  {
    name: 'Starter Social',
    eyebrow: 'Per iniziare',
    setup: '€190 setup',
    monthly: '€390/mese',
    description: 'Per freelance, partite IVA e professionisti che vogliono presenza social senza impegni pesanti.',
    features: ['8 contenuti al mese', '1-2 canali social', 'Brand discovery automatico', 'Preview multi-piattaforma', 'Report mensile semplice'],
  },
  {
    name: 'Presenza Social',
    eyebrow: 'Per attività locali',
    setup: '€390 setup',
    monthly: '€590/mese',
    description: 'Per chi ha già un sito e vuole una gestione social ordinata, costante e professionale con AI.',
    features: ['12 contenuti al mese', '2 canali social', 'AI content scoring', 'Piano editoriale strategico', 'Report KPI + call mensile'],
  },
  {
    name: 'Crescita Business',
    eyebrow: 'Consigliato',
    setup: '€1.490 setup',
    monthly: '€1.090/mese',
    description: 'Il pacchetto più equilibrato per PMI che vogliono struttura, contenuti, lead e crescita misurabile.',
    features: ['20 contenuti/mese su 3 canali', 'Reel/Short premium', 'SEO + GEO audit completo', 'Lead scraping + client analysis', 'Compliance AI (GDPR, Cookie)', 'Report bisettimanale + call'],
    featured: true,
  },
  {
    name: 'E-commerce Attivo',
    eyebrow: 'Per vendere online',
    setup: '€2.900 setup',
    monthly: '€1.690/mese',
    description: 'Per negozi e brand che vogliono collegare prodotti, promozioni e social in un sistema unico.',
    features: ['30 contenuti/mese su 4 canali', 'Campagne ADS gestite', 'Product tagging + UTM', 'Lead generation + funnel', 'Report settimanale + call strategica'],
  },
  {
    name: 'Dominio Digitale',
    eyebrow: 'Per aziende strutturate',
    setup: '€4.900 setup',
    monthly: '€2.590/mese',
    description: 'Strategia omnichannel completa per aziende che vogliono dominare il mercato digitale.',
    features: ['50+ contenuti/mese su 5 canali', 'Blog SEO/GEO continuativo', 'Video production avanzata', 'Strategia omnichannel', 'Dashboard live + priorità assoluta'],
  },
]

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
          <a href="#metodo">Metodo</a>
          <a href="#faq">FAQ</a>
        </nav>
        <a href="#contatto" className={styles.navCta}>Richiedi consulenza</a>
      </header>

      <a href="#contatto" className={styles.mobileStickyCta}>
        Richiedi consulenza
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
            <a href="#pacchetti" className={styles.primaryButton}>
              Vedi pacchetti
              <ArrowRight size={18} />
            </a>
            <a href="#metodo" className={styles.secondaryButton}>
              Scopri il metodo
            </a>
          </div>
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
          {packages.map(pack => (
            <article key={pack.name} className={pack.featured ? `${styles.packageCard} ${styles.featuredPackage}` : styles.packageCard}>
              <div className={styles.packageTopline}>{pack.eyebrow}</div>
              <h3>{pack.name}</h3>
              <p>{pack.description}</p>
              <div className={styles.priceBlock}>
                <strong>{pack.setup}</strong>
                <span>{pack.monthly}</span>
              </div>
              <ul>
                {pack.features.map(feature => (
                  <li key={feature}><CheckCircle2 size={16} /> {feature}</li>
                ))}
              </ul>
              <a href="#contatto" className={pack.featured ? styles.packageCtaFeatured : styles.packageCta}>
                Voglio questo
                <ChevronRight size={16} />
              </a>
            </article>
          ))}
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
            <a href="mailto:info@socialautomation.it?subject=Consulenza%20Social%20Automation" className={styles.primaryButton}>
              Richiedi consulenza
              <ArrowRight size={18} />
            </a>
            <Link href="/login" className={styles.secondaryButtonDark}>
              Accesso admin
            </Link>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>SA</span>
          <span>Social Automation</span>
        </div>
        <span>Servizio gestito per sito, e-commerce e social automation.</span>
      </footer>
    </main>
  )
}
