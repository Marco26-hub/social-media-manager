'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import StatusBadge from '@/components/StatusBadge'
import type { Contenuto, Status } from '@/lib/types'
import { CheckCircle, XCircle, RefreshCw, Eye, ChevronDown, Filter } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { demoContenuti } from '@/lib/demo-data'
import PostPreview from '@/components/PostPreview'

const isDemo = () => !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')

const CANALI = ['tutti','instagram','facebook','tiktok','pinterest','youtube_shorts']
const STATI: Status[] = ['DA_APPROVARE','BOZZA','IDEA','APPROVATO','IN_PUBBLICAZIONE','PUBBLICATO','ERRORE','ERRORE_MANUALE']
const CANALE_ICON: Record<string, string> = {
  instagram: '📸', facebook: '🔵', tiktok: '🎵', pinterest: '📌', youtube_shorts: '▶️'
}

export default function CalendarioPage() {
  return (
    <Suspense fallback={<div className="p-8"><RefreshCw className="w-6 h-6 text-gray-400 animate-spin" /></div>}>
      <CalendarioInner />
    </Suspense>
  )
}

function CalendarioInner() {
  const searchParams = useSearchParams()
  const [contenuti, setContenuti]   = useState<Contenuto[]>([])
  const [loading, setLoading]       = useState(true)
  const [selected, setSelected]     = useState<Contenuto | null>(null)
  const [filterStatus, setFilter]   = useState<string>(searchParams.get('filter') ?? 'DA_APPROVARE')
  const [filterCanale, setCanale]   = useState('tutti')
  const [saving, setSaving]         = useState<string | null>(null)
  const [demoData, setDemoData]     = useState<Contenuto[]>(demoContenuti)
  const supabase = createClient()
  const demo = isDemo()

  const fetchData = useCallback(async () => {
    setLoading(true)
    if (demo) {
      let filtered = demoData
      if (filterStatus !== 'tutti') filtered = filtered.filter(c => c.status === filterStatus)
      if (filterCanale !== 'tutti') filtered = filtered.filter(c => c.canale === filterCanale)
      setContenuti(filtered)
      setLoading(false)
      return
    }
    let q = supabase.from('calendario').select('*').order('data_pubblicazione', { ascending: true })
    if (filterStatus !== 'tutti') q = q.eq('status', filterStatus)
    if (filterCanale !== 'tutti') q = q.eq('canale', filterCanale)
    const { data } = await q
    setContenuti(data ?? [])
    setLoading(false)
  }, [filterStatus, filterCanale, supabase, demo, demoData])

  useEffect(() => { fetchData() }, [fetchData])

  // Realtime — skip in demo
  useEffect(() => {
    if (demo) return
    const channel = supabase.channel('calendario-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calendario' }, fetchData)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchData, supabase, demo])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cal = () => supabase.from('calendario') as any

  async function approva(c: Contenuto, user: string = 'admin') {
    setSaving(c.id)
    if (demo) {
      setDemoData(prev => prev.map(x => x.id === c.id ? {
        ...x, status: 'APPROVATO' as Status,
        checked_copy: 'SI', checked_media: 'SI', checked_link: 'SI',
        approvato_da: user, data_approvazione: new Date().toISOString(),
      } : x))
    } else {
      await cal().update({
        status: 'APPROVATO',
        checked_copy: 'SI', checked_media: 'SI', checked_link: 'SI',
        approvato_da: user,
        data_approvazione: new Date().toISOString(),
      }).eq('id', c.id)
    }
    setSelected(null)
    setSaving(null)
  }

  async function rifiuta(c: Contenuto) {
    setSaving(c.id)
    if (demo) {
      setDemoData(prev => prev.map(x => x.id === c.id ? { ...x, status: 'BOZZA' as Status } : x))
    } else {
      await cal().update({ status: 'BOZZA' }).eq('id', c.id)
    }
    setSelected(null)
    setSaving(null)
  }

  async function resetErrore(c: Contenuto) {
    setSaving(c.id)
    if (demo) {
      setDemoData(prev => prev.map(x => x.id === c.id ? {
        ...x, status: 'APPROVATO' as Status, errore_tecnico: null, retry_count: 0, publish_lock_id: null,
      } : x))
    } else {
      await cal().update({
        status: 'APPROVATO',
        errore_tecnico: null,
        retry_count: 0,
        publish_lock_id: null,
      }).eq('id', c.id)
    }
    setSaving(null)
  }

  const mediaUrls = (c: Contenuto) =>
    [c.link_media_1,c.link_media_2,c.link_media_3].filter(Boolean) as string[]

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Calendario</h1>
          <p className="text-xs md:text-sm text-gray-500 mt-0.5">{contenuti.length} contenuti</p>
        </div>
        <button onClick={fetchData} className="btn-secondary py-1.5 px-3">
          <RefreshCw className="w-4 h-4" />
          <span className="hidden md:inline">Aggiorna</span>
        </button>
      </div>

      {/* Filtri */}
      <div className="flex flex-wrap gap-2 md:gap-3 mb-4 md:mb-6">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500">Status:</span>
        </div>
        {['tutti', ...STATI].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterStatus === s
                ? 'bg-brand-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {s === 'tutti' ? 'Tutti' : s.replace('_',' ')}
          </button>
        ))}
        <div className="relative">
          <select
            value={filterCanale}
            onChange={e => setCanale(e.target.value)}
            className="pl-3 pr-8 py-1.5 text-xs border border-gray-200 rounded-lg bg-white text-gray-600 appearance-none focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {CANALI.map(c => <option key={c} value={c}>{c === 'tutti' ? 'Tutti i canali' : c}</option>)}
          </select>
          <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
        </div>
      ) : contenuti.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <p className="text-lg">Nessun contenuto trovato</p>
          <p className="text-sm mt-1">Cambia i filtri o attendi il piano settimanale</p>
        </div>
      ) : (
        <div className="space-y-3">
          {contenuti.map(c => (
            <div key={c.id} className="card p-3 md:p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3 md:gap-4">
                {/* Media thumb */}
                <div className="w-16 h-16 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
                  {c.link_media_1 ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.link_media_1} alt="" className="w-full h-full object-cover"
                      onError={e => { (e.target as HTMLImageElement).style.display='none' }} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">
                      {CANALE_ICON[c.canale] ?? '📄'}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-mono text-xs text-gray-400">{c.id_contenuto}</span>
                    <StatusBadge status={c.status} />
                    <span className="text-xs text-gray-400">
                      {CANALE_ICON[c.canale]} {c.canale} · {c.formato}
                    </span>
                    <span className="text-xs text-gray-400 ml-auto">
                      {c.data_pubblicazione} {c.ora_pubblicazione?.slice(0,5)}
                    </span>
                  </div>
                  {c.hook && <p className="text-sm font-medium text-gray-800 mb-0.5 truncate">{c.hook}</p>}
                  {c.caption && <p className="text-sm text-gray-500 truncate">{c.caption}</p>}
                  {c.errore_tecnico && (
                    <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1 mt-1 truncate">
                      ⚠ {c.errore_tecnico}
                    </p>
                  )}
                </div>

                {/* Azioni */}
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-1.5 md:gap-2 flex-shrink-0">
                  <button onClick={() => setSelected(c)} className="btn-secondary py-1.5 px-2 md:px-3 justify-center">
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  {c.status === 'DA_APPROVARE' && (
                    <>
                      <button onClick={() => approva(c)} disabled={saving === c.id} className="btn-primary py-1.5 px-2 md:px-3 justify-center">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span className="hidden md:inline">{saving === c.id ? '...' : 'Approva'}</span>
                      </button>
                      <button onClick={() => rifiuta(c)} disabled={saving === c.id} className="btn-danger py-1.5 px-2 md:px-3 justify-center">
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                  {(c.status === 'ERRORE' || c.status === 'ERRORE_MANUALE') && (
                    <button onClick={() => resetErrore(c)} disabled={saving === c.id} className="btn-secondary py-1.5 px-2 md:px-3 justify-center">
                      <RefreshCw className={`w-3.5 h-3.5 ${saving === c.id ? 'animate-spin' : ''}`} />
                      <span className="hidden md:inline">Riprova</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal dettaglio */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b flex items-center justify-between">
              <div>
                <h2 className="font-bold text-gray-900">{selected.id_contenuto}</h2>
                <p className="text-sm text-gray-500">{selected.canale} · {selected.formato} · {selected.data_pubblicazione}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Anteprima visuale post */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 -mx-6 -mt-6 px-6 py-6 border-b">
                <p className="label mb-3">Anteprima {selected.canale}</p>
                <PostPreview c={selected} />
              </div>

              {/* Contenuto */}
              {selected.hook && (
                <div>
                  <p className="label">Hook</p>
                  <p className="text-sm text-gray-800 font-medium">{selected.hook}</p>
                </div>
              )}
              {selected.caption && (
                <div>
                  <p className="label">Caption</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{selected.caption}</p>
                </div>
              )}
              {selected.hashtag && (
                <div>
                  <p className="label">Hashtag</p>
                  <p className="text-sm text-brand-600">{selected.hashtag}</p>
                </div>
              )}
              {selected.cta && (
                <div>
                  <p className="label">CTA</p>
                  <p className="text-sm text-gray-700">{selected.cta}</p>
                </div>
              )}

              {/* Checklist */}
              <div>
                <p className="label">Checklist revisione</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { k: 'checked_copy',  l: 'Copy' },
                    { k: 'checked_media', l: 'Media' },
                    { k: 'checked_link',  l: 'Link' },
                    { k: 'checked_price', l: 'Prezzo' },
                  ].map(({ k, l }) => {
                    const val = selected[k as keyof Contenuto] as string
                    return (
                      <div key={k} className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${
                        val === 'SI' ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-500'
                      }`}>
                        {val === 'SI' ? '✓' : '○'} {l}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Errore */}
              {selected.errore_tecnico && (
                <div className="bg-red-50 rounded-lg p-3">
                  <p className="label text-red-600">Errore tecnico</p>
                  <p className="text-sm text-red-700">{selected.errore_tecnico}</p>
                </div>
              )}

              {/* Note */}
              {selected.note && (
                <div>
                  <p className="label">Note</p>
                  <p className="text-sm text-gray-600">{selected.note}</p>
                </div>
              )}
            </div>

            {/* Footer azioni */}
            {selected.status === 'DA_APPROVARE' && (
              <div className="p-6 border-t flex gap-3">
                <button onClick={() => approva(selected)} className="btn-primary flex-1 justify-center" disabled={saving === selected.id}>
                  <CheckCircle className="w-4 h-4" />
                  {saving === selected.id ? 'Salvando...' : 'Approva'}
                </button>
                <button onClick={() => rifiuta(selected)} className="btn-danger flex-1 justify-center" disabled={saving === selected.id}>
                  <XCircle className="w-4 h-4" />
                  Rimanda a bozza
                </button>
              </div>
            )}
            {(selected.status === 'ERRORE' || selected.status === 'ERRORE_MANUALE') && (
              <div className="p-6 border-t">
                <button onClick={() => resetErrore(selected)} className="btn-secondary w-full justify-center" disabled={saving === selected.id}>
                  <RefreshCw className="w-4 h-4" />
                  Reset e riprova pubblicazione
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
