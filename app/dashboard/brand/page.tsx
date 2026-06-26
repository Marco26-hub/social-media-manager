'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import type { Brand } from '@/lib/types'
import {
  Globe, Sparkles, Save, Loader2, Check,
  Palette, Target, MessageCircle, Hash,
  MousePointerClick, AlertTriangle, FileText,
  Search, TrendingUp
} from 'lucide-react'
import { readAISettings, readApiError } from '@/lib/ai-client'
import { useRuntimeDemo } from '@/lib/demo-client'
import { useActiveClienteId } from '@/lib/tenant/client'
import SeoScoreGrid from '@/components/SeoScoreGrid'
import LeadsCard from '@/components/LeadsCard'
import ClientsCard from '@/components/ClientsCard'
import AIModelSelector from '@/components/AIModelSelector'
import OpenRouterKeyInput from '@/components/OpenRouterKeyInput'

const TONI_VOCE = ['elegante','casual','ironico','professionale','emozionale','tecnico','luxury','friendly','sostenibile','istituzionale','ribelle','minimal','autoritario','giovanile']

const SETTORI = ['Fashion/Abbigliamento','Beauty/Cosmesi','Food/Bevande','Tech/Elettronica','Arredamento/Design','Fitness/Sport','Gioielli/Accessori','Libri/Editoria','Arte/Cultura','Servizi professionali','Turismo/Hospitality','Benessere/Salute','Auto/Mobility','Educazione/Formazione','Real Estate','Altro']

const PROMESSE = [
  { value: '', label: 'Seleziona promessa...' },
  { value: 'eleganza-accessibile', label: '✨ Eleganza accessibile' },
  { value: 'qualita-sostenibile', label: '🌿 Qualità sostenibile' },
  { value: 'innovazione-design', label: '💡 Innovazione + Design' },
  { value: 'lusso-discreto', label: '👑 Lusso discreto' },
  { value: 'tradizione-artigianale', label: '🛠️ Tradizione artigianale' },
  { value: 'benessere-autentico', label: '🧘 Benessere autentico' },
  { value: 'velocita-affidabilita', label: '⚡ Velocità + Affidabilità' },
  { value: 'personalizzazione-totale', label: '🎨 Personalizzazione totale' },
  { value: 'risparmio-qualita', label: '💰 Risparmio + Qualità' },
  { value: 'community-appartenenza', label: '🤝 Community & Appartenenza' },
  { value: 'avanguardia-tecnologica', label: '🔬 Avanguardia tecnologica' },
  { value: 'sicurezza-fiducia', label: '🛡️ Sicurezza & Fiducia' },
  { value: 'esperienza-premium', label: '🌟 Esperienza Premium' },
  { value: 'inclusivita-diversita', label: '🌈 Inclusività & Diversità' },
  { value: 'altre', label: 'Altre (scrivi sotto)' },
]

const TARGET_OPTIONS = [
  'Donna 18-24', 'Donna 25-34', 'Donna 35-44', 'Donna 45-54', 'Donna 55+',
  'Uomo 18-24', 'Uomo 25-34', 'Uomo 35-44', 'Uomo 45-54', 'Uomo 55+',
  'Unisex', 'Professionisti', 'Imprenditori', 'Studenti', 'Neomamme',
  'Famiglie', 'Appassionati moda', 'Appassionati tech', 'Fitness addicted',
  'Viaggiatori', 'Foodies', 'Artisti/Creativi', 'Senior/Over 60',
  'Lusso/Alto spendenti', 'Budget conscious', 'Eco-consapevoli',
]

const EMOJI_OPTIONS = [
  { value: '', label: 'Seleziona policy...', emoji: '' },
  { value: 'nessuna', label: '❌ Nessuna emoji', emoji: '' },
  { value: 'minimal-2', label: '✨🤍 Max 2 emoji eleganti per post', emoji: '✨🤍🖤' },
  { value: 'moderato', label: '📸🔥 3-5 emoji naturali per post', emoji: '🔥💪✨🎯📸' },
  { value: 'friendly', label: '😊👍 Emoji amichevoli, frequenti', emoji: '😊👍💕🎉🙌' },
  { value: 'trendy', label: '💅✨ Emoji trend, giovani, molti', emoji: '💅✨💫🌟👑' },
  { value: 'business', label: '📊✅ Emoji professionali, rari', emoji: '📊✅📈💼🎯' },
  { value: 'food', label: '🍝🍷 Emoji cibo/vino, abbondanti', emoji: '🍝🍷🥗🍰☕' },
  { value: 'nature', label: '🌿🌸 Emoji natura, sostenibili', emoji: '🌿🌸🌍🍃💚' },
  { value: 'tech', label: '💻⚡ Emoji tech, moderni', emoji: '💻⚡🤖🚀📱' },
  { value: 'max', label: '🎉 Sì a tutte, max 6 per post', emoji: '🎉✨🔥💯💫🎯' },
  { value: 'custom', label: '✏️ Personalizzata (scrivi sotto)', emoji: '' },
]

export default function BrandPage() {
  const [brand, setBrand] = useState<Partial<Brand> | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [discovering, setDiscovering] = useState(false)
  const [genKeywords, setGenKeywords] = useState(false)
  const [genHashtags, setGenHashtags] = useState(false)
  const [genTrends, setGenTrends] = useState(false)
  const [genCTA, setGenCTA] = useState(false)
  const [genCompliance, setGenCompliance] = useState(false)
  const [complianceResult, setComplianceResult] = useState<Record<string, unknown> | null>(null)
  const [url, setUrl] = useState('')
  const [includeSeo, setIncludeSeo] = useState(false)
  const [includeGeo, setIncludeGeo] = useState(false)
  const [includeLeads, setIncludeLeads] = useState(false)
  const [includeClients, setIncludeClients] = useState(false)
  const [seoResult, setSeoResult] = useState<Record<string, unknown> | null>(null)
  const [leadsResult, setLeadsResult] = useState<Record<string, unknown> | null>(null)
  const [clientsResult, setClientsResult] = useState<Record<string, unknown> | null>(null)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const demo = useRuntimeDemo()
  const { clienteId } = useActiveClienteId()

  useEffect(() => {
    async function load() {
      if (demo) {
        setBrand({
          brand_name: 'SILKinCOM',
          sito_url: 'https://silkincom.com',
          settore: 'Fashion/Abbigliamento',
          tono_voce: 'elegante',
          target: 'Donna 25-34, Donna 35-44, Professioniste',
          promessa_brand: '✨ Eleganza accessibile',
          colori_brand: 'Beige, Nero, Bianco, Oro',
          parole_da_usare: '#SEO:eleganza,#SEO:moda,#GEO:stile italiano,#LONGTAIL:abiti eleganti,#BRANDED:silkincom',
          parole_da_evitare: '#EVITA:economico,low cost,#EVITA:fast fashion, cinese,#EVITA:saldi',
          emoji_policy: '✨🤍🖤 Max 2 emoji eleganti per post',
          hashtag_base: '#BRANDED:silkincom, #BRANDED:stileitaliano, #SETTORE:fashion, #SETTORE:modadonna, #NICCHIA:outfitprimavera',
          cta_base: 'Scopri la collezione',
          note_legali: '',
          disclaimer_text: 'Le immagini sono a scopo illustrativo. I colori reali possono variare.',
          gdpr_note: 'I dati personali sono trattati secondo il Reg. UE 2016/679. Titolare: SILKinCOM Srl.',
          privacy_note: 'Informativa completa su www.silkincom.com/privacy',
          cookie_policy: 'Questo sito utilizza cookie tecnici e di profilazione.',
        })
        setUrl('https://silkincom.com')
        setLoading(false)
        return
      }
      try {
        const res = await fetch('/api/data/brand')
        const data = res.ok ? await res.json() : null
        setBrand(data || { brand_name: '' })
        if (data?.sito_url) setUrl(data.sito_url)
      } catch { setBrand({ brand_name: '' }) }
      setLoading(false)
    }
    load()
  }, [demo])

  function hasOpenRouterKey() {
    return typeof window !== 'undefined' && Boolean(localStorage.getItem('openrouter_key')?.trim())
  }

  async function handleDiscovery() {
    if (!url.trim()) { setMsg({ type: 'err', text: 'Inserisci URL del sito' }); return }
    setDiscovering(true); setMsg(null); setSeoResult(null); setLeadsResult(null); setClientsResult(null)
    const runSeo = includeSeo || includeGeo

    if (demo && !hasOpenRouterKey()) {
      await new Promise(r => setTimeout(r, 1500))
      setBrand(prev => ({ ...prev, sito_url: url, settore: 'Fashion/Abbigliamento', tono_voce: 'elegante', target: 'Donna 25-34, Donna 35-44, Professioniste', promessa_brand: '✨ Eleganza accessibile', colori_brand: 'Beige, Nero, Bianco', parole_da_usare: '#SEO:eleganza, #SEO:qualità', parole_da_evitare: '#EVITA:economico, low cost', emoji_policy: '✨🤍🖤', hashtag_base: '#BRANDED:silkincom, #SETTORE:fashion' }))
      if (runSeo) setSeoResult({ score_globale: 72, score_seo_tecnico: 85, score_seo_contenuti: 70, score_geo_ai_search: 58, score_social_coerenza: 80, score_eeat: 65, riepilogo: 'Analisi completata.', punti_forti: ['SEO base presente'], punti_critici: ['Migliorare GEO'] })
      if (includeLeads) setLeadsResult({ email: ['info@silkincom.com'], whatsapp: [], telegram: [], telefono: [], social: [], form_contatti_url: 'https://silkincom.com/contatti', indirizzo: '' })
      if (includeClients) setClientsResult({ icp: 'Donna 25-45', buyer_personas: [], competitor: [], opportunita_vendita: [], canali_acquisizione: [] })
      const parts = ['Profilo brand generato']; if (runSeo) parts.push('+ SEO/GEO'); if (includeLeads) parts.push('+ Contatti'); if (includeClients) parts.push('+ Marketing')
      setMsg({ type: 'ok', text: parts.join(' ') + '. Rivedi e salva.' }); setDiscovering(false); return
    }

    try {
      const aiSettings = readAISettings()
      const discoveryRes = await fetch('/api/generate/brand-discovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, ...aiSettings }),
      })
      if (!discoveryRes.ok) throw new Error(await readApiError(discoveryRes, 'Brand discovery fallita'))
      const discoveryData = await discoveryRes.json()
      setBrand(prev => ({ ...prev, ...discoveryData, sito_url: url }))

      const sideTasks: Array<{ label: string; run: () => Promise<void> }> = []
      if (runSeo) {
        sideTasks.push({
          label: 'SEO/GEO',
          run: async () => {
            if (!clienteId) throw new Error('cliente non selezionato')
            const res = await fetch('/api/generate/seo-audit', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ cliente_id: clienteId, sito_url: url, periodo: 'settimanale', ...aiSettings }),
            })
            if (!res.ok) throw new Error(await readApiError(res, 'Audit SEO/GEO fallito'))
            const auditsRes = await fetch('/api/data/seo-audit')
            if (!auditsRes.ok) throw new Error(await readApiError(auditsRes, 'Lettura audit fallita'))
            const audits = await auditsRes.json()
            if (Array.isArray(audits) && audits.length > 0) setSeoResult(audits[0])
          },
        })
      }
      if (includeLeads) {
        sideTasks.push({
          label: 'Contatti',
          run: async () => {
            const res = await fetch('/api/generate/scrape-contacts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url, ...aiSettings }),
            })
            if (!res.ok) throw new Error(await readApiError(res, 'Ricerca contatti fallita'))
            setLeadsResult(await res.json())
          },
        })
      }
      if (includeClients) {
        sideTasks.push({
          label: 'Marketing',
          run: async () => {
            const res = await fetch('/api/generate/client-discovery', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url, settore: brand?.settore || '', ...aiSettings }),
            })
            if (!res.ok) throw new Error(await readApiError(res, 'Analisi clienti fallita'))
            setClientsResult(await res.json())
          },
        })
      }

      const settled = await Promise.allSettled(sideTasks.map(task => task.run()))
      const warnings = settled
        .map((result, index) => result.status === 'rejected' ? `${sideTasks[index].label}: ${(result.reason as Error).message}` : null)
        .filter(Boolean)
      const parts = ['Profilo generato']; if (runSeo) parts.push('+ SEO/GEO'); if (includeLeads) parts.push('+ Contatti'); if (includeClients) parts.push('+ Marketing')
      setMsg({ type: 'ok', text: warnings.length ? `${parts.join(' ')}. Warning: ${warnings.join(' · ')}` : parts.join(' ') + '! Rivedi e clicca Salva.' })
    } catch (e) { setMsg({ type: 'err', text: (e as Error).message }) }
    setDiscovering(false)
  }

  async function generateField(type: 'keywords' | 'hashtags' | 'trends' | 'cta') {
    const setter = type === 'keywords' ? setGenKeywords : type === 'hashtags' ? setGenHashtags : type === 'trends' ? setGenTrends : setGenCTA
    setter(true)
    const settore = (brand as Record<string, string>)?.settore || ''
    const target = (brand as Record<string, string>)?.target || ''
    const tono = (brand as Record<string, string>)?.tono_voce || ''

    if (demo && !hasOpenRouterKey()) {
      await new Promise(r => setTimeout(r, 1200))
      if (type === 'keywords') update('parole_da_usare', '#SEO:parola1, #SEO:parola2, #GEO:keyword geo, #LONGTAIL:frase lunga, #BRANDED:nome brand')
      if (type === 'hashtags') update('hashtag_base', '#BRANDED:nomebrand, #SETTORE:settore, #NICCHIA:parola, #TREND:tendenza')
      if (type === 'trends') update('colori_brand', '🔮 Tendenze: Pantone 2026: Digital Lavender, Mocha Mousse. Colori caldi e neutri dominanti.')
      setter(false); return
    }

    try {
      const aiSettings = readAISettings()
      const res = await fetch('/api/generate/brand-keywords', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cliente_id: clienteId, brand: brand || {}, settore, target, tono, ...aiSettings }),
      })
      if (!res.ok) throw new Error(await readApiError(res, 'Generazione keyword fallita'))
      const data = await res.json()
      if (type === 'keywords') {
        const words = (data.parole_da_usare as Array<Record<string, string>> || []).map((w: Record<string, string>) => `#${w.categoria}:${w.keyword}`).join(', ')
        update('parole_da_usare', words || JSON.stringify(data.parole_da_usare))
      }
      if (type === 'hashtags') {
        const tags = (data.hashtag as Array<Record<string, string>> || []).map((h: Record<string, string>) => `#${h.categoria}:${h.tag}`).join(', ')
        update('hashtag_base', tags || JSON.stringify(data.hashtag))
        if (data.emoji_consigliate) {
          const ep = data.emoji_consigliate as Record<string, unknown>
          update('emoji_policy', `${(ep.brand as string[] || []).join(' ')} ${(ep.post as string[] || []).slice(0, 3).join(' ')} — ${ep.frequenza || ''}`)
        }
      }
      if (type === 'trends') {
        update('colori_brand', data.colori_tendenza || 'Tendenze aggiornate')
      }
      if (type === 'cta') {
        const ctaSuggeriti = data.cta_suggeriti as string[] | undefined
        update('cta_base', ctaSuggeriti?.[0] || 'Scopri di più')
      }
    } catch (e) { setMsg({ type: 'err', text: `AI: ${(e as Error).message}` }) }
    setter(false)
  }

  async function generateCompliance() {
    setGenCompliance(true)
    setComplianceResult(null)
    if (demo && !hasOpenRouterKey()) {
      await new Promise(r => setTimeout(r, 2000))
      setComplianceResult({
        cookie_policy: 'Questo sito utilizza cookie tecnici per il corretto funzionamento e cookie di profilazione...',
        gdpr_informativa: 'Titolare del trattamento: SILKinCOM Srl. DPO: dpo@silkincom.com',
        privacy_policy: 'SILKinCOM rispetta la tua privacy. Non vendiamo i tuoi dati a terzi.',
        disclaimer: 'Le immagini sono a scopo illustrativo. I colori possono variare.',
        condizioni_vendita: 'Diritto di recesso entro 14 giorni (Art. 52 D.Lgs. 206/2005).',
        normative_riferimento: ['Reg. UE 2016/679', 'D.Lgs. 206/2005', 'D.Lgs. 70/2003'],
        note: 'Documenti generati automaticamente. Si consiglia revisione legale.',
      })
      setGenCompliance(false); return
    }
    try {
      const aiSettings = readAISettings()
      const settore = (brand as Record<string, string>)?.settore || ''
      const target = (brand as Record<string, string>)?.target || ''
      const url = (brand as Record<string, string>)?.sito_url || ''
      const res = await fetch('/api/generate/compliance', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cliente_id: clienteId, brand: brand || {}, settore, url, target, ...aiSettings }),
      })
      if (!res.ok) throw new Error(await readApiError(res, 'Generazione compliance fallita'))
      const data = await res.json()
      setComplianceResult(data)
      if (data.cookie_policy) update('cookie_policy', (data.cookie_policy as string).slice(0, 500))
      if (data.gdpr_informativa) update('gdpr_note', (data.gdpr_informativa as string).slice(0, 500))
      if (data.privacy_policy) update('privacy_note', (data.privacy_policy as string).slice(0, 500))
      if (data.disclaimer) update('disclaimer_text', (data.disclaimer as string).slice(0, 300))
    } catch (e) { setMsg({ type: 'err', text: `AI Compliance: ${(e as Error).message}` }) }
    setGenCompliance(false)
  }

  async function handleSave() {
    setSaving(true); setMsg(null)
    if (demo) { await new Promise(r => setTimeout(r, 800)); setMsg({ type: 'ok', text: 'Profilo brand salvato (demo)' }); setSaving(false); return }
    try {
      const res = await fetch('/api/data/brand', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(brand) })
      if (!res.ok) throw new Error((await res.json()).error)
      setMsg({ type: 'ok', text: 'Profilo brand salvato con successo' })
    } catch (e) { setMsg({ type: 'err', text: (e as Error).message }) }
    setSaving(false)
  }

  function update(field: string, value: string) { setBrand(prev => prev ? { ...prev, [field]: value } : null) }

  function toggleTarget(tag: string) {
    const current = brand?.target ? brand.target.split(',').map((x: string) => x.trim()).filter(Boolean) : []
    const idx = current.indexOf(tag)
    if (idx >= 0) current.splice(idx, 1); else current.push(tag)
    update('target', current.join(', '))
  }

  function handlePromessa(val: string) {
    const label = PROMESSE.find(p => p.value === val)?.label?.replace(/^[^\s]+\s/, '') || val
    update('promessa_brand', label || val)
  }

  function handleEmoji(val: string) {
    const opt = EMOJI_OPTIONS.find(e => e.value === val)
    update('emoji_policy', opt?.label || val)
  }

  const selectedTargets = brand?.target ? brand.target.split(',').map((x: string) => x.trim()).filter(Boolean) : []

  if (loading) return <div className="p-8 flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-gray-400 animate-spin" /></div>

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl md:text-3xl font-bold text-gray-900 tracking-tight">Profilo Brand</h1>
        <p className="text-xs md:text-sm text-gray-500 mt-1">DNA del brand. AI usa questi dati per contenuti, ads, SEO e marketing.</p>
      </div>

      {demo && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Modalità demo rilevata: senza `DATABASE_URL`/auth l’AI usa dati simulati. Se incolli una OpenRouter key qui sotto, i generatori AI usano comunque la chiamata reale.
        </div>
      )}

      <AIModelSelector />
      <OpenRouterKeyInput />

      {/* AI Discovery */}
      <div className="card p-5 mb-6 bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 border-violet-100">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0"><Sparkles className="w-5 h-5 text-white" /></div>
          <div>
            <h2 className="font-bold text-gray-900">AI Brand Discovery</h2>
            <p className="text-xs text-gray-500 mt-0.5">Inserisci URL sito. AI analizza e compila il profilo automaticamente.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1"><Globe className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://esempio.com" className="input pl-9" /></div>
          <button onClick={handleDiscovery} disabled={discovering} className="btn-primary text-sm px-5">
            {discovering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {discovering ? 'Analizzo...' : 'Analizza sito'}
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-violet-200">
          {[{ k: includeSeo, s: setIncludeSeo, icon: Search, label: 'SEO Audit', badge: 'Tecnico', badgeClass: 'bg-gray-100 text-gray-700' },
            { k: includeGeo, s: setIncludeGeo, icon: TrendingUp, label: 'GEO Audit', badge: 'AI Search', badgeClass: 'bg-purple-100 text-purple-700' },
            { k: includeLeads, s: setIncludeLeads, icon: MessageCircle, label: 'Trova contatti', badge: 'Lead', badgeClass: 'bg-green-100 text-green-700' },
            { k: includeClients, s: setIncludeClients, icon: Target, label: 'Clienti & Marketing', badge: 'ICP', badgeClass: 'bg-orange-100 text-orange-700' },
          ].map(({ k, s, icon: Icon, label, badge, badgeClass }) => (
            <label key={label} className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={k} onChange={e => { s(e.target.checked); if (label === 'GEO Audit' && e.target.checked) setIncludeSeo(true) }} className="w-3.5 h-3.5 rounded border-gray-300 text-brand-600" />
              <Icon className="w-3 h-3 text-gray-500" />
              <span className="text-xs text-gray-700">{label}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${badgeClass}`}>{badge}</span>
            </label>
          ))}
        </div>
      </div>

      <SeoScoreGrid result={seoResult} includeGeo={includeGeo} />
      <LeadsCard result={leadsResult} url={url} />
      <ClientsCard result={clientsResult} />

      {/* Brand Form */}
      <div className="space-y-3">
        {/* Nome + Settore */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="card p-4">
            <label className="label"><Globe className="w-3.5 h-3.5 text-gray-400 inline mr-1" /> Nome Brand</label>
            <input value={brand?.brand_name || ''} onChange={e => update('brand_name', e.target.value)} placeholder="Nome del brand" className="input mt-1" />
          </div>
          <div className="card p-4">
            <label className="label"><Globe className="w-3.5 h-3.5 text-gray-400 inline mr-1" /> Settore</label>
            <select value={(brand as Record<string, string>)?.settore || ''} onChange={e => update('settore', e.target.value)} className="input mt-1">
              <option value="">Seleziona settore...</option>
              {SETTORI.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Tono + Promessa */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="card p-4">
            <label className="label"><MessageCircle className="w-3.5 h-3.5 text-gray-400 inline mr-1" /> Tono di voce</label>
            <select value={brand?.tono_voce || ''} onChange={e => update('tono_voce', e.target.value)} className="input mt-1">
              <option value="">Seleziona tono...</option>
              {TONI_VOCE.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="card p-4">
            <label className="label"><Sparkles className="w-3.5 h-3.5 text-gray-400 inline mr-1" /> Promessa Brand</label>
            <select value={PROMESSE.find(p => brand?.promessa_brand?.includes(p.value) || brand?.promessa_brand?.includes(p.label.replace(/^[^\s]+\s/, '')))?.value || ''} onChange={e => handlePromessa(e.target.value)} className="input mt-1">
              {PROMESSE.map(p => <option key={p.value} value={p.value}>{p.label || p.value}</option>)}
            </select>
            {brand?.promessa_brand && <p className="text-[10px] text-gray-400 mt-1">Valore attuale: {brand.promessa_brand}</p>}
          </div>
        </div>

        {/* Target multi-select */}
        <div className="card p-4">
          <label className="label"><Target className="w-3.5 h-3.5 text-gray-400 inline mr-1" /> Target Audience</label>
          <p className="text-[10px] text-gray-400 mb-2">Seleziona uno o più target:</p>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {TARGET_OPTIONS.map(t => {
              const sel = selectedTargets.includes(t)
              return <button key={t} type="button" onClick={() => toggleTarget(t)} className={`text-[11px] px-2.5 py-1 rounded-full border transition-all ${sel ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>{sel ? '✓ ' : ''}{t}</button>
            })}
          </div>
          <input value={brand?.target || ''} onChange={e => update('target', e.target.value)} placeholder="Target personalizzato..." className="input text-xs" />
        </div>

        {/* Colori + Trend */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-1">
            <label className="label"><Palette className="w-3.5 h-3.5 text-gray-400 inline mr-1" /> Colori Brand</label>
            <button type="button" onClick={() => generateField('trends')} disabled={genTrends} className="text-[10px] px-2 py-1 bg-gradient-to-r from-pink-100 to-purple-100 text-purple-700 rounded-full hover:from-pink-200 flex items-center gap-1">
              {genTrends ? <Loader2 className="w-3 h-3 animate-spin" /> : <TrendingUp className="w-3 h-3" />}
              {genTrends ? 'Analizzo...' : 'Analizza tendenze'}
            </button>
          </div>
          <input value={brand?.colori_brand || ''} onChange={e => update('colori_brand', e.target.value)} placeholder="Es: Beige, #F5F5F5, RGB(139,92,246), Pantone..." className="input mt-1" />
        </div>

        {/* Parole da usare SEO/GEO */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-1">
            <label className="label"><Check className="w-3.5 h-3.5 text-green-500 inline mr-1" /> Parole da usare (SEO + GEO)</label>
            <button type="button" onClick={() => generateField('keywords')} disabled={genKeywords} className="text-[10px] px-2 py-1 bg-green-100 text-green-700 rounded-full hover:bg-green-200 flex items-center gap-1">
              {genKeywords ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              {genKeywords ? 'Genero...' : 'AI genera'}
            </button>
          </div>
          <p className="text-[10px] text-gray-400 mb-1">Usa formato: #CATEGORIA:keyword. Categorie: SEO|GEO|LONGTAIL|BRANDED</p>
          <textarea value={brand?.parole_da_usare || ''} onChange={e => update('parole_da_usare', e.target.value)} placeholder="#SEO:eleganza, #GEO:stile italiano, #LONGTAIL:abiti eleganti donna, #BRANDED:silkincom" className="input mt-1 h-20 resize-none font-mono text-xs" />
        </div>

        {/* Parole da evitare */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-1">
            <label className="label"><AlertTriangle className="w-3.5 h-3.5 text-red-500 inline mr-1" /> Parole da evitare (SEO + GEO)</label>
            <button type="button" onClick={() => generateField('keywords')} disabled={genKeywords} className="text-[10px] px-2 py-1 bg-red-100 text-red-700 rounded-full hover:bg-red-200 flex items-center gap-1">
              {genKeywords ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              {genKeywords ? 'Genero...' : 'AI genera'}
            </button>
          </div>
          <p className="text-[10px] text-gray-400 mb-1">Usa formato: #EVITA:motivo:parola. Motivi: FUORI_TARGET|BASSO_QUALITÀ|COMPETITORE</p>
          <textarea value={brand?.parole_da_evitare || ''} onChange={e => update('parole_da_evitare', e.target.value)} placeholder="#EVITA:FUORI_TARGET:economico, #EVITA:BASSO_QUALITÀ:fast fashion, #EVITA:COMPETITORE:zara" className="input mt-1 h-20 resize-none font-mono text-xs" />
        </div>

        {/* Emoji policy */}
        <div className="card p-4">
          <label className="label"><Sparkles className="w-3.5 h-3.5 text-gray-400 inline mr-1" /> Emoji Policy</label>
          <select value={EMOJI_OPTIONS.find(e => brand?.emoji_policy?.includes(e.value) || (e.emoji && brand?.emoji_policy?.includes(e.emoji)))?.value || ''} onChange={e => handleEmoji(e.target.value)} className="input mt-1">
            {EMOJI_OPTIONS.map(e => <option key={e.value} value={e.value}>{e.label || e.value}</option>)}
          </select>
          <input value={(EMOJI_OPTIONS.find(e => e.value === 'custom')?.value === (EMOJI_OPTIONS.find(e => brand?.emoji_policy?.includes(e.value))?.value || '') ? brand?.emoji_policy || '' : '') || ''} onChange={e => update('emoji_policy', e.target.value)} placeholder="Oppure personalizza..." className="input mt-1 text-xs" />
        </div>

        {/* Hashtag */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-1">
            <label className="label"><Hash className="w-3.5 h-3.5 text-gray-400 inline mr-1" /> Hashtag strategici</label>
            <button type="button" onClick={() => generateField('hashtags')} disabled={genHashtags} className="text-[10px] px-2 py-1 bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200 flex items-center gap-1">
              {genHashtags ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              {genHashtags ? 'Genero...' : 'AI genera hashtag'}
            </button>
          </div>
          <p className="text-[10px] text-gray-400 mb-1">Formato: #CATEGORIA:tag. Categorie: BRANDED|SETTORE|NICCHIA|TREND</p>
          <textarea value={brand?.hashtag_base || ''} onChange={e => update('hashtag_base', e.target.value)} placeholder="#BRANDED:silkincom, #SETTORE:fashion, #NICCHIA:outfitprimavera, #TREND:spring2026" className="input mt-1 h-16 resize-none font-mono text-xs" />
        </div>

        {/* CTA */}
        <div className="card p-4">
          <label className="label"><MousePointerClick className="w-3.5 h-3.5 text-gray-400 inline mr-1" /> CTA Default</label>
          <input value={brand?.cta_base || ''} onChange={e => update('cta_base', e.target.value)} placeholder="Es: Scopri la collezione" className="input mt-1" />
        </div>

        {/* Compliance section */}
        <div className="card p-4 border-t-4 border-amber-400">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-gray-900 text-sm">Compliance & Note Legali</h3>
            <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">GDPR · Privacy · Cookie</span>
          </div>
          <div className="space-y-3">
            <div>
              <label className="label text-xs">⚠️ Disclaimer / Limitazione responsabilità</label>
              <input value={brand?.disclaimer_text || ''} onChange={e => update('disclaimer_text', e.target.value)} placeholder="Es: Le immagini sono a scopo illustrativo..." className="input text-xs" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="label text-xs">🔐 GDPR / Trattamento dati</label>
                <textarea value={brand?.gdpr_note || ''} onChange={e => update('gdpr_note', e.target.value)} placeholder="Reg. UE 2016/679 - Informativa..." className="input text-xs h-16 resize-none" />
              </div>
              <div>
                <label className="label text-xs">📋 Privacy Policy (sintesi)</label>
                <textarea value={brand?.privacy_note || ''} onChange={e => update('privacy_note', e.target.value)} placeholder="URL o testo sintetico privacy..." className="input text-xs h-16 resize-none" />
              </div>
            </div>
            <div>
              <label className="label text-xs">🍪 Cookie Policy</label>
              <input value={brand?.cookie_policy || ''} onChange={e => update('cookie_policy', e.target.value)} placeholder="Es: Questo sito utilizza cookie tecnici e di profilazione..." className="input text-xs" />
            </div>
            <div>
              <label className="label text-xs">📄 Altre note legali</label>
              <textarea value={brand?.note_legali || ''} onChange={e => update('note_legali', e.target.value)} placeholder="Diritto di recesso, condizioni di vendita, ecc..." className="input text-xs h-16 resize-none" />
            </div>
          </div>
        </div>

        {msg && <div className={`p-3 rounded-lg text-sm ${msg.type === 'ok' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{msg.text}</div>}

        <div className="flex items-center gap-3">
          <button onClick={handleSave} disabled={saving} className="btn-primary px-8 py-3">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Salvando...' : 'Salva profilo brand'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ComplianceDocs({ result }: { result: Record<string, unknown> }) {
  const fields = [
    { key: 'cookie_policy', emoji: '\u{1F36A}', label: 'Cookie Policy' },
    { key: 'gdpr_informativa', emoji: '\u{1F510}', label: 'GDPR / Trattamento Dati' },
    { key: 'privacy_policy', emoji: '\u{1F4CB}', label: 'Privacy Policy' },
    { key: 'disclaimer', emoji: '\u26A0\uFE0F', label: 'Disclaimer' },
    { key: 'condizioni_vendita', emoji: '\u{1F4C4}', label: 'Condizioni di Vendita' },
  ]
  const normative = Array.isArray(result.normative_riferimento) ? result.normative_riferimento as string[] : []
  const note = typeof result.note === 'string' ? result.note : null
  return (
    <div className="space-y-2 max-h-96 overflow-y-auto bg-white rounded-lg border border-amber-200 p-3 text-xs">
      {fields.map(({ key, emoji, label }) => {
        const val = typeof result[key] === 'string' ? (result[key] as string).slice(0, 1500) : null
        if (!val) return null
        return (
          <details key={key} className="group">
            <summary className="cursor-pointer font-semibold text-amber-800 py-1 hover:text-amber-900">{emoji} {label}</summary>
            <p className="text-gray-600 mt-1 whitespace-pre-wrap pl-2">{val}</p>
          </details>
        )
      })}
      {normative.length > 0 && <div className="pt-1"><p className="text-[10px] text-gray-400">Normative: {normative.join(', ')}</p></div>}
      {note && <p className="text-[10px] text-amber-600 italic pt-1">{note}</p>}
    </div>
  )
}
