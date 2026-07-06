import Link from 'next/link'
import { PLATFORM_LIST } from '@/lib/social-config'
import TiltCard from '@/components/TiltCard'
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
} from 'lucide-react'
import styles from './home.module.css'

// Capacità reali del prodotto (niente metriche inventate)
const CAPACITA = [
  { icon: Bot, titolo: 'Generazione contenuti con AI', desc: 'Claude scrive hook, caption, hashtag e CTA su misura per ogni canale e per ogni obiettivo.' },
  { icon: FileText, titolo: 'Piano editoriale', desc: 'Calendari settimanali e mensili coerenti con il tuo brand, i tuoi prodotti e i tuoi temi.' },
  { icon: Search, titolo: 'Audit SEO + GEO', desc: 'Analisi per posizionarti sui motori di ricerca e farti citare dagli assistenti AI come ChatGPT e Perplexity.' },
  { icon: Megaphone, titolo: 'Campagne ADS', desc: 'Struttura e ottimizzazione delle campagne pubblicitarie. Il budget pubblicitario resta separato dal canone.' },
  { icon: Magnet, titolo: 'Lead generation', desc: 'Trova e qualifica contatti potenziali per settore e zona, con scoring caldo/tiepido/freddo e follow-up commerciale.' },
  { icon: Eye, titolo: 'Analisi competitor', desc: 'Monitoraggio dei concorrenti: contenuti, posizionamento e spunti per differenziarti.' },
  { icon: BarChart3, titolo: 'Analytics e report', desc: 'Produzione, pipeline editoriale e performance dei contenuti, con storico consultabile.' },
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

// Prezzi reali, allineati a /servizi. I dettagli vivono su /servizi.
const PIANI = [
  {
    nome: 'Starter',
    prezzo: '€390',
    sottotitolo: 'Per iniziare con una presenza social ordinata.',
    features: ['Contenuti social ricorrenti', '1-2 canali gestiti', 'Brand discovery automatico', 'Anteprima multi-piattaforma', 'Report periodico'],
    consigliato: false,
  },
  {
    nome: 'Crescita',
    prezzo: '€1.090',
    sottotitolo: 'Il piano più equilibrato per PMI in crescita.',
    features: ['Contenuti su più canali', 'Reel e Short premium', 'Audit SEO + GEO completo', 'Analisi competitor e lead', 'Report ricorrente con call'],
    consigliato: true,
  },
  {
    nome: 'Dominio',
    prezzo: '€2.590',
    sottotitolo: 'Strategia omnichannel per aziende strutturate.',
    features: ['Contenuti su tutti i canali', 'Blog SEO/GEO continuativo', 'Produzione video avanzata', 'Strategia omnichannel', 'Dashboard live e priorità'],
    consigliato: false,
  },
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
          <a href="#canali">Canali</a>
          <a href="#capacita">Cosa fa</a>
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
            <Link href="/dashboard" className={styles.primaryBtn}>
              Prova il pannello
              <ArrowRight size={18} />
            </Link>
            <Link href="/servizi#pacchetti" className={styles.secondaryBtn}>
              Pacchetti e prezzi
            </Link>
          </div>
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
                  <strong>128</strong>
                  <small>Contenuti generati</small>
                </div>
                <div className={styles.panelStat}>
                  <span><FileText size={18} /></span>
                  <strong>4</strong>
                  <small>Canali attivi</small>
                </div>
                <div className={styles.panelStat}>
                  <span><Search size={18} /></span>
                  <strong>92</strong>
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
          <div className={styles.sectionIntroCenter}>
            <p className={styles.eyebrow}><Sparkles size={13} /> Copertura</p>
            <h2 className={styles.h2}>{PLATFORM_LIST.length} canali, una regia sola.</h2>
            <p className={styles.lead}>
              Contenuti pensati per il formato giusto di ogni piattaforma, dalla creazione alla pubblicazione.
            </p>
          </div>
          <div className={styles.gridChannels}>
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

      {/* Cosa fa */}
      <section id="capacita" className={styles.sectionAlt}>
        <div className={styles.wrap}>
          <div className={styles.sectionIntroCenter}>
            <p className={styles.eyebrow}>Capacità</p>
            <h2 className={styles.h2}>Cosa fa Social Automation.</h2>
            <p className={styles.lead}>
              Tutto ciò che serve per una presenza digitale continua, coordinata da una regia unica.
            </p>
          </div>
          <div className={styles.grid3}>
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
          <div className={styles.sectionIntroCenter}>
            <p className={styles.eyebrow}>Flusso</p>
            <h2 className={styles.h2}>Come funziona.</h2>
            <p className={styles.lead}>Un flusso chiaro, con l&apos;approvazione umana al centro.</p>
          </div>
          <div className={styles.flow}>
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
          <div className={styles.sectionIntroCenter}>
            <p className={styles.eyebrow}><Users size={13} /> Per chi è</p>
            <h2 className={styles.h2}>Costruito per agenzie e PMI.</h2>
            <p className={styles.lead}>
              Per chi vuole una presenza social professionale senza appesantire la propria struttura.
            </p>
          </div>
          <div className={styles.grid3}>
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
          <div className={styles.sectionIntroCenter}>
            <p className={styles.eyebrow}>Pacchetti</p>
            <h2 className={styles.h2}>Prezzi chiari, valore alto.</h2>
            <p className={styles.lead}>
              Prezzi mensili, IVA esclusa. Il budget pubblicitario è sempre separato dal canone.
            </p>
          </div>
          <div className={styles.priceGrid}>
            {PIANI.map(piano => (
              <TiltCard
                key={piano.nome}
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
                  href={`/register?piano=${piano.nome.toLowerCase()}`}
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
          <div className={styles.sectionIntroCenter}>
            <p className={styles.eyebrow}>FAQ</p>
            <h2 className={styles.h2}>Domande frequenti.</h2>
            <p className={styles.lead}>Trasparenza prima di iniziare.</p>
          </div>
          <div className={styles.faqList}>
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
            <h2 className={styles.h2}>Pronto a iniziare?</h2>
            <p>
              Esplora il pannello oppure scopri quale pacchetto è adatto alla tua attività.
              Ti rispondiamo e ti aiutiamo a partire.
            </p>
          </div>
          <div className={styles.finalActions}>
            <Link href="/dashboard" className={styles.primaryBtn}>
              Prova il pannello
              <ArrowRight size={18} />
            </Link>
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
    </main>
  )
}
