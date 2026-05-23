'use client'
import { useState } from 'react'
import {
  Sparkles, Loader2, Check, X, Layers, Film, Clock,
  Square, Video, Pin, FileText, Calendar, CalendarRange,
  BarChart3, Search, Edit3, ChevronDown
} from 'lucide-react'

type Status = 'idle' | 'loading' | 'success' | 'error'

type Gen = {
  id: string
  titolo: string
  desc: string
  icon: React.ElementType
  workflow: string
  payload?: Record<string, string>
}

type Section = {
  key: string
  name: string
  icon: string
  color: string
  generators: Gen[]
}

const SECTIONS: Section[] = [
  {
    key: 'plan', name: 'Pianificazione & Audit', icon: '🎯', color: 'bg-violet-600',
    generators: [
      { id: 'PLAN-W',  titolo: 'Piano settimanale',  desc: '7-10 contenuti distribuiti',         icon: Calendar,      workflow: 'SOCIAL_A' },
      { id: 'PLAN-M',  titolo: 'Piano mensile',      desc: '25-35 contenuti sui 30 giorni',      icon: CalendarRange, workflow: 'SOCIAL_K' },
      { id: 'IDEA',    titolo: 'Contenuto da idea',  desc: 'Trasforma IDEA in post pronti',      icon: Edit3,         workflow: 'SOCIAL_B' },
      { id: 'REPORT',  titolo: 'Report settimanale', desc: 'Analytics + suggerimenti',           icon: BarChart3,     workflow: 'SOCIAL_F' },
      { id: 'AUDIT',   titolo: 'SEO/GEO Audit',      desc: 'Score + miglioramenti prioritari',   icon: Search,        workflow: 'SOCIAL_L' },
    ],
  },
  {
    key: 'instagram', name: 'Instagram', icon: '📸', color: 'bg-gradient-to-br from-pink-500 to-purple-600',
    generators: [
      { id: 'IG-POST', titolo: 'Post',         desc: 'Foto singola 1:1',              icon: Square, workflow: 'SOCIAL_B', payload: { canale: 'instagram', formato: 'post' } },
      { id: 'IG-CAR',  titolo: 'Carosello',    desc: '5-7 slide con hook + CTA',      icon: Layers, workflow: 'SOCIAL_D', payload: { canale: 'instagram', formato: 'carousel' } },
      { id: 'IG-REEL', titolo: 'Reel',         desc: 'Video 9:16 15-30s',             icon: Film,   workflow: 'SOCIAL_E', payload: { canale: 'instagram', formato: 'reel' } },
      { id: 'IG-STORY',titolo: 'Story',        desc: 'Story 24h con sticker',         icon: Clock,  workflow: 'SOCIAL_B', payload: { canale: 'instagram', formato: 'story' } },
    ],
  },
  {
    key: 'facebook', name: 'Facebook', icon: '🔵', color: 'bg-gradient-to-br from-blue-500 to-blue-700',
    generators: [
      { id: 'FB-POST', titolo: 'Post',         desc: 'Pagina business landscape',     icon: Square, workflow: 'SOCIAL_B', payload: { canale: 'facebook', formato: 'post' } },
      { id: 'FB-CAR',  titolo: 'Carosello',    desc: 'Album multi-immagine',          icon: Layers, workflow: 'SOCIAL_D', payload: { canale: 'facebook', formato: 'carousel' } },
      { id: 'FB-VID',  titolo: 'Video',        desc: 'Native landscape 16:9',         icon: Video,  workflow: 'SOCIAL_E', payload: { canale: 'facebook', formato: 'video' } },
      { id: 'FB-REEL', titolo: 'Reel',         desc: 'Reel 9:16 cross-post',          icon: Film,   workflow: 'SOCIAL_E', payload: { canale: 'facebook', formato: 'reel' } },
    ],
  },
  {
    key: 'tiktok', name: 'TikTok', icon: '🎵', color: 'bg-gradient-to-br from-gray-800 to-black',
    generators: [
      { id: 'TT-VID',  titolo: 'Video',        desc: '9:16 trending + hashtag',       icon: Video,  workflow: 'SOCIAL_E', payload: { canale: 'tiktok', formato: 'video' } },
      { id: 'TT-REEL', titolo: 'Reel',         desc: 'Script 15-30s hook forte',      icon: Film,   workflow: 'SOCIAL_E', payload: { canale: 'tiktok', formato: 'reel' } },
    ],
  },
  {
    key: 'pinterest', name: 'Pinterest', icon: '📌', color: 'bg-gradient-to-br from-red-500 to-red-700',
    generators: [
      { id: 'PIN-PIN', titolo: 'Pin',          desc: 'Verticale 2:3 + link prodotto', icon: Pin,    workflow: 'SOCIAL_B', payload: { canale: 'pinterest', formato: 'pin' } },
    ],
  },
  {
    key: 'linkedin', name: 'LinkedIn', icon: '💼', color: 'bg-gradient-to-br from-blue-700 to-blue-900',
    generators: [
      { id: 'LI-POST', titolo: 'Post',          desc: 'B2B con hook + insight',       icon: Square,   workflow: 'SOCIAL_B', payload: { canale: 'linkedin', formato: 'post' } },
      { id: 'LI-ART',  titolo: 'Articolo',      desc: 'Thought leadership lungo',     icon: FileText, workflow: 'SOCIAL_G', payload: { canale: 'linkedin', formato: 'articolo' } },
    ],
  },
  {
    key: 'youtube', name: 'YouTube Shorts', icon: '▶️', color: 'bg-gradient-to-br from-red-600 to-red-800',
    generators: [
      { id: 'YT-SHORT',titolo: 'Short',         desc: 'Video corto 9:16 + tag SEO',   icon: Film,   workflow: 'SOCIAL_E', payload: { canale: 'youtube_shorts', formato: 'short' } },
    ],
  },
  {
    key: 'blog', name: 'Blog SEO+GEO', icon: '✍️', color: 'bg-gradient-to-br from-amber-500 to-orange-600',
    generators: [
      { id: 'BLOG-ART',titolo: 'Articolo blog', desc: '800-1200 parole + FAQ schema', icon: FileText, workflow: 'SOCIAL_G', payload: { canale: 'blog', formato: 'articolo' } },
    ],
  },
]

const isDemo = () => !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')

export default function GeneratorCards() {
  const [states, setStates] = useState<Record<string, Status>>({})
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ plan: true, instagram: true })

  async function trigger(g: Gen) {
    setStates(s => ({ ...s, [g.id]: 'loading' }))
    if (isDemo()) {
      await new Promise(r => setTimeout(r, 1000))
      setStates(s => ({ ...s, [g.id]: 'success' }))
      setTimeout(() => setStates(s => ({ ...s, [g.id]: 'idle' })), 2500)
      return
    }
    try {
      const base = process.env.NEXT_PUBLIC_N8N_WEBHOOK_BASE
      if (!base) throw new Error('webhook non config')
      const res = await fetch(`${base}/${g.workflow.toLowerCase()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(g.payload ?? {}),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setStates(s => ({ ...s, [g.id]: 'success' }))
    } catch {
      setStates(s => ({ ...s, [g.id]: 'error' }))
    }
    setTimeout(() => setStates(s => ({ ...s, [g.id]: 'idle' })), 3000)
  }

  return (
    <div className="space-y-3">
      {SECTIONS.map(section => {
        const isOpen = openSections[section.key] ?? false
        return (
          <div key={section.key} className="card overflow-hidden">
            {/* Header section — cliccabile per espandere */}
            <button
              onClick={() => setOpenSections(s => ({ ...s, [section.key]: !isOpen }))}
              className="w-full px-4 md:px-5 py-3.5 flex items-center gap-3 hover:bg-gray-50 transition-colors"
            >
              <div className={`w-9 h-9 rounded-xl ${section.color} flex items-center justify-center text-lg flex-shrink-0 shadow-sm`}>
                {section.icon}
              </div>
              <div className="flex-1 text-left min-w-0">
                <h3 className="font-semibold text-gray-900 text-sm md:text-base">{section.name}</h3>
                <p className="text-xs text-gray-400">{section.generators.length} {section.generators.length === 1 ? 'formato' : 'formati'} disponibili</p>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Generatori */}
            {isOpen && (
              <div className="border-t border-gray-50 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-px bg-gray-100">
                {section.generators.map(g => {
                  const Icon = g.icon
                  const st = states[g.id] ?? 'idle'
                  return (
                    <div key={g.id} className="bg-white p-4 hover:bg-gray-50 transition-colors flex flex-col">
                      <div className="flex items-start gap-2 mb-2">
                        <Icon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-gray-900 leading-tight">{g.titolo}</p>
                          <p className="text-[10px] text-gray-400 font-mono mt-0.5">{g.workflow}</p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mb-3 leading-snug flex-1">{g.desc}</p>
                      <button
                        onClick={() => trigger(g)}
                        disabled={st === 'loading'}
                        className={`text-xs font-semibold px-3 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                          st === 'success' ? 'bg-green-100 text-green-700' :
                          st === 'error'   ? 'bg-red-100 text-red-700' :
                                             'bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-60'
                        }`}
                      >
                        {st === 'loading' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        {st === 'success' && <Check className="w-3.5 h-3.5" />}
                        {st === 'error'   && <X className="w-3.5 h-3.5" />}
                        {st === 'idle'    && <Sparkles className="w-3.5 h-3.5" />}
                        {st === 'loading' ? 'Generando' :
                         st === 'success' ? 'Generato' :
                         st === 'error'   ? 'Errore' : 'Genera'}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
