'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { Sparkles, Loader2, Check, Target, Hash, DollarSign, TrendingUp, Users, Eye, Smartphone, Monitor, Search, ChevronDown } from 'lucide-react'
import { useActiveClienteId } from '@/lib/tenant/client'
import { readAISettings, readApiError } from '@/lib/ai-client'
import { useRuntimeDemo } from '@/lib/demo-client'
import AIModelSelector from '@/components/AIModelSelector'
import OpenRouterKeyInput from '@/components/OpenRouterKeyInput'
import { CONTENT_QUALITY_OPTIONS, type ContentQuality } from '@/lib/content-quality'

type QualitySelection = 'auto' | ContentQuality

const PLATFORMS = [
  { id: 'google', name: 'Google Ads', icon: Search, gradient: 'from-blue-500 to-cyan-600' },
  { id: 'facebook', name: 'Facebook & Instagram', icon: Users, gradient: 'from-blue-600 to-purple-600' },
  { id: 'tiktok', name: 'TikTok Ads', icon: Smartphone, gradient: 'from-black to-gray-800' },
]

const OBIETTIVI = ['awareness', 'traffic', 'engagement', 'conversion', 'retention']

type AdsResult = Record<string, unknown> | null

export default function AdsPage() {
  const [platform, setPlatform] = useState('google')
  const [obiettivo, setObiettivo] = useState('conversion')
  const [budget, setBudget] = useState('50')
  const [productId, setProductId] = useState('')
  const [quality, setQuality] = useState<QualitySelection>('auto')
  const [products, setProducts] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AdsResult>(null)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [brand, setBrand] = useState<Record<string, unknown> | null>(null)
  const demo = useRuntimeDemo()
  const { clienteId, loading: loadingCliente } = useActiveClienteId()

  useEffect(() => {
    if (loadingCliente) return
    async function load() {
      if (demo) {
        setBrand({ brand_name: 'SILKinCOM', settore: 'Fashion/Abbigliamento', tono_voce: 'elegante', target: 'Donna 25-45' })
        setProducts([
          { id: 'p1', product_id: 'P001', nome_prodotto: 'Blazer in lino', prezzo: 129, link_prodotto: 'https://example.com/p/blazer-lino' },
          { id: 'p2', product_id: 'P002', nome_prodotto: 'Jeans dritti vita alta', prezzo: 89 },
          { id: 'p3', product_id: 'P003', nome_prodotto: 'T-shirt cotone bio', prezzo: 49 },
        ])
        return
      }
      if (!clienteId) return
      const [brandRes, prodRes] = await Promise.all([
        fetch('/api/data/brand').then(r => r.ok ? r.json() : null),
        fetch('/api/data/prodotti').then(r => r.ok ? r.json() : []),
      ])
      setBrand(brandRes)
      setProducts(Array.isArray(prodRes) ? prodRes : [])
    }
    load()
  }, [demo, clienteId, loadingCliente])

  async function handleGenerate() {
    setLoading(true)
    setMsg(null)
    setResult(null)

    const product = products.find(p => (p as Record<string, string>).product_id === productId || (p as Record<string, string>).id === productId)
    const productName = product ? (product as Record<string, string>).nome_prodotto || JSON.stringify(product) : 'Prodotto principale'

    if (demo) {
      await new Promise(r => setTimeout(r, 2000))
      const demoResults: Record<string, Record<string, unknown>> = {
        google: {
          campagna: { nome: `SILKinCOM - Blazer Lino - Search`, tipo: 'Search', reti: 'Google Search Network', budget_giornaliero: '€50' },
          ad_groups: [
            { nome: 'Blazer Lino', keyword: ['blazer lino', 'giacca lino donna', 'blazer lino elegante'], headlines: ['Blazer in Lino | Eleganza Italiana', 'Scopri il Blazer Perfetto', 'Linee Essential, Stile Unico'], descriptions: ['Blazer in lino made in Italy. Eleganza e qualità per la donna moderna. Scopri la collezione.', 'Acquista ora il blazer in lino. Reso gratuito, spedizione in 24h. Approfitta delle offerte.'] },
            { nome: 'Abito Elegante', keyword: ['abito elegante donna', 'outfit ufficio', 'moda donna professionista'], headlines: ['Outfit Elegante | Scopri Ora', 'Il Tuo Stile, La Nostra Qualità', 'Pronta per Ogni Occasione'], descriptions: ['Completa il tuo guardaroba con i nostri capi essenziali. Qualità made in Italy.', 'Scopri la nuova collezione Primavera-Estate. Eleganza senza compromessi.'] },
          ],
          sitelinks: ['Collezione Primavera', 'Blazer in Lino', 'Jeans Vita Alta', 'Nuovi Arrivi', 'Outlet', 'Spedizione Gratuita'],
          callouts: ['Spedizione 24h', 'Reso Gratuito', 'Qualità Made in Italy', 'Pagamenti Sicuri', 'Assistenza Dedicata'],
          negative_keywords: ['gratis', 'usato', 'economico', 'cinese', 'low cost'],
          landing_page: 'https://example.com/p/blazer-lino',
        },
        facebook: {
          campagna: { nome: 'SILKinCOM - Blazer Lino - Conversion', obiettivo: 'conversion', buying_type: 'auction' },
          audience: [
            { nome: 'Donne Fashion 25-45', tipo: 'Interesse', dettaglio: 'High spender moda', eta: '25-45', interessi: 'Moda, Shopping online, Luxury brands, Stile italiano' },
            { nome: 'Lookalike Clienti', tipo: 'Lookalike 3%', dettaglio: 'Basato su acquisti recenti', eta: '25-55', interessi: '-' },
            { nome: 'Retargeting Sito', tipo: 'Retargeting', dettaglio: 'Visitatori ultimi 30gg', eta: '-', interessi: '-' },
          ],
          ad_copy: [
            { audience: 'Donne Fashion 25-45', primary_text: 'Scopri il blazer in lino che manca al tuo guardaroba. Eleganza italiana, qualità senza tempo. ✨', headline: 'Blazer in Lino Premium', description: 'Made in Italy | Sped. Gratuita', cta: 'Shop Now', formato_creativo: 'Carousel 3 immagini', aspect_ratio: '1:1' },
            { audience: 'Lookalike Clienti', primary_text: 'I nostri clienti amano la qualità. Scopri perché.', headline: 'Qualità Italiana', description: 'Unisciti a loro', cta: 'Scopri', formato_creativo: 'Video 15s', aspect_ratio: '9:16' },
            { audience: 'Retargeting Sito', primary_text: 'Ancora indecisa? Il tuo blazer ti aspetta con il 10% di sconto.', headline: 'Offerta Esclusiva', description: 'Solo per te - 10%', cta: 'Acquista Ora', formato_creativo: 'Single Image', aspect_ratio: '1:1' },
          ],
          placement_consigliati: ['Instagram Feed', 'Instagram Stories', 'Facebook Feed', 'Reels'],
          note_strategia: 'Iniziare con carousel per mostrare varianti colore. Video 15s per retargeting.',
        },
        tiktok: {
          campagna: { nome: 'SILKinCOM - Blazer - TikTok', obiettivo: 'traffic', budget: '€30/giorno' },
          ad_groups: [
            { nome: 'Try-on Haul', targeting_eta: '22-35', interessi: ['Fashion', 'Outfit ideas', 'Style tips', 'GRWM'], video_script: 'Apri busta → mostra blazer → try-on davanti specchio → 3 outfit diversi → CTA "Link in bio"', hook: 'POV: trovi il blazer perfetto', caption: 'Il blazer che fa la differenza nel tuo guardaroba primaverile ☀️ Qualità che si vede. #outfitideas #springfashion', cta: 'Link in bio', durata_secondi: 20 },
            { nome: 'Styling Tips', targeting_eta: '25-40', interessi: ['Fashion styling', 'Office outfits', 'Capsule wardrobe'], video_script: 'Outfit da ufficio con blazer → outfit weekend → outfit serata → stesso blazer, 3 look → CTA', hook: 'Un blazer, 3 look diversi', caption: 'Quanto è versatile il blazer in lino? Scopri 3 modi di indossarlo e trova il tuo stile ✨ #modaitaliana #springstyle', cta: 'Shop now', durata_secondi: 25 },
          ],
          trend_audio_mood: 'Musica allegra/estiva, piano acustico o lo-fi. Female target 25-35.',
          hashtag: { branded: ['#silkincom', '#eleganzaitaliana', '#essentialmoda'], trending: ['#springfashion', '#outfitinspo', '#blazeroutfit', '#modaitaliana', '#styletips'] },
          note_creative: 'Video verticale 9:16. Luce naturale. Stile autentico, non troppo prodotto. Transizioni veloci.',
          landing_page: 'https://example.com/p/blazer-lino',
        },
      }
      setResult(demoResults[platform])
      setMsg({ type: 'ok', text: 'Campagna generata! (demo)' })
      setLoading(false)
      return
    }

    try {
      const aiSettings = readAISettings()
      const res = await fetch('/api/generate/ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_id: clienteId,
          platform,
          brand,
          product: productName,
          obiettivo,
          budget: `${budget}EUR/giorno`,
          quality,
          ...aiSettings,
        }),
      })
      if (!res.ok) throw new Error(await readApiError(res, 'Generazione campagna fallita'))
      const data = await res.json()
      setResult(data)
      setMsg({ type: 'ok', text: 'Campagna pubblicitaria generata!' })
    } catch (e) {
      setMsg({ type: 'err', text: (e as Error).message })
    }
    setLoading(false)
  }

  const PlatformIcon = PLATFORMS.find(p => p.id === platform)?.icon || Search

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl md:text-3xl font-bold text-gray-900 tracking-tight">Campagne Ads</h1>
        <p className="text-xs md:text-sm text-gray-500 mt-1">AI genera annunci Google, Facebook/Instagram e TikTok con copy, targeting e strategia.</p>
      </div>

      <AIModelSelector task="contenuti-social" />
      <OpenRouterKeyInput />

      {/* Platform Tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-2">
        {PLATFORMS.map(p => {
          const Icon = p.icon
          const active = platform === p.id
          return (
            <button
              key={p.id}
              onClick={() => { setPlatform(p.id); setResult(null); setMsg(null) }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                active
                  ? `bg-gradient-to-r ${p.gradient} text-white shadow-md`
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {p.name}
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Controls */}
        <div className="space-y-4">
          {/* Goal */}
          <div className="card p-4">
            <label className="label flex items-center gap-1.5"><Target className="w-3.5 h-3.5 text-gray-400" /> Obiettivo campagna</label>
            <select value={obiettivo} onChange={e => setObiettivo(e.target.value)} className="input mt-1">
              {OBIETTIVI.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>

          {/* Product */}
          <div className="card p-4">
            <label className="label flex items-center gap-1.5"><Hash className="w-3.5 h-3.5 text-gray-400" /> Prodotto</label>
            <select value={productId} onChange={e => setProductId(e.target.value)} className="input mt-1">
              <option value="">Generale (tutti i prodotti)</option>
              {products.map(p => {
                const pid = (p as Record<string, string>).product_id || (p as Record<string, string>).id
                return <option key={pid} value={pid}>{(p as Record<string, string>).nome_prodotto}</option>
              })}
            </select>
          </div>

          {/* Budget */}
          <div className="card p-4">
            <label className="label flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5 text-gray-400" /> Budget giornaliero (€)</label>
            <input type="number" value={budget} onChange={e => setBudget(e.target.value)} min="5" className="input mt-1" />
          </div>

          <div className="card p-4">
            <label className="label flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-gray-400" /> Qualità strategia</label>
            <select value={quality} onChange={event => setQuality(event.target.value as QualitySelection)} className="input mt-1">
              {CONTENT_QUALITY_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>{option.label} — {option.desc}</option>
              ))}
            </select>
          </div>

          {/* Generate */}
          <button onClick={handleGenerate} disabled={loading} className="btn-primary w-full justify-center text-sm py-3">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? 'Generando...' : `Genera campagna ${PLATFORMS.find(p => p.id === platform)?.name}`}
          </button>

          {msg && (
            <div className={`p-3 rounded-lg text-sm ${msg.type === 'ok' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {msg.text}
            </div>
          )}
        </div>

        {/* Right: Result */}
        <div className="lg:col-span-2">
          {result ? <AdsResultView platform={platform} result={result} /> : (
            <div className="card p-10 text-center text-gray-400">
              <div className={`inline-flex w-16 h-16 rounded-2xl bg-gradient-to-r ${PLATFORMS.find(p => p.id === platform)?.gradient} items-center justify-center mb-4`}>
                <PlatformIcon className="w-7 h-7 text-white" />
              </div>
              <p className="font-medium text-gray-600">Nessuna campagna ancora</p>
              <p className="text-xs mt-1">Configura obiettivo, prodotto e budget. Poi genera.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function AdsResultView({ platform, result }: { platform: string; result: Record<string, unknown> }) {
  if (platform === 'google') return <GoogleAdsView result={result} />
  if (platform === 'facebook') return <FacebookAdsView result={result} />
  if (platform === 'tiktok') return <TiktokAdsView result={result} />
  return null
}

function GoogleAdsView({ result }: { result: Record<string, unknown> }) {
  const campagna = result.campagna as Record<string, string> | null
  const adGroups = Array.isArray(result.ad_groups) ? result.ad_groups as Array<Record<string, unknown>> : []
  const sitelinks = Array.isArray(result.sitelinks) ? result.sitelinks as string[] : []
  const callouts = Array.isArray(result.callouts) ? result.callouts as string[] : []
  const negativeKeywords = Array.isArray(result.negative_keywords) ? result.negative_keywords as string[] : []
  const landingPage = typeof result.landing_page === 'string' ? result.landing_page : null

  return (
    <div className="space-y-4">
      {campagna && (
        <div className="card p-4">
          <h3 className="font-bold text-gray-900">Campagna</h3>
          <p className="text-sm font-medium text-brand-600">{campagna.nome}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">{campagna.tipo}</span>
            <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{campagna.reti}</span>
            <span className="text-[10px] px-2 py-0.5 bg-green-100 text-green-700 rounded-full">{campagna.budget_giornaliero}/giorno</span>
          </div>
        </div>
      )}

      {adGroups.map((ag, i) => (
        <div key={i} className="card p-4 border-l-4 border-brand-500">
          <h4 className="font-bold text-gray-900 text-sm">{ag.nome as string}</h4>
          {Array.isArray(ag.keyword) && (
            <div className="flex flex-wrap gap-1 mt-1 mb-2">
              {(ag.keyword as string[]).map((kw, j) => (
                <span key={j} className="text-[10px] px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">{kw}</span>
              ))}
            </div>
          )}
          <div className="bg-gray-50 rounded-lg p-3 mt-2">
            <p className="text-[10px] uppercase text-gray-400 mb-1">Anteprima Annuncio</p>
            {Array.isArray(ag.headlines) && (ag.headlines as string[]).slice(0, 3).map((h, j) => (
              <p key={`h${j}`} className="text-xs text-brand-700 font-medium">Headline {j + 1}: {h}</p>
            ))}
            {Array.isArray(ag.descriptions) && (ag.descriptions as string[]).slice(0, 2).map((d, j) => (
              <p key={`d${j}`} className="text-xs text-gray-600 mt-1">Desc {j + 1}: {d}</p>
            ))}
          </div>
        </div>
      ))}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sitelinks.length > 0 && (
          <div className="card p-3">
            <p className="text-[10px] uppercase text-gray-500 font-bold mb-1.5">Sitelink Extension</p>
            <div className="flex flex-wrap gap-1">
              {sitelinks.map((s, i) => <span key={i} className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">{s}</span>)}
            </div>
          </div>
        )}
        {callouts.length > 0 && (
          <div className="card p-3">
            <p className="text-[10px] uppercase text-gray-500 font-bold mb-1.5">Callout Extension</p>
            <div className="flex flex-wrap gap-1">
              {callouts.map((c, i) => <span key={i} className="text-[10px] px-2 py-0.5 bg-green-100 text-green-700 rounded-full">{c}</span>)}
            </div>
          </div>
        )}
      </div>

      {negativeKeywords.length > 0 && (
        <div className="card p-3 border-red-100">
          <p className="text-[10px] uppercase text-red-500 font-bold mb-1.5">Negative Keywords</p>
          <div className="flex flex-wrap gap-1">
            {negativeKeywords.map((nk, i) => <span key={i} className="text-[10px] px-2 py-0.5 bg-red-100 text-red-600 rounded-full">-{nk}</span>)}
          </div>
        </div>
      )}

      {landingPage && (
        <div className="card p-3">
          <p className="text-[10px] uppercase mb-1">Landing Page</p>
          <a href={landingPage} target="_blank" rel="noopener" className="text-xs text-brand-600 hover:underline">{landingPage}</a>
        </div>
      )}
    </div>
  )
}

function FacebookAdsView({ result }: { result: Record<string, unknown> }) {
  const campagna = result.campagna as Record<string, string> | null
  const audience = Array.isArray(result.audience) ? result.audience as Array<Record<string, string>> : []
  const adCopy = Array.isArray(result.ad_copy) ? result.ad_copy as Array<Record<string, string>> : []
  const placements = Array.isArray(result.placement_consigliati) ? result.placement_consigliati as string[] : []
  const note = typeof result.note_strategia === 'string' ? result.note_strategia : null

  return (
    <div className="space-y-4">
      {campagna && (
        <div className="card p-4">
          <h3 className="font-bold text-gray-900">Campagna</h3>
          <p className="text-sm font-medium text-brand-600">{campagna.nome}</p>
          <div className="flex gap-2 mt-2">
            <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">{campagna.obiettivo}</span>
            <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{campagna.buying_type}</span>
          </div>
        </div>
      )}

      {audience.map((a, i) => (
        <div key={i} className="card p-3 border-l-4 border-purple-400">
          <p className="font-semibold text-sm text-gray-900">{a.nome}</p>
          <div className="flex gap-1 mt-1">
            <span className="text-[10px] px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">{a.tipo}</span>
            {a.eta && <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{a.eta}</span>}
          </div>
          <p className="text-xs text-gray-500 mt-1">{a.dettaglio}</p>
          {a.interessi && a.interessi !== '-' && <p className="text-[10px] text-gray-400 mt-0.5">Interessi: {a.interessi}</p>}
        </div>
      ))}

      {adCopy.length > 0 && (
        <div className="card p-4">
          <h4 className="font-bold text-sm text-gray-900 mb-3">Ad Creative</h4>
          {adCopy.map((ad, i) => (
            <div key={i} className="mb-3 pb-3 border-b border-gray-100 last:border-0">
              <div className="bg-gradient-to-br from-gray-50 to-purple-50 rounded-xl p-3 border border-purple-100 mb-2">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-3 h-3 text-purple-500" />
                  <span className="text-[10px] font-medium text-purple-700">{ad.audience}</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-600 rounded-full">{ad.formato_creativo} {ad.aspect_ratio}</span>
                </div>
                <p className="text-sm text-gray-800">{ad.primary_text}</p>
                <p className="text-sm font-bold text-brand-700 mt-1">{ad.headline}</p>
                <p className="text-xs text-gray-500">{ad.description}</p>
                <p className="text-[10px] text-blue-600 font-medium mt-1">[CTA: {ad.cta}]</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {placements.length > 0 && (
        <div className="card p-3">
          <p className="text-[10px] uppercase text-gray-500 font-bold mb-1.5">Placement Consigliati</p>
          <div className="flex flex-wrap gap-1">
            {placements.map((p, i) => <span key={i} className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">{p}</span>)}
          </div>
        </div>
      )}

      {note && (
        <div className="card p-3 bg-amber-50 border-amber-100">
          <p className="text-[10px] uppercase text-amber-600 font-bold mb-1">Strategia</p>
          <p className="text-xs text-amber-800">{note}</p>
        </div>
      )}
    </div>
  )
}

function TiktokAdsView({ result }: { result: Record<string, unknown> }) {
  const campagna = result.campagna as Record<string, string> | null
  const audio = typeof result.trend_audio_mood === 'string' ? result.trend_audio_mood : null
  const hashtags = result.hashtag as Record<string, string[]> | null
  const notes = typeof result.note_creative === 'string' ? result.note_creative : null
  const landingPage = typeof result.landing_page === 'string' ? result.landing_page : null

  const adGroups = (Array.isArray(result.ad_groups) ? result.ad_groups as Array<Record<string, unknown>> : []).map(ag => ({
    nome: typeof ag.nome === 'string' ? ag.nome : '',
    durata: typeof ag.durata_secondi === 'number' ? ag.durata_secondi : 0,
    interessi: Array.isArray(ag.interessi) ? ag.interessi as string[] : [],
    hook: typeof ag.hook === 'string' ? ag.hook : null,
    videoScript: typeof ag.video_script === 'string' ? ag.video_script : '',
    caption: typeof ag.caption === 'string' ? ag.caption : '',
    cta: typeof ag.cta === 'string' ? ag.cta : null,
    targetingEta: typeof ag.targeting_eta === 'string' ? ag.targeting_eta : '',
  }))

  const brandedTags = hashtags && Array.isArray(hashtags.branded) ? hashtags.branded : []
  const trendingTags = hashtags && Array.isArray(hashtags.trending) ? hashtags.trending : []

  return (
    <div className="space-y-4">
      {campagna && (
        <div className="card p-4">
          <h3 className="font-bold text-gray-900">Campagna</h3>
          <p className="text-sm font-medium text-brand-600">{campagna.nome}</p>
          <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">{campagna.obiettivo}</span>
          <span className="text-[10px] px-2 py-0.5 bg-green-100 text-green-700 rounded-full ml-1">{campagna.budget}</span>
        </div>
      )}

      {adGroups.map((ag, i) => (
        <div key={i} className="card p-4 border-l-4 border-black">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-bold text-sm text-gray-900">{ag.nome}</h4>
            {ag.durata > 0 && <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{ag.durata}s</span>}
          </div>
          {ag.interessi.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {ag.interessi.map((int, j) => <span key={j} className="text-[10px] px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">{int}</span>)}
            </div>
          )}
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            {ag.hook && (
              <div className="bg-black text-white text-xs font-bold px-3 py-1.5 rounded-lg inline-block">{ag.hook}</div>
            )}
            <p className="text-xs text-gray-600">{ag.videoScript}</p>
            <p className="text-xs text-gray-500 italic">{ag.caption}</p>
            {ag.cta && <p className="text-[10px] text-blue-600 font-medium">[CTA: {ag.cta}]</p>}
          </div>
        </div>
      ))}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {audio && (
          <div className="card p-3">
            <p className="text-[10px] uppercase mb-1.5">Audio</p>
            <div className="bg-gray-50 rounded-lg p-2">
              <p className="text-xs text-gray-700">🎵 {audio}</p>
            </div>
          </div>
        )}
        {(brandedTags.length > 0 || trendingTags.length > 0) && (
          <div className="card p-3">
            <p className="text-[10px] uppercase mb-1.5">Hashtag Strategy</p>
            {brandedTags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-1">
                {brandedTags.map((h, i) => <span key={i} className="text-[10px] px-2 py-0.5 bg-brand-100 text-brand-700 rounded-full">{h}</span>)}
              </div>
            )}
            {trendingTags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {trendingTags.map((h, i) => <span key={i} className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">{h}</span>)}
              </div>
            )}
          </div>
        )}
      </div>

      {notes && (
        <div className="card p-3 bg-amber-50 border-amber-100">
          <p className="text-[10px] uppercase text-amber-600 font-bold mb-1">Creative Notes</p>
          <p className="text-xs text-amber-800">{notes}</p>
        </div>
      )}

      {landingPage && (
        <div className="card p-3">
          <p className="text-[10px] uppercase mb-1">Landing Page</p>
          <p className="text-xs text-brand-600">{landingPage}</p>
        </div>
      )}
    </div>
  )
}
