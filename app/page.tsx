import Link from 'next/link'
import { PLATFORM_LIST } from '@/lib/social-config'
import TiltCard from '@/components/TiltCard'
import RevealOnScroll from '@/components/RevealOnScroll'
import CountUp from '@/components/CountUp'
import BackToTop from '@/components/BackToTop'
import { PACCHETTI } from '@/lib/pacchetti'
import {
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Bot,
  BarChart3,
  FileText,
  Search,
  Megaphone,
  Users,
  Building2,
  Briefcase,
  Store,
  Rocket,
  Magnet,
  Eye,
  ShieldCheck,
  ChevronRight,
  Wand2,
  LineChart,
  Gift,
  PhoneCall,
  Globe2,
  TrendingUp,
  PenLine,
  Compass,
  Package,
  ImagePlus,
  FileCheck2,
} from 'lucide-react'
import styles from './home.module.css'

// Contatto per la prova gratuita (1 contenuto) — manuale, così il costo AI resta controllato.
const WHATSAPP_NUMERO = '393477196603'
const TRIAL_MSG = 'Ciao! Vorrei il contenuto di prova gratuito di Social Automation.'
function waLink(msg: string) {
  return `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(msg)}`
}

// Servizi ATTIVI ora (erogati davvero: social via app, siti/e-commerce come
// servizio, visibilità SEO/GEO nel backend).
const SERVIZI = [
  { num: '01', icon: Megaphone, titolo: 'Social, automatizzato', desc: 'La tua presenza social sempre attiva, con contenuti pronti da un unico pannello e la tua approvazione prima di ogni pubblicazione.' },
  { num: '02', icon: Globe2, titolo: 'Siti & E-commerce', desc: 'Realizziamo siti curati che convertono i visitatori in clienti, fino a negozi online con pannello di gestione.' },
  { num: '03', icon: TrendingUp, titolo: 'Visibilità & Crescita', desc: 'Ti aiutiamo a farti trovare su Google e dai nuovi assistenti AI (come ChatGPT), trasformando chi ti scopre in contatti reali.' },
]

// In arrivo — accesso anticipato (lista d'attesa). NON dichiarati come Offer
// attivi nello structured data finché non sono pienamente erogati.
const IN_ARRIVO = [
  { icon: PhoneCall, titolo: 'Voce AI & Reception', desc: 'Un assistente AI che risponde al telefono 24 ore su 24, capisce chi chiama e fissa appuntamenti: non perdi più una chiamata.', nota: 'Già attivabile su richiesta con i nostri partner.' },
  { icon: Bot, titolo: 'Automazione & Agenti AI', desc: 'Agenti AI che gestiranno i processi ripetitivi della tua azienda — non solo i contenuti, ma i flussi operativi quotidiani.' },
]

// Cosa include la gestione social — tutte le capacità reali della piattaforma,
// spiegate in modo semplice (niente gergo tecnico, niente metriche inventate).
const CAPACITA = [
  { icon: Bot, titolo: 'Generazione contenuti con AI', desc: 'Scriviamo hook, testo e hashtag per ogni post, pronti da pubblicare su ogni canale.' },
  { icon: FileText, titolo: 'Piano editoriale', desc: 'Un calendario di contenuti pronto in un click: settimane o mesi di post organizzati.' },
  { icon: PenLine, titolo: 'Blog aziendale', desc: 'Articoli per il tuo sito, scritti per essere trovati facilmente su Google.' },
  { icon: Megaphone, titolo: 'Campagne pubblicitarie (ADS)', desc: 'Creiamo annunci pronti per Google, Facebook/Instagram e TikTok. Il budget resta separato dal canone.' },
  { icon: Search, titolo: 'Audit SEO + GEO', desc: 'Controlliamo il tuo sito e ti diciamo cosa migliorare per farti trovare da Google e dalle AI come ChatGPT.' },
  { icon: Eye, titolo: 'Analisi competitor', desc: 'Guardiamo cosa fanno i tuoi concorrenti sui social e ti diciamo come distinguerti.' },
  { icon: Magnet, titolo: 'Lead generation', desc: 'Troviamo contatti potenzialmente interessati alla tua attività, già ordinati per priorità (caldo/tiepido/freddo).' },
  { icon: Compass, titolo: 'Scoperta automatica del brand', desc: 'Basta l’indirizzo del tuo sito: capiamo da soli tono di voce, stile e pubblico del tuo brand.' },
  { icon: Package, titolo: 'Catalogo prodotti', desc: 'Carichi le foto dei tuoi prodotti una volta sola, le usiamo in automatico nei contenuti.' },
  { icon: ImagePlus, titolo: 'Immagini create con AI', desc: 'Generiamo grafiche su misura quando non hai foto pronte da usare.' },
  { icon: FileCheck2, titolo: 'Documenti legali', desc: 'Prepariamo Privacy Policy, Cookie Policy e informativa GDPR a norma, su misura per te.' },
  { icon: BarChart3, titolo: 'Analytics e report', desc: 'Report chiari su cosa funziona, senza numeri complicati da interpretare.' },
]

// Per chi è (target onesto, niente prova sociale finta)
const TARGET = [
  { icon: Building2, titolo: 'Agenzie', desc: 'Gestisci più clienti e più canali da un unico pannello, con flusso di approvazione ordinato.' },
  { icon: Store, titolo: 'PMI e attività locali', desc: 'Una presenza social costante e professionale, senza dover assumere un team interno.' },
  { icon: Briefcase, titolo: 'Liberi professionisti', desc: 'Contenuti curati e pubblicati con continuità, mentre tu ti concentri sul tuo lavoro.' },
]

// Come funziona (flusso reale con approvazione umana)
const FLUSSO = [
  { step: '1', titolo: 'Configuri il brand', desc: 'Imposti azienda, prodotti, tono di voce e canali da gestire.' },
  { step: '2', titolo: "L'AI prepara i contenuti", desc: 'Claude genera piano editoriale, testi, hashtag e CTA per ogni piattaforma.' },
  { step: '3', titolo: 'Approvi con 1 click', desc: 'Rivedi la coda editoriale, modifichi se serve e approvi prima della pubblicazione.' },
  { step: '4', titolo: 'Pubblicazione automatica', desc: 'I contenuti approvati vengono pubblicati sui canali tramite Blotato, con tracciamento UTM.' },
  { step: '5', titolo: 'Report e ottimizzazione', desc: 'Leggi i report, misuri i risultati e affini la strategia del periodo successivo.' },
]

// FAQ oneste in italiano
const FAQ = [
  {
    q: 'Devo saper usare un software o gestire le automazioni?',
    a: 'No. Social Automation è un servizio gestito: noi ci occupiamo di strategia, contenuti, pubblicazione e report. A te resta solo la decisione finale, con un’approvazione semplice quando prevista dagli accordi.',
  },
  {
    q: 'Quanto tempo serve per vedere risultati?',
    a: 'Essendo un prodotto in early access, siamo onesti: la continuità è ciò che conta. I primi segnali arrivano di norma nei primi mesi, mentre una crescita solida e dati affidabili richiedono lavoro costante nel tempo. Non promettiamo cifre o tempi miracolosi.',
  },
  {
    q: 'Il budget pubblicitario è incluso nel prezzo?',
    a: 'No. Il budget delle campagne ADS è sempre separato dal canone mensile. In questo modo i costi restano chiari e ogni voce è misurabile in modo trasparente.',
  },
  {
    q: 'Posso approvare i contenuti prima che vengano pubblicati?',
    a: 'Sì. Prima di ogni pubblicazione c’è un passaggio di approvazione umana: rivedi la coda editoriale, puoi modificare i contenuti e approvarli con un click. Ogni piano prevede un numero chiaro di revisioni.',
  },
  {
    q: 'A chi è rivolto Social Automation?',
    a: 'A agenzie che gestiscono più clienti, a PMI e attività locali che vogliono una presenza costante senza un team interno, e a liberi professionisti che vogliono delegare la parte social mantenendo il controllo.',
  },
]

export default function LandingPage() {
  return (
    <main className={styles.shell}>
      {/* Navbar */}
      <header className={styles.navbar}>
        <Link href="/" className={styles.brand} aria-label="Social Automation">
          <span className={styles.brandMark}>SA</span>
          <span>Social Automation</span>
        </Link>
        <nav className={styles.navLinks} aria-label="Navigazione landing">
          <a href="#servizi">Servizi</a>
          <a href="#canali">Canali</a>
          <a href="#capacita">Cosa include</a>
          <a href="#prezzi">Pacchetti</a>
          <a href="#faq">FAQ</a>
        </nav>
        <Link href="/dashboard" className={styles.navCta}>
          Vai al pannello
          <ArrowRight size={16} />
        </Link>
      </header>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={`${styles.heroOrb} ${styles.heroOrbA}`} />
        <div className={`${styles.heroOrb} ${styles.heroOrbB}`} />

        <div className={styles.heroContent}>
          <div className={styles.kicker}>
            <Sparkles size={15} />
            Prodotto in early access
          </div>
          <h1 className={styles.heroTitle}>
            Gestione social con AI,{' '}
            <span className={styles.accent}>controllo sempre tuo.</span>
          </h1>
          <p className={styles.heroLead}>
            Il servizio gestito che crea contenuti, piano editoriale, audit SEO e GEO, campagne ADS,
            lead generation e report per agenzie e PMI italiane. L&apos;AI prepara, tu approvi con un click
            prima di pubblicare.
          </p>
          <div className={styles.heroActions}>
            <a href={waLink(TRIAL_MSG)} target="_blank" rel="noopener" className={styles.primaryBtn}>
              <Gift size={18} />
              Ricevi 1 contenuto gratis
            </a>
            <Link href="/servizi#pacchetti" className={styles.secondaryBtn}>
              Pacchetti e prezzi
            </Link>
          </div>
          <p className={styles.freeTrial}>
            <Gift size={15} />
            <span><strong>1 contenuto di prova gratuito</strong> · nessun vincolo · vedi la qualità prima di decidere</span>
          </p>
          <div className={styles.trustRow}>
            <span><CheckCircle2 size={16} /> Approvazione umana prima di pubblicare</span>
            <span><CheckCircle2 size={16} /> Budget ADS separato dal canone</span>
            <span><CheckCircle2 size={16} /> Nessun software da imparare</span>
          </div>
        </div>

        {/* 3D visual */}
        <div className={styles.heroVisual}>
          <TiltCard max={8}>
            <div className={styles.panel}>
              <div className={styles.panelBar}>
                <span className={styles.dot} style={{ background: '#e8836b' }} />
                <span className={styles.dot} style={{ background: '#e3c04a' }} />
                <span className={styles.dot} style={{ background: '#8bd18f' }} />
                <span className={styles.dotLive}><i /> Sistema operativo mensile</span>
              </div>

              <div className={styles.panelStats}>
                <div className={styles.panelStat}>
                  <span><Bot size={18} /></span>
                  <strong><CountUp to={128} /></strong>
                  <small>Contenuti generati</small>
                </div>
                <div className={styles.panelStat}>
                  <span><FileText size={18} /></span>
                  <strong><CountUp to={4} /></strong>
                  <small>Canali attivi</small>
                </div>
                <div className={styles.panelStat}>
                  <span><Search size={18} /></span>
                  <strong><CountUp to={92} /></strong>
                  <small>Score SEO/GEO</small>
                </div>
              </div>

              <div className={styles.panelPipeline}>
                {['Analisi', 'Contenuti', 'Controllo', 'Pubblica'].map(s => <span key={s}>{s}</span>)}
              </div>

              <div className={styles.panelFoot}>
                <b><LineChart size={15} /> Report settimanale pronto</b>
                <span className={styles.panelBadge}><CheckCircle2 size={13} /> Approvato</span>
              </div>
            </div>
          </TiltCard>

          <div className={`${styles.floatChip} ${styles.floatChipA}`}>
            <i /> Claude sta scrivendo…
          </div>
          <div className={`${styles.floatChip} ${styles.floatChipB}`}>
            <Wand2 size={13} /> Pubblicato su 6 canali
          </div>
        </div>
      </section>

      {/* Canali */}
      <section id="canali" className={styles.section}>
        <div className={styles.wrap}>
          <div data-reveal className={styles.sectionIntroCenter}>
            <p className={styles.eyebrow}><Sparkles size={13} /> Copertura</p>
            <h2 className={styles.h2}>{PLATFORM_LIST.length} canali, una regia sola.</h2>
            <p className={styles.lead}>
              Contenuti pensati per il formato giusto di ogni piattaforma, dalla creazione alla pubblicazione.
            </p>
          </div>
          <div data-reveal className={styles.gridChannels}>
            {PLATFORM_LIST.map(p => (
              <TiltCard key={p.nome} className={`${styles.card} ${styles.hoverLift}`}>
                <span className={`${styles.channelEmoji} ${p.colorBg}`}>{p.emoji}</span>
                <h3>{p.nome}</h3>
                <p>{p.descrizione}</p>
                <div className={styles.channelTags}>
                  {p.formati.map(f => <span key={f.id}>{f.nome}</span>)}
                </div>
              </TiltCard>
            ))}
          </div>
        </div>
      </section>

      {/* Servizi — attivi ora */}
      <section id="servizi" className={styles.section} aria-labelledby="servizi-title">
        <div className={styles.wrap}>
          <div data-reveal className={styles.sectionIntroCenter}>
            <p className={styles.eyebrow}><Sparkles size={13} /> Servizi</p>
            <h2 id="servizi-title" className={styles.h2}>Tutto ciò che serve, in un unico partner.</h2>
            <p className={styles.lead}>
              Presenza social, siti che vendono e visibilità su Google e sugli assistenti AI: mettiamo l&apos;AI al lavoro sul tuo business.
            </p>
          </div>
          <div data-reveal className={styles.serviceGrid}>
            {SERVIZI.map(({ num, icon: Icon, titolo, desc }) => (
              <TiltCard key={titolo} className={`${styles.card} ${styles.hoverLift} ${styles.serviceCard}`}>
                <article>
                  <span className={styles.serviceNum}>{num}</span>
                  <span className={`${styles.cardIcon} ${styles.cardIconForest}`}><Icon size={22} /></span>
                  <h3>{titolo}</h3>
                  <p>{desc}</p>
                </article>
              </TiltCard>
            ))}
          </div>
        </div>
      </section>

      {/* In arrivo — accesso anticipato */}
      <section className={styles.section} aria-labelledby="arrivo-title">
        <div className={`${styles.wrap} ${styles.coming}`}>
          <div data-reveal className={styles.sectionIntroCenter}>
            <p className={styles.eyebrow}>Accesso anticipato</p>
            <h2 id="arrivo-title" className={styles.h2}>La piattaforma cresce.</h2>
            <p className={styles.lead}>
              Stiamo per attivare i prossimi servizi. Entra in lista d&apos;attesa e sei tra i primi ad averli.
            </p>
          </div>
          <div data-reveal className={styles.comingGrid}>
            {IN_ARRIVO.map(({ icon: Icon, titolo, desc, nota }) => (
              <article key={titolo} className={styles.comingCard}>
                <div className={styles.comingHead}>
                  <span className={styles.comingIcon}><Icon size={22} /></span>
                  <span className={styles.comingBadge}>Accesso anticipato</span>
                </div>
                <h3>{titolo}</h3>
                <p>{desc}</p>
                {nota && <p className={styles.comingNota}>{nota}</p>}
              </article>
            ))}
          </div>
          <div className={styles.comingCta}>
            <a href={waLink('Ciao! Vorrei entrare in lista d’attesa per i prossimi servizi (Voce AI / Automazione).')} target="_blank" rel="noopener" className={styles.primaryBtn}>
              <Sparkles size={18} />
              Entra in lista d&apos;attesa
            </a>
          </div>
        </div>
      </section>

      {/* Cosa include la gestione social */}
      <section id="capacita" className={styles.sectionAlt} aria-labelledby="capacita-title">
        <div className={styles.wrap}>
          <div data-reveal className={styles.sectionIntroCenter}>
            <p className={styles.eyebrow}>Include</p>
            <h2 id="capacita-title" className={styles.h2}>Cosa include la gestione social.</h2>
            <p className={styles.lead}>
              Tutto quello che ricevi con il servizio, spiegato in modo semplice — senza gergo tecnico.
            </p>
          </div>
          <div data-reveal className={styles.grid3}>
            {CAPACITA.map(({ icon: Icon, titolo, desc }) => (
              <TiltCard key={titolo} className={`${styles.card} ${styles.hoverLift}`}>
                <span className={styles.cardIcon}><Icon size={22} /></span>
                <h3>{titolo}</h3>
                <p>{desc}</p>
              </TiltCard>
            ))}
          </div>
        </div>
      </section>

      {/* Come funziona */}
      <section className={styles.section}>
        <div className={styles.wrapNarrow}>
          <div data-reveal className={styles.sectionIntroCenter}>
            <p className={styles.eyebrow}>Flusso</p>
            <h2 className={styles.h2}>Come funziona.</h2>
            <p className={styles.lead}>Un flusso chiaro, con l&apos;approvazione umana al centro.</p>
          </div>
          <div data-reveal className={styles.flow}>
            {FLUSSO.map(s => (
              <div key={s.step} className={styles.flowStep}>
                <span className={styles.flowNum}>{s.step}</span>
                <div>
                  <h3>{s.titolo}</h3>
                  <p>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Per chi è */}
      <section className={styles.sectionAlt}>
        <div className={styles.wrap}>
          <div data-reveal className={styles.sectionIntroCenter}>
            <p className={styles.eyebrow}><Users size={13} /> Per chi è</p>
            <h2 className={styles.h2}>Costruito per agenzie e PMI.</h2>
            <p className={styles.lead}>
              Per chi vuole una presenza social professionale senza appesantire la propria struttura.
            </p>
          </div>
          <div data-reveal className={styles.grid3}>
            {TARGET.map(({ icon: Icon, titolo, desc }) => (
              <TiltCard key={titolo} className={`${styles.card} ${styles.hoverLift}`}>
                <span className={`${styles.cardIcon} ${styles.cardIconForest}`}><Icon size={22} /></span>
                <h3>{titolo}</h3>
                <p>{desc}</p>
              </TiltCard>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="prezzi" className={styles.section}>
        <div className={`${styles.wrap} ${styles.pricing}`}>
          <div data-reveal className={styles.sectionIntroCenter}>
            <p className={styles.eyebrow}>Pacchetti</p>
            <h2 className={styles.h2}>Prezzi chiari, valore alto.</h2>
            <p className={styles.lead}>
              Prezzi mensili, IVA esclusa. Il budget pubblicitario è sempre separato dal canone.
            </p>
          </div>
          <div data-reveal className={styles.priceGrid}>
            {PACCHETTI.map(piano => (
              <TiltCard
                key={piano.slug}
                max={piano.consigliato ? 5 : 7}
                className={`${styles.priceCard} ${styles.hoverLift} ${piano.consigliato ? styles.priceCardFeatured : ''}`}
              >
                {piano.consigliato && <span className={styles.priceBadge}>Consigliato</span>}
                <h3 className={styles.priceName}>{piano.nome}</h3>
                <div className={styles.priceAmount}>{piano.prezzo}<small>/mese</small></div>
                <p className={styles.priceSub}>{piano.sottotitolo}</p>
                <ul className={styles.priceList}>
                  {piano.features.map(f => (
                    <li key={f}><CheckCircle2 size={16} /> {f}</li>
                  ))}
                </ul>
                <Link
                  href={`/register?piano=${piano.slug}`}
                  className={`${styles.priceCta} ${piano.consigliato ? styles.priceCtaGold : styles.priceCtaGhost}`}
                >
                  Registrati
                  <ChevronRight size={16} />
                </Link>
              </TiltCard>
            ))}
          </div>
          <p className={styles.priceFootnote}>
            Setup iniziale e moduli extra variano per pacchetto.{' '}
            <Link href="/servizi#pacchetti">Confronta tutti i pacchetti su /servizi</Link>
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className={styles.section}>
        <div className={styles.wrapNarrow}>
          <div data-reveal className={styles.sectionIntroCenter}>
            <p className={styles.eyebrow}>FAQ</p>
            <h2 className={styles.h2}>Domande frequenti.</h2>
            <p className={styles.lead}>Trasparenza prima di iniziare.</p>
          </div>
          <div data-reveal className={styles.faqList}>
            {FAQ.map((item, i) => (
              <details key={i} className={styles.faqItem}>
                <summary className={styles.faqSummary}>
                  {item.q}
                  <ChevronRight size={18} />
                </summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA finale */}
      <section className={styles.section}>
        <div className={`${styles.wrapNarrow} ${styles.finalCta}`}>
          <div>
            <span className={styles.finalIcon}><Rocket size={26} /></span>
          </div>
          <div>
            <h2 className={styles.h2}>Provalo gratis, poi decidi.</h2>
            <p>
              Ricevi <strong>1 contenuto di prova gratuito</strong>, pensato per la tua attività.
              Vedi la qualità con i tuoi occhi — nessun vincolo, nessuna carta.
            </p>
          </div>
          <div className={styles.finalActions}>
            <a href={waLink(TRIAL_MSG)} target="_blank" rel="noopener" className={styles.primaryBtn}>
              <Gift size={18} />
              Ricevi 1 contenuto gratis
            </a>
            <Link href="/servizi#pacchetti" className={styles.secondaryBtn} style={{ color: '#fffaf0', borderColor: 'rgba(255,250,240,0.3)', background: 'transparent' }}>
              Pacchetti e prezzi
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerTop}>
          <Link href="/" className={styles.brand}>
            <span className={styles.brandMark}>SA</span>
            <span>Social Automation</span>
          </Link>
          <div className={styles.footerLinks}>
            <Link href="/dashboard">Pannello</Link>
            <Link href="/servizi#pacchetti">Pacchetti e prezzi</Link>
            <Link href="/login">Accedi</Link>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <span>&copy; {new Date().getFullYear()} Social Automation</span>
          <span><ShieldCheck size={14} /> Costruito con Next.js, Neon/Postgres, Claude e Blotato</span>
        </div>
      </footer>

      <RevealOnScroll />
      <BackToTop />
    </main>
  )
}
