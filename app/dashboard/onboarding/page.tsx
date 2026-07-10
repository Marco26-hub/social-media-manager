'use client'
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  UserPlus, Globe, Sparkles, Package, CheckCircle, ArrowRight, ArrowLeft,
  Loader2, Camera, Search, Target, MessageCircle
} from 'lucide-react'
import { isDemo } from '@/lib/demo'
import { useGeneration } from '@/components/GenerationProvider'
import { readApiError } from '@/lib/ai-client'

const STEP_LABELS = ['Cliente', 'Brand', 'Prodotti', 'Contenuti', 'Fine']

type BrandProfile = {
  settore: string; tono_voce: string; target: string; promessa_brand: string
  colori_brand: string; parole_da_usare: string; parole_da_evitare: string
  emoji_policy: string; hashtag_base: string; cta_base: string
}

type ProductInput = { nome: string; categoria: string; prezzo: string }

export default function OnboardingPage() {
  const router = useRouter()
  const demo = isDemo()
  const gen = useGeneration()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  // Step 1
  const [nomeCliente, setNomeCliente] = useState('')
  const [urlSito, setUrlSito] = useState('')
  const [emailCliente, setEmailCliente] = useState('')
  const [clienteId, setClienteId] = useState('')

  // Step 2
  const [brandProfile, setBrandProfile] = useState<BrandProfile | null>(null)
  const [brandEdited, setBrandEdited] = useState<BrandProfile | null>(null)

  // Step 3
  const [prodotti, setProdotti] = useState<ProductInput[]>([{ nome: '', categoria: '', prezzo: '' }])

  // Step 4
  const [canaliScelti, setCanaliScelti] = useState<string[]>(['instagram'])
  const [formatoScelto, setFormatoScelto] = useState('post')
  const [contenutiGenerati, setContenutiGenerati] = useState(0)

  function updateProdotto(i: number, f: Partial<ProductInput>) {
    setProdotti(prev => prev.map((p, j) => j === i ? { ...p, ...f } : p))
  }
  function addProdotto() { setProdotti(prev => [...prev, { nome: '', categoria: '', prezzo: '' }]) }
  function removeProdotto(i: number) { setProdotti(prev => prev.filter((_, j) => j !== i)) }

  // Step 1 → Create client
  async function creaCliente() {
    if (!nomeCliente.trim()) return
    setLoading(true)
    setErrore(null)
    if (demo) {
      await new Promise(r => setTimeout(r, 600))
      setClienteId('demo-onboard')
    } else {
      try {
        const res = await fetch('/api/data/clienti', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nome: nomeCliente, email: emailCliente || null, settore: null }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok || !data.id) {
          // NIENTE fallback muto: senza cliente_id i passi successivi (brand/prodotti/
          // contenuti) salvano su un workspace inesistente. L'utente deve vedere l'errore.
          setErrore(`Creazione cliente fallita: ${data.error || res.status}. Riprova prima di continuare.`)
          setLoading(false)
          return
        }
        setClienteId(data.id)
        document.cookie = `active_cliente_id=${data.id};path=/`
      } catch (e) {
        setErrore(`Creazione cliente fallita (rete): ${(e as Error).message}. Riprova prima di continuare.`)
        setLoading(false)
        return
      }
    }
    setLoading(false)
    setStep(2)
  }

  // Step 2 → Brand AI Discovery
  async function scopriBrand() {
    if (!urlSito.trim() && !demo) return
    setLoading(true)
    setErrore(null)

    const result = await gen.run<BrandProfile>({
      key: 'onboarding-brand-discovery',
      label: `Brand Discovery · ${urlSito || 'demo'}`,
      url: '/api/generate/brand-discovery',
      body: { url: urlSito, cliente_id: clienteId, model: 'meta-llama/llama-3.3-70b-instruct:free' },
      estMs: 25000,
    })

    if (result.ok && result.data?.settore) {
      setBrandProfile(result.data)
      setBrandEdited(null)
    } else {
      // NIENTE fallback muto: se la discovery fallisce (sito illeggibile, profilo
      // fantasma, AI down) l'utente DEVE saperlo, altrimenti prosegue senza brand.
      setErrore(result.error || 'Brand discovery non riuscita: controlla l\'URL del sito oppure inserisci i dati del brand manualmente.')
    }
    setLoading(false)
  }

  // Step 2 → Save brand to DB
  async function salvaBrand() {
    const bp = brandEdited || brandProfile
    if (!bp) return
    setLoading(true)
    setErrore(null)
    if (!demo) {
      try {
        const res = await fetch('/api/data/brand', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cliente_id: clienteId, ...bp }),
        })
        if (!res.ok) {
          // Brand non salvato: l'utente lo sa, può riprovare o proseguire consapevole.
          const data = await res.json().catch(() => ({}))
          setErrore(`Salvataggio brand fallito: ${data.error || res.status}. Puoi riprovare o proseguire.`)
        }
      } catch (e) {
        setErrore(`Salvataggio brand fallito (rete): ${(e as Error).message}. Puoi riprovare o proseguire.`)
      }
    }
    setLoading(false)
    setStep(3)
  }

  // Step 3 → Save products
  async function salvaProdotti() {
    const validi = prodotti.filter(p => p.nome.trim())
    if (validi.length === 0) { setStep(4); return }
    setLoading(true)
    setErrore(null)
    if (!demo) {
      const falliti: string[] = []
      for (const p of validi) {
        try {
          const res = await fetch('/api/data/prodotti', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome_prodotto: p.nome, categoria: p.categoria || null, prezzo: p.prezzo || null }),
          })
          if (!res.ok) falliti.push(p.nome)
        } catch {
          falliti.push(p.nome)
        }
      }
      if (falliti.length) {
        setErrore(`Salvataggio prodotti fallito per: ${falliti.join(', ')}. Puoi riprovare o proseguire.`)
      }
    }
    setLoading(false)
    setStep(4)
  }

  // Step 4 → Generate first content
  async function generaContenuti() {
    setLoading(true)
    setErrore(null)
    let count = 0
    const falliti: string[] = []
    for (const canale of canaliScelti) {
      for (let i = 0; i < 2; i++) {
        try {
          const body = {
            cliente_id: clienteId,
            canale,
            formato: canale === 'tiktok' ? 'video' : canale === 'pinterest' ? 'pin' : formatoScelto,
            tema: prodotti[0]?.nome || 'collezione',
            nome_prodotto: prodotti[0]?.nome || 'prodotto',
          }
          if (demo) {
            await new Promise(r => setTimeout(r, 300))
            count++
          } else {
            const res = await fetch('/api/generate/content', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            })
            if (res.ok) count++
            else falliti.push(`${canale}: ${await readApiError(res, `HTTP ${res.status}`)}`)
          }
        } catch (e) {
          // Niente più catch silenzioso: registra il fallimento di rete.
          falliti.push(`${canale}: ${(e as Error).message || 'errore di rete'}`)
        }
      }
    }
    setContenutiGenerati(count)
    setLoading(false)

    // Zero contenuti generati: NON avanzare fingendo successo (prima lo step 5
    // mostrava "0 contenuti generati" come se fosse andato tutto bene). Mostra
    // l'errore e resta sullo step 4 per riprovare / cambiare modello AI.
    if (count === 0) {
      setErrore(
        falliti.length
          ? `Generazione contenuti non riuscita. ${falliti.slice(0, 3).join(' · ')}${falliti.length > 3 ? ` (+${falliti.length - 3} altri)` : ''}. Riprova o cambia modello AI.`
          : 'Nessun contenuto generato. Riprova o cambia modello AI.',
      )
      return
    }
    // Successo parziale: avanza ma segnala i fallimenti (niente silenzio).
    if (falliti.length) {
      setErrore(`Generati ${count} contenuti; alcuni non riusciti: ${falliti.slice(0, 3).join(' · ')}${falliti.length > 3 ? ` (+${falliti.length - 3} altri)` : ''}.`)
    }
    setStep(5)
  }

  // Steps UI helpers
  function StepDot({ n, label }: { n: number; label: string }) {
    const done = step > n
    const active = step === n
    return (
      <div className={`flex items-center gap-2 ${active ? 'text-brand-600' : done ? 'text-green-600' : 'text-gray-400'}`}>
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
          done ? 'bg-green-500 border-green-500 text-white' :
          active ? 'bg-brand-600 border-brand-600 text-white' :
          'bg-white border-gray-300 text-gray-400'
        }`}>
          {done ? <CheckCircle className="w-3.5 h-3.5" /> : n}
        </div>
        <span className="text-xs font-medium hidden sm:inline">{label}</span>
      </div>
    )
  }

  const CANALI = [
    { key: 'instagram', emoji: '📸', label: 'IG' },
    { key: 'facebook', emoji: '🔵', label: 'FB' },
    { key: 'tiktok', emoji: '🎵', label: 'TT' },
    { key: 'pinterest', emoji: '📌', label: 'PIN' },
    { key: 'linkedin', emoji: '💼', label: 'IN' },
    { key: 'threads', emoji: '🧵', label: 'TH' },
    { key: 'x', emoji: '✖️', label: 'X' },
  ]

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-6">Onboarding Nuovo Cliente</h1>

      {/* Stepper */}
      <div className="flex items-center justify-between mb-8">
        {STEP_LABELS.map((l, i) => (
          <div key={l} className="flex items-center gap-1.5">
            <StepDot n={i + 1} label={l} />
            {i < STEP_LABELS.length - 1 && <div className={`w-6 md:w-12 h-0.5 ${step > i + 1 ? 'bg-green-400' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      {/* Errore surfaced (no fallback silenzioso) */}
      {errore && (
        <div className="mb-6 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-2">
          <span className="text-red-500 mt-0.5">⚠</span>
          <span>{errore}</span>
          <button onClick={() => setErrore(null)} className="ml-auto text-red-400 hover:text-red-600" aria-label="Chiudi">✕</button>
        </div>
      )}

      {/* Step 1: Cliente */}
      {step === 1 && (
        <div className="card p-6 space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-brand-100 rounded-lg"><UserPlus className="w-5 h-5 text-brand-600" /></div>
            <div><h2 className="font-bold text-gray-900">Nuovo Cliente</h2><p className="text-xs text-gray-500">Inserisci i dati base del cliente</p></div>
          </div>
          <div>
            <label className="label mb-1">Nome cliente *</label>
            <input value={nomeCliente} onChange={e => setNomeCliente(e.target.value)} className="input" placeholder="es. Atelier Milano" />
          </div>
          <div>
            <label className="label mb-1">Sito web</label>
            <input value={urlSito} onChange={e => setUrlSito(e.target.value)} className="input" placeholder="https://www.ateliermilano.it" />
          </div>
          <div>
            <label className="label mb-1">Email cliente</label>
            <input value={emailCliente} onChange={e => setEmailCliente(e.target.value)} className="input" type="email" placeholder="info@ateliermilano.it" />
          </div>
          <button onClick={creaCliente} disabled={loading || !nomeCliente.trim()} className="btn-primary w-full justify-center">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            {loading ? 'Creazione...' : 'Crea cliente e continua'}
          </button>
        </div>
      )}

      {/* Step 2: Brand Discovery */}
      {step === 2 && (
        <div className="card p-6 space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-brand-100 rounded-lg"><Globe className="w-5 h-5 text-brand-600" /></div>
            <div><h2 className="font-bold text-gray-900">Brand Discovery AI</h2><p className="text-xs text-gray-500">Analisi automatica del sito web</p></div>
          </div>

          {!brandProfile ? (
            <>
              <div className="flex gap-2">
                <input value={urlSito} onChange={e => setUrlSito(e.target.value)} className="input flex-1" placeholder="https://..." />
                <button onClick={scopriBrand} disabled={loading || !urlSito.trim()} className="btn-primary px-4">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  {loading ? '' : 'Analizza'}
                </button>
              </div>
              {demo && <p className="text-xs text-gray-400">Demo: l&apos;analisi è precompilata</p>}
            </>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { k:'settore', l:'Settore', i:Globe, v:(brandEdited||brandProfile)?.settore },
                  { k:'tono_voce', l:'Tono', i:MessageCircle, v:(brandEdited||brandProfile)?.tono_voce },
                  { k:'target', l:'Target', i:Target, v:(brandEdited||brandProfile)?.target },
                  { k:'promessa_brand', l:'Promessa', i:Sparkles, v:(brandEdited||brandProfile)?.promessa_brand },
                ].map(({ k, l, i: I, v }) => (
                  <div key={k}>
                    <label className="label flex items-center gap-1.5 mb-1"><I className="w-3 h-3" /> {l}</label>
                    <input
                      value={v || ''}
                      onChange={e => {
                        const bp = brandEdited || { ...brandProfile! }
                        setBrandEdited({ ...bp, [k]: e.target.value })
                      }}
                      className="input text-sm"
                    />
                  </div>
                ))}
              </div>
              {['colori_brand','parole_da_usare','parole_da_evitare','hashtag_base','cta_base'].map(k => (
                <div key={k}>
                  <label className="label mb-1">{k.replace(/_/g, ' ')}</label>
                  <input
                    value={(brandEdited||brandProfile)?.[k as keyof BrandProfile] || ''}
                    onChange={e => {
                      const bp = brandEdited || { ...brandProfile! }
                      setBrandEdited({ ...bp, [k]: e.target.value })
                    }}
                    className="input text-sm"
                  />
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button onClick={() => { setBrandProfile(null); setBrandEdited(null) }} className="btn-secondary flex-1 justify-center">
                  <ArrowLeft className="w-4 h-4" /> Rianalizza
                </button>
                <button onClick={salvaBrand} disabled={loading} className="btn-primary flex-1 justify-center">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Salva brand
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Prodotti */}
      {step === 3 && (
        <div className="card p-6 space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-brand-100 rounded-lg"><Package className="w-5 h-5 text-brand-600" /></div>
            <div><h2 className="font-bold text-gray-900">Prodotti</h2><p className="text-xs text-gray-500">Aggiungi i primi prodotti del catalogo</p></div>
          </div>

          {prodotti.map((p, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-end border-b border-gray-100 pb-3">
              <div className="col-span-5">
                <label className="label">Nome *</label>
                <input value={p.nome} onChange={e => updateProdotto(i, { nome: e.target.value })} className="input text-sm" placeholder="es. Blazer Lino" />
              </div>
              <div className="col-span-3">
                <label className="label">Categoria</label>
                <input value={p.categoria} onChange={e => updateProdotto(i, { categoria: e.target.value })} className="input text-sm" placeholder="es. Giacche" />
              </div>
              <div className="col-span-2">
                <label className="label">€</label>
                <input value={p.prezzo} onChange={e => updateProdotto(i, { prezzo: e.target.value })} className="input text-sm" type="number" placeholder="89" />
              </div>
              <div className="col-span-2 flex justify-end">
                {prodotti.length > 1 && (
                  <button onClick={() => removeProdotto(i)} className="text-red-400 hover:text-red-600 text-xs py-1.5">✕</button>
                )}
              </div>
            </div>
          ))}
          <div className="flex gap-3">
            <button onClick={addProdotto} className="btn-secondary text-xs">+ Aggiungi prodotto</button>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setStep(2)} className="btn-secondary flex-1 justify-center">
              <ArrowLeft className="w-4 h-4" /> Indietro
            </button>
            <button onClick={salvaProdotti} disabled={loading} className="btn-primary flex-1 justify-center">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              Continua
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Contenuti */}
      {step === 4 && (
        <div className="card p-6 space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-brand-100 rounded-lg"><Camera className="w-5 h-5 text-brand-600" /></div>
            <div><h2 className="font-bold text-gray-900">Primi Contenuti</h2><p className="text-xs text-gray-500">Genera i primi post del calendario</p></div>
          </div>

          <div>
            <label className="label mb-2">Canali</label>
            <div className="flex flex-wrap gap-2">
              {CANALI.map(c => (
                <button
                  key={c.key}
                  onClick={() => setCanaliScelti(prev =>
                    prev.includes(c.key) ? prev.filter(x => x !== c.key) : [...prev, c.key]
                  )}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border-2 transition-colors ${
                    canaliScelti.includes(c.key)
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {c.emoji} {c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label mb-2">Formato principale</label>
            <div className="flex gap-2">
              {['post','carousel','reel','story'].map(f => (
                <button
                  key={f}
                  onClick={() => setFormatoScelto(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    formatoScelto === f
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-gray-200 bg-white text-gray-500'
                  }`}
                >{f}</button>
              ))}
            </div>
          </div>

          {prodotti.filter(p => p.nome.trim()).length > 0 && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
              📦 Primo prodotto: <strong>{prodotti.find(p => p.nome.trim())?.nome}</strong>
              {prodotti.filter(p => p.nome.trim()).length > 1 && ` + ${prodotti.filter(p => p.nome.trim()).length - 1} altri`}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={() => setStep(3)} className="btn-secondary flex-1 justify-center">
              <ArrowLeft className="w-4 h-4" /> Indietro
            </button>
            <button onClick={generaContenuti} disabled={loading || canaliScelti.length === 0} className="btn-primary flex-1 justify-center">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {loading ? 'Generando...' : 'Genera primi post'}
            </button>
          </div>
        </div>
      )}

      {/* Step 5: Fine */}
      {step === 5 && (
        <div className="card p-6 space-y-5 text-center">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Onboarding completato!</h2>
            <p className="text-sm text-gray-500 mt-1">
              Cliente <strong>{nomeCliente}</strong> pronto. {contenutiGenerati} contenuti generati nel calendario.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-left">
            {[
              { l: 'Profilo Brand', v: brandProfile?.tono_voce || '—' },
              { l: 'Settore', v: brandProfile?.settore || '—' },
              { l: 'Prodotti', v: `${prodotti.filter(p => p.nome.trim()).length} caricati` },
              { l: 'Canali', v: canaliScelti.join(', ') },
            ].map(({ l, v }) => (
              <div key={l} className="bg-gray-50 rounded-lg p-3">
                <p className="text-[10px] text-gray-400 uppercase">{l}</p>
                <p className="text-sm font-medium text-gray-800">{v}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => router.push('/dashboard/clienti')} className="btn-secondary flex-1 justify-center py-2.5">
              Gestisci clienti
            </button>
            <button onClick={() => router.push('/dashboard/calendario')} className="btn-primary flex-1 justify-center py-2.5">
              Vai al calendario
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
