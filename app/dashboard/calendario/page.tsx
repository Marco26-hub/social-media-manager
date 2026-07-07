'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback, Suspense } from 'react'
import StatusBadge from '@/components/StatusBadge'
import type { Contenuto, Status } from '@/lib/types'
import { CheckCircle, XCircle, RefreshCw, Eye, Info, ChevronDown, Filter, Sparkles, Share2, Download, Trash2, AlertTriangle, Wand2, Film, Camera, ImagePlus, Search } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { demoContenuti } from '@/lib/demo-data'
import PostPreview from '@/components/PostPreview'
import { readClienteId } from '@/lib/use-data'
import { readAISettings, readApiError } from '@/lib/ai-client'
import { useRuntimeDemo } from '@/lib/demo-client'

const CANALI = ['tutti','instagram','facebook','tiktok','pinterest','linkedin','threads','x','youtube_shorts','blog']
const FORMATI = ['tutti','post','carousel','reel','story','pin','short','video','articolo']
const CATEGORIE = [
  ['tutti', 'Tutte le categorie'],
  ['vendita', 'Vendita'],
  ['awareness', 'Awareness'],
  ['community', 'Community'],
  ['educazione', 'Educazione'],
  ['ispirazione', 'Ispirazione'],
  ['trending', 'Trending'],
  ['seo', 'SEO / Blog'],
]
const STATI: Status[] = ['DA_APPROVARE','BOZZA','IDEA','APPROVATO','IN_PUBBLICAZIONE','PUBBLICATO','ERRORE','ERRORE_MANUALE']
const CANALE_ICON: Record<string, string> = {
  instagram: '📸', facebook: '🔵', tiktok: '🎵', pinterest: '📌', linkedin: '💼', threads: '🧵', x: '✖️', youtube_shorts: '▶️', blog: '📝'
}

function asText(value: unknown) {
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  return ''
}

function hasText(value: unknown) {
  return asText(value).trim().length > 0
}

function formatDateLabel(date: string) {
  if (!date) return 'Data non impostata'
  const parsed = new Date(`${date}T12:00:00`)
  if (Number.isNaN(parsed.getTime())) return date
  return new Intl.DateTimeFormat('it-IT', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsed)
}

function formatTimeLabel(time?: string | null) {
  const value = (time || '').slice(0, 5)
  return value || 'orario non impostato'
}

function formatCategoryLabel(value?: string | null) {
  if (!value) return 'Senza categoria'
  return CATEGORIE.find(([id]) => id === value)?.[1] || value.replace(/_/g, ' ')
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
  const [filterFormato, setFormato] = useState('tutti')
  const [filterCategoria, setCategoria] = useState('tutti')
  const [searchText, setSearchText] = useState('')
  const [saving, setSaving]         = useState<string | null>(null)
  const [scoring, setScoring]       = useState<string | null>(null)
  const [scoreError, setScoreError] = useState<string | null>(null)
  const [scores, setScores]         = useState<Record<string, Record<string, unknown>>>({})
  const [sendingToken, setSendingToken] = useState<string | null>(null)
  const [approvalUrl, setApprovalUrl]   = useState<string | null>(null)
  const [demoData, setDemoData]     = useState<Contenuto[]>(demoContenuti)
  const [dragItem, setDragItem]     = useState<string | null>(null)
  const [dragOverDate, setDragOverDate] = useState<string | null>(null)
  const [backuping, setBackuping] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Contenuto | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [adminError, setAdminError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [visualState, setVisualState] = useState<Record<string, 'idle' | 'generating' | 'done' | 'error'>>({})
  const [visualMsg, setVisualMsg] = useState<Record<string, string>>({})
  const [brand, setBrand] = useState<{ brand_name?: string | null; social_handle?: string | null } | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null)
  const [comfyState, setComfyState] = useState<'idle' | 'generating' | 'done' | 'error'>('idle')
  const [comfyMsg, setComfyMsg] = useState<string | null>(null)
  const [dryRun, setDryRun] = useState<boolean | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const demo = useRuntimeDemo()

  const clienteId = readClienteId()

  useEffect(() => {
    fetch('/api/data/brand').then(r => r.ok ? r.json() : null).then(setBrand).catch(() => setBrand(null))
  }, [clienteId])

  // Modalità pubblicazione del cliente (dry_run): REAL = pubblica, DEMO = prova.
  useEffect(() => {
    fetch('/api/data/settings')
      .then(r => r.ok ? r.json() : [])
      .then((rows: Array<{ chiave?: string; valore?: string }>) => {
        const dr = Array.isArray(rows) ? rows.find(s => s.chiave === 'dry_run') : null
        setDryRun(dr ? dr.valore?.toUpperCase() === 'TRUE' : null)
      })
      .catch(() => setDryRun(null))
  }, [clienteId])

  // Cambio filtro/cliente → azzera la selezione multipla (gli id mostrati cambiano).
  useEffect(() => {
    setSelectedIds(new Set())
  }, [filterStatus, filterCanale, filterFormato, filterCategoria, searchText, clienteId])

  const fetchData = useCallback(async () => {
    setLoading(true)
    if (demo) {
      let filtered = demoData
      if (filterStatus !== 'tutti') filtered = filtered.filter(c => c.status === filterStatus)
      if (filterCanale !== 'tutti') filtered = filtered.filter(c => c.canale === filterCanale)
      if (filterFormato !== 'tutti') filtered = filtered.filter(c => c.formato === filterFormato)
      if (filterCategoria !== 'tutti') filtered = filtered.filter(c => c.obiettivo === filterCategoria)
      if (searchText.trim()) {
        const needle = searchText.trim().toLowerCase()
        filtered = filtered.filter(c => [
          c.id_contenuto, c.hook, c.caption, c.tema, c.nome_prodotto,
        ].some(value => String(value || '').toLowerCase().includes(needle)))
      }
      setContenuti(filtered)
      setLoading(false)
      return
    }
    const params = new URLSearchParams()
    if (clienteId) params.set('cliente_id', clienteId)
    if (filterStatus !== 'tutti') params.set('status', filterStatus)
    if (filterCanale !== 'tutti') params.set('canale', filterCanale)
    if (filterFormato !== 'tutti') params.set('formato', filterFormato)
    if (filterCategoria !== 'tutti') params.set('obiettivo', filterCategoria)
    if (searchText.trim()) params.set('q', searchText.trim())
    params.set('limit', '200')

    setLoadError(null)
    try {
      const res = await fetch(`/api/data/calendario?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setContenuti(data as Contenuto[])
      } else {
        // NON fingere "nessun contenuto" su un errore server: distingui vuoto da guasto.
        setContenuti([])
        setLoadError(await readApiError(res, 'Errore nel caricamento dei contenuti'))
      }
    } catch (e) {
      setContenuti([])
      setLoadError((e as Error)?.message || 'Errore di rete nel caricamento dei contenuti')
    }
    setLoading(false)
  }, [filterStatus, filterCanale, filterFormato, filterCategoria, searchText, demo, demoData, clienteId])

  useEffect(() => { fetchData() }, [fetchData])

  async function refreshSelected(idContenuto: string) {
    if (!clienteId) return
    try {
      const r = await fetch(`/api/data/calendario?cliente_id=${encodeURIComponent(clienteId)}`)
      if (!r.ok) return
      const all = await r.json() as Contenuto[]
      const found = all.find(c => c.id_contenuto === idContenuto)
      if (found) setSelected(found)
    } catch { /* noop */ }
  }

  // Genera la GRAFICA AI (immagine/carosello/video) per il contenuto, via Blotato.
  // Asincrono: avvia il job e fa polling finché è pronta, poi aggiorna i media.
  async function generaVisual(c: Contenuto) {
    const id = c.id_contenuto
    setVisualMsg(m => ({ ...m, [id]: '' }))
    setVisualState(s => ({ ...s, [id]: 'generating' }))
    try {
      const res = await fetch('/api/generate/visual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cliente_id: clienteId, id_contenuto: id }),
      })
      if (!res.ok) throw new Error(await readApiError(res, 'Avvio generazione grafica fallito'))

      const deadline = Date.now() + 5 * 60 * 1000
      while (Date.now() < deadline) {
        await new Promise(r => setTimeout(r, 15000))
        const params = new URLSearchParams({ id_contenuto: id })
        if (clienteId) params.set('cliente_id', clienteId)
        const sres = await fetch(`/api/generate/visual/status?${params.toString()}`)
        if (!sres.ok) continue
        const data = await sres.json() as { status?: string; error?: string }
        if (data.status === 'done') {
          setVisualState(s => ({ ...s, [id]: 'done' }))
          setVisualMsg(m => ({ ...m, [id]: 'Grafica generata e aggiunta ai media del contenuto.' }))
          await fetchData()
          await refreshSelected(id)
          return
        }
        if (data.status === 'failed') {
          setVisualState(s => ({ ...s, [id]: 'error' }))
          setVisualMsg(m => ({ ...m, [id]: data.error || 'Generazione grafica fallita' }))
          return
        }
      }
      setVisualState(s => ({ ...s, [id]: 'error' }))
      setVisualMsg(m => ({ ...m, [id]: 'Timeout: la grafica ci mette troppo. Riprova tra poco.' }))
    } catch (e) {
      setVisualState(s => ({ ...s, [id]: 'error' }))
      setVisualMsg(m => ({ ...m, [id]: (e as Error).message }))
    }
  }

  async function approva(c: Contenuto, user: string = 'admin') {
    setSaving(c.id)
    if (demo) {
      setDemoData(prev => prev.map(x => x.id === c.id ? {
        ...x, status: 'APPROVATO' as Status,
        checked_copy: 'SI', checked_media: 'SI', checked_link: 'SI',
        approvato_da: user, data_approvazione: new Date().toISOString(),
      } : x))
    } else {
      await fetch('/api/data/calendario', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: c.id,
          status: 'APPROVATO',
          checked_copy: 'SI',
          checked_media: 'SI',
          checked_link: 'SI',
        }),
      })
    }
    setSelected(null)
    setSaving(null)
  }

  async function rifiuta(c: Contenuto) {
    setSaving(c.id)
    if (demo) {
      setDemoData(prev => prev.map(x => x.id === c.id ? { ...x, status: 'BOZZA' as Status } : x))
    } else {
      await fetch('/api/data/calendario', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: c.id, status: 'BOZZA' }),
      })
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
      await fetch('/api/data/calendario', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: c.id,
          status: 'APPROVATO',
          errore_tecnico: null,
          retry_count: 0,
          publish_lock_id: null,
        }),
      })
    }
    setSaving(null)
  }

  // Genera un'immagine AI con ComfyUI LOCALE (gratis, sul Mac). Solo in locale.
  async function generaImmagineComfy(c: Contenuto) {
    if (!clienteId) return
    setComfyState('generating')
    setComfyMsg('Generazione immagine con ComfyUI… (SDXL può richiedere 20-60s)')
    try {
      const res = await fetch('/api/generate/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cliente_id: clienteId, id_contenuto: c.id_contenuto }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Generazione immagine fallita')
      setComfyState('done')
      setComfyMsg('Immagine generata e aggiunta al contenuto.')
      await refreshSelected(c.id_contenuto)
      setContenuti(prev => prev.map(item => item.id === c.id ? { ...item, ...(data.slot ? { [data.slot]: data.url } : {}) } : item))
    } catch (e) {
      setComfyState('error')
      setComfyMsg((e as Error).message)
    }
  }

  // Sincronizza su Blotato i contenuti APPROVATI non ancora inviati (pubblicazione).
  async function syncBlotato() {
    setSyncing(true)
    setSyncMsg(null)
    try {
      const res = await fetch('/api/data/blotato-sync', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.hint || data.error || 'Sincronizzazione fallita')
      const firstErr = Array.isArray(data.errors) && data.errors[0] ? ` — ${data.errors[0].canale}: ${data.errors[0].error}` : ''
      const failNote = data.failed ? ` (${data.failed} falliti)${firstErr}` : ''
      // dry-run = pubblicazione non attiva: contenuti pronti ma non pubblicati davvero.
      const dryNote = data.dry_run ? ` ${data.dry_run} in dry-run (PUBLISH_ENABLED non attivo).` : ''
      setSyncMsg({
        type: data.failed ? 'err' : 'ok',
        text: data.candidates === 0
          ? 'Nessun contenuto approvato da sincronizzare.'
          : `${data.synced} contenuti inviati a Blotato${failNote}.${dryNote}`,
      })
      await fetchData()
    } catch (e) {
      setSyncMsg({ type: 'err', text: (e as Error).message })
    } finally {
      setSyncing(false)
    }
  }

  async function downloadBackup() {
    setBackuping(true)
    setAdminError(null)
    try {
      const res = await fetch('/api/data/backup', { cache: 'no-store' })
      if (!res.ok) throw new Error(await readApiError(res, 'Backup contenuti fallito'))
      const blob = await res.blob()
      const disposition = res.headers.get('content-disposition') || ''
      const match = disposition.match(/filename="([^"]+)"/)
      const filename = match?.[1] || `social-automation-backup-${new Date().toISOString().slice(0, 10)}.json`
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      setAdminError((e as Error).message)
    } finally {
      setBackuping(false)
    }
  }

  // Carica/sostituisce la foto in uno specifico slot (link_media_1..10) del contenuto:
  // upload su /api/assets/upload (stesso endpoint del piano) + PATCH calendario.
  // slot 1 = foto principale (thumb riga + preview), 2..10 = slide carosello.
  async function attachPhoto(c: Contenuto, file: File, slot = 1) {
    if (!clienteId) return
    const col = `link_media_${slot}`
    setUploadingPhoto(`${c.id}:${slot}`)
    setAdminError(null)
    try {
      const form = new FormData()
      form.append('cliente_id', clienteId)
      form.append('files', file)
      const uploadRes = await fetch('/api/assets/upload', { method: 'POST', body: form })
      if (!uploadRes.ok) throw new Error(await readApiError(uploadRes, 'Caricamento foto fallito'))
      const uploadData = await uploadRes.json() as { assets?: { url: string }[] }
      const url = uploadData.assets?.[0]?.url
      if (!url) throw new Error('Upload riuscito ma nessun URL restituito')
      await saveMediaSlot(c, col, url)
    } catch (e) {
      setAdminError((e as Error).message)
    } finally {
      setUploadingPhoto(null)
    }
  }

  // Rimuove la foto da uno slot (mette la colonna a null).
  async function removePhoto(c: Contenuto, slot = 1) {
    const col = `link_media_${slot}`
    setUploadingPhoto(`${c.id}:${slot}`)
    setAdminError(null)
    try {
      await saveMediaSlot(c, col, null)
    } catch (e) {
      setAdminError((e as Error).message)
    } finally {
      setUploadingPhoto(null)
    }
  }

  // Persiste un valore (url o null) in una colonna link_media_* e allinea lo stato locale.
  async function saveMediaSlot(c: Contenuto, col: string, value: string | null) {
    if (demo) {
      setDemoData(prev => prev.map(item => item.id === c.id ? { ...item, [col]: value } : item))
    } else {
      const patchRes = await fetch('/api/data/calendario', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: c.id, [col]: value }),
      })
      if (!patchRes.ok) throw new Error(await readApiError(patchRes, 'Salvataggio foto fallito'))
    }
    setContenuti(prev => prev.map(item => item.id === c.id ? { ...item, [col]: value } : item))
    setSelected(prev => prev && prev.id === c.id ? { ...prev, [col]: value } : prev)
  }

  async function deleteContent(c: Contenuto) {
    setDeleting(true)
    setAdminError(null)
    try {
      if (demo) {
        setDemoData(prev => prev.filter(item => item.id !== c.id))
      } else {
        const res = await fetch(`/api/data/calendario?id=${encodeURIComponent(c.id)}`, { method: 'DELETE' })
        if (!res.ok) throw new Error(await readApiError(res, 'Cancellazione contenuto fallita'))
        setContenuti(prev => prev.filter(item => item.id !== c.id))
      }
      if (selected?.id === c.id) setSelected(null)
      setDeleteTarget(null)
    } catch (e) {
      setAdminError((e as Error).message)
    } finally {
      setDeleting(false)
    }
  }

  // Elimina in blocco i contenuti selezionati (svuota velocemente un piano generato).
  async function bulkDelete() {
    const ids = [...selectedIds]
    if (!ids.length) return
    setBulkDeleting(true)
    setAdminError(null)
    try {
      if (demo) {
        setDemoData(prev => prev.filter(item => !selectedIds.has(item.id)))
        setContenuti(prev => prev.filter(item => !selectedIds.has(item.id)))
      } else {
        const res = await fetch('/api/data/calendario', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids }),
        })
        if (!res.ok) throw new Error(await readApiError(res, 'Eliminazione multipla fallita'))
        const data = await res.json() as { deleted_ids?: string[]; warning?: string }
        // Rimuovi SOLO quelli davvero eliminati dal server (fonte di verità), non l'intera selezione.
        const removed = new Set(data.deleted_ids ?? ids)
        setContenuti(prev => prev.filter(item => !removed.has(item.id)))
        if (data.warning) setAdminError(data.warning)
      }
      if (selected && selectedIds.has(selected.id)) setSelected(null)
      setSelectedIds(new Set())
      setBulkDeleteOpen(false)
    } catch (e) {
      setAdminError((e as Error).message)
    } finally {
      setBulkDeleting(false)
    }
  }

  function toggleSelectId(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    setSelectedIds(prev => prev.size === contenuti.length ? new Set() : new Set(contenuti.map(c => c.id)))
  }

  async function handleScore(c: Contenuto) {
    setScoring(c.id)
    setScoreError(null)
    if (demo) {
      await new Promise(r => setTimeout(r, 1200))
      setScores(prev => ({
        ...prev,
        [c.id]: {
          score_globale: 78,
          hook_strength: 72,
          copy_quality: 85,
          brand_fit: 80,
          cta_effectiveness: 70,
          hashtag_relevance: 76,
          seo_potential: 65,
          compliance: 90,
          giudizio: 'BUONO',
          punti_forti: ['Hook coinvolgente', 'Tono coerente con il brand'],
          punti_deboli: ['CTA poco incisiva', 'Hashtag generici'],
          suggerimenti: ['Rendi la CTA più urgente', 'Aggiungi 2 hashtag di nicchia'],
        },
      }))
      setScoring(null)
      return
    }
    try {
      const aiSettings = readAISettings()
      const res = await fetch('/api/generate/score-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_id: clienteId,
          canale: c.canale,
          formato: c.formato,
          hook: c.hook,
          caption: c.caption,
          hashtag: c.hashtag,
          cta: c.cta,
          visual: c.idea_visual || c.alt_text || '',
          quality_level: c.quality_level,
          audience_segment: c.audience_segment,
          funnel_stage: c.funnel_stage,
          angle: c.angle,
          primary_message: c.primary_message,
          creative_brief: c.creative_brief,
          kpi_target: c.kpi_target,
          performance_hypothesis: c.performance_hypothesis,
          optimization_cycle: c.optimization_cycle_json,
          next_iteration_actions: c.next_iteration_actions,
          production_notes: c.production_notes,
          compliance_notes: c.compliance_notes,
          ...aiSettings,
        }),
      })
      if (!res.ok) throw new Error(await readApiError(res, 'Scoring AI fallito'))
      const data = await res.json()
      setScores(prev => ({ ...prev, [c.id]: data }))
    } catch (e) {
      setScoreError((e as Error).message)
    }
    setScoring(null)
  }

  async function generateApprovalLink(c: Contenuto) {
    setSendingToken(c.id)
    setApprovalUrl(null)
    if (demo) {
      await new Promise(r => setTimeout(r, 500))
      setApprovalUrl(`${window.location.origin}/approve/demo-${c.id}`)
      setSendingToken(null)
      return
    }
    try {
      const clienteId = readClienteId()
      if (!clienteId) throw new Error('Nessun cliente selezionato')
      const res = await fetch('/api/data/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cliente_id: clienteId, contenuto_id: c.id_contenuto }),
      })
      if (!res.ok) throw new Error('Errore generazione link')
      const data = await res.json()
      setApprovalUrl(data.url as string)
    } catch (e) { console.error('Approval link error:', e) }
    setSendingToken(null)
  }

  async function handleDrop(c: Contenuto, newDate: string) {
    setDragOverDate(null)
    if (c.data_pubblicazione === newDate) return
    if (demo) {
      setDemoData(prev => prev.map(x => x.id === c.id ? { ...x, data_pubblicazione: newDate } : x))
      return
    }
    try {
      await fetch('/api/data/calendario', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: c.id, data_pubblicazione: newDate }),
      })
      setContenuti(prev => prev.map(x => x.id === c.id ? { ...x, data_pubblicazione: newDate } : x))
    } catch (e) { console.error('Drag drop PATCH failed', e) }
  }

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - d.getDay() + 1 + i)
    return d.toISOString().split('T')[0]
  })

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Calendario</h1>
            {dryRun !== null && (
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${dryRun ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}
                title={dryRun ? 'Modalità prova: i post approvati NON vengono pubblicati' : 'Live: i post approvati vengono pubblicati sui social'}
              >
                {dryRun ? 'DEMO' : 'REAL'}
              </span>
            )}
          </div>
          <p className="text-xs md:text-sm text-gray-500 mt-0.5">{contenuti.length} contenuti</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={syncBlotato} disabled={syncing} className="btn-secondary py-1.5 px-3" title="Invia i contenuti APPROVATI a Blotato per la pubblicazione">
            {syncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
            <span className="hidden md:inline">{syncing ? 'Sincronizzo...' : 'Sincronizza Blotato'}</span>
          </button>
          <button onClick={downloadBackup} disabled={backuping} className="btn-secondary py-1.5 px-3">
            {backuping ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span className="hidden md:inline">Backup</span>
          </button>
          <button onClick={fetchData} className="btn-secondary py-1.5 px-3">
            <RefreshCw className="w-4 h-4" />
            <span className="hidden md:inline">Aggiorna</span>
          </button>
        </div>
      </div>

      {syncMsg && (
        <div className={`mb-4 rounded-xl border p-3 text-sm flex items-start gap-2 ${syncMsg.type === 'ok' ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {syncMsg.type === 'ok' ? <CheckCircle className="w-4 h-4 mt-0.5" /> : <AlertTriangle className="w-4 h-4 mt-0.5" />}
          {syncMsg.text}
        </div>
      )}

      {/* Banner modalità DEMO: chiarisce che le approvazioni non pubblicano davvero */}
      {dryRun === true && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>
            Modalità <strong>DEMO</strong> attiva: approvando un contenuto <strong>non</strong> viene pubblicato sui social (solo prova).
            Per pubblicare davvero, spegni <span className="font-mono">Modalità pubblicazione</span> in{' '}
            <Link href="/dashboard/settings" className="underline font-medium">Impostazioni</Link> (→ REAL).
          </span>
        </div>
      )}

      {(scoreError || adminError) && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {scoreError ? `AI scoring: ${scoreError}` : adminError}
        </div>
      )}

      {/* Filtri */}
      <div className="card p-3 md:p-4 mb-4 md:mb-6 bg-white/90">
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-semibold text-gray-700">Filtra contenuti</span>
          </div>
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              placeholder="Cerca ID, hook, tema o prodotto..."
              className="pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-lg bg-white text-gray-700 w-full focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          {[
            { label: 'Canale', value: filterCanale, setter: setCanale, options: CANALI.map(c => [c, c === 'tutti' ? 'Tutti i canali' : `${CANALE_ICON[c] || ''} ${c}`]) },
            { label: 'Formato', value: filterFormato, setter: setFormato, options: FORMATI.map(f => [f, f === 'tutti' ? 'Tutti i formati' : f]) },
            { label: 'Categoria', value: filterCategoria, setter: setCategoria, options: CATEGORIE },
          ].map(filter => (
            <label key={filter.label} className="relative">
              <span className="sr-only">{filter.label}</span>
              <select
                value={filter.value}
                onChange={e => filter.setter(e.target.value)}
                className="pl-3 pr-8 py-2 text-xs border border-gray-200 rounded-lg bg-white text-gray-600 appearance-none focus:outline-none focus:ring-2 focus:ring-brand-500 min-w-[140px]"
              >
                {filter.options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </label>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
          <span className="text-xs text-gray-500 mr-1">Stato:</span>
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
        </div>
      </div>

      {/* Week date bar — drop targets */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
        {weekDays.map(date => {
          const countOnDate = contenuti.filter(c => c.data_pubblicazione === date).length
          const isToday = date === new Date().toISOString().split('T')[0]
          const isOver = dragOverDate === date
          return (
            <div
              key={date}
              onDragOver={e => { e.preventDefault(); setDragOverDate(date) }}
              onDragLeave={() => setDragOverDate(null)}
              onDrop={e => {
                e.preventDefault()
                setDragOverDate(null)
                const cid = e.dataTransfer.getData('contenuto_id')
                const content = contenuti.find(c => c.id === cid)
                if (content) handleDrop(content, date)
              }}
              className={`flex-1 min-w-[60px] rounded-xl border-2 px-2 py-2 text-center cursor-pointer transition-colors ${
                isOver ? 'border-brand-400 bg-brand-50 scale-105' :
                isToday ? 'border-brand-300 bg-brand-50/50' :
                'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <p className="text-[10px] text-gray-400 uppercase">
                {['LUN','MAR','MER','GIO','VEN','SAB','DOM'][new Date(date).getDay() === 0 ? 6 : new Date(date).getDay() - 1]}
              </p>
              <p className={`text-sm font-bold ${isToday ? 'text-brand-600' : 'text-gray-700'}`}>
                {date.split('-')[2]}
              </p>
              {countOnDate > 0 && (
                <span className={`text-[10px] font-medium ${isToday ? 'text-brand-500' : 'text-gray-400'}`}>
                  {countOnDate}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
        </div>
      ) : loadError ? (
        <div className="card p-8 text-center border border-red-200 bg-red-50">
          <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm font-semibold text-red-800">Impossibile caricare i contenuti</p>
          <p className="text-xs text-red-600 mt-1">{loadError}</p>
          <button onClick={() => fetchData()} className="btn-secondary text-xs mt-3 inline-flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Riprova
          </button>
        </div>
      ) : contenuti.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <p className="text-lg">Nessun contenuto trovato</p>
          <p className="text-sm mt-1">Cambia i filtri o attendi il piano settimanale</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Barra selezione multipla — seleziona tutto + elimina in blocco */}
          <div className="flex items-center justify-between gap-3 px-1 py-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={selectedIds.size > 0 && selectedIds.size === contenuti.length}
                ref={el => { if (el) el.indeterminate = selectedIds.size > 0 && selectedIds.size < contenuti.length }}
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-xs text-gray-500">
                {selectedIds.size > 0 ? `${selectedIds.size} selezionati` : 'Seleziona tutti'}
              </span>
            </label>
            {selectedIds.size > 0 && (
              <button
                onClick={() => setBulkDeleteOpen(true)}
                className="btn-danger py-1.5 px-3 text-xs inline-flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Elimina selezionati ({selectedIds.size})
              </button>
            )}
          </div>
          {contenuti.map(c => (
            <div
              key={c.id}
              draggable
              onDragStart={e => { e.dataTransfer.setData('contenuto_id', c.id); setDragItem(c.id) }}
              onDragEnd={() => setDragItem(null)}
              className={`card p-3 md:p-4 hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing ${dragItem === c.id ? 'opacity-50 scale-95' : ''} ${selectedIds.has(c.id) ? 'ring-2 ring-brand-400' : ''}`}
            >
              <div className="flex flex-wrap items-start gap-3 md:gap-4">
                {/* Checkbox selezione per eliminazione multipla */}
                <input
                  type="checkbox"
                  checked={selectedIds.has(c.id)}
                  onChange={() => toggleSelectId(c.id)}
                  onClick={e => e.stopPropagation()}
                  className="mt-1 w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500 flex-shrink-0"
                  title="Seleziona per eliminazione multipla"
                />
                {/* Media thumb — click per caricare/sostituire la foto principale */}
                <label
                  className="relative w-16 h-16 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden group cursor-pointer"
                  title="Carica o sostituisci la foto principale"
                  onClick={e => e.stopPropagation()}
                  draggable={false}
                >
                  {c.link_media_1 ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.link_media_1} alt="" className="w-full h-full object-cover"
                      onError={e => { (e.target as HTMLImageElement).style.display='none' }} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">
                      {CANALE_ICON[c.canale] ?? '📄'}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/45 transition-colors flex items-center justify-center">
                    {uploadingPhoto === `${c.id}:1` ? (
                      <RefreshCw className="w-4 h-4 text-white animate-spin" />
                    ) : (
                      <Camera className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) attachPhoto(c, f, 1); e.target.value = '' }}
                  />
                </label>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-mono text-xs text-gray-400">{c.id_contenuto}</span>
                    <StatusBadge status={c.status} />
                    {c.quality_level && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-700 uppercase">{c.quality_level}</span>
                    )}
                    <span className="text-xs text-gray-400 inline-flex items-center gap-1">
                      <span>{CANALE_ICON[c.canale] ?? '📄'}</span>
                      <span>{c.canale}</span>
                      <span>·</span>
                      <span>{c.formato}</span>
                      {c.obiettivo && (
                        <>
                          <span>·</span>
                          <span className="text-amber-700">{formatCategoryLabel(c.obiettivo)}</span>
                        </>
                      )}
                    </span>
                    <span className="text-xs text-gray-600 ml-auto inline-flex items-center gap-1.5 rounded-full bg-gray-50 border border-gray-200 px-2 py-1 font-medium">
                      <span>{formatDateLabel(c.data_pubblicazione)}</span>
                      <span className="text-gray-300">·</span>
                      <span className="font-mono">{formatTimeLabel(c.ora_pubblicazione)}</span>
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-50 text-slate-600 border border-slate-200">{c.formato}</span>
                    {c.obiettivo && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">{formatCategoryLabel(c.obiettivo)}</span>
                    )}
                    {c.tema && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-100 truncate max-w-[220px]">{c.tema}</span>
                    )}
                  </div>
                  {c.hook && <p className="text-sm font-medium text-gray-800 mb-0.5 truncate">{c.hook}</p>}
                  {c.caption && <p className="text-sm text-gray-500 truncate">{c.caption}</p>}
                  {c.errore_tecnico && (
                    <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1 mt-1 truncate">
                      ⚠ {c.errore_tecnico}
                    </p>
                  )}
                  {c.blotato_status && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                        c.blotato_status === 'published' ? 'bg-green-500' :
                        c.blotato_status === 'scheduled' ? 'bg-blue-500' :
                        c.blotato_status === 'failed' ? 'bg-red-500' : 'bg-gray-400'
                      }`} />
                      <span className="text-[10px] text-gray-500">
                        {c.blotato_status === 'published' ? 'Pubblicato' :
                         c.blotato_status === 'scheduled' ? 'In coda Blotato' :
                         c.blotato_status === 'failed' ? 'Fallito' : c.blotato_status}
                      </span>
                    </div>
                  )}
                </div>

                {/* Azioni */}
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-1.5 md:gap-2 flex-shrink-0">
                  <Link
                    href={`/preview/${c.id_contenuto}`}
                    onClick={() => {
                      try { localStorage.setItem(`preview_${c.id_contenuto}`, JSON.stringify({
                        hook: c.hook, caption: c.caption, hashtag: c.hashtag, cta: c.cta,
                        canale: c.canale, formato: c.formato,
                        link_media_1: c.link_media_1, link_media_2: c.link_media_2, link_media_3: c.link_media_3,
                        link_media_4: c.link_media_4, link_media_5: c.link_media_5, link_media_6: c.link_media_6,
                        link_media_7: c.link_media_7, link_media_8: c.link_media_8, link_media_9: c.link_media_9,
                        link_media_10: c.link_media_10,
                        nome_prodotto: c.nome_prodotto, tema: c.tema, note: c.note,
                        scenes_json: c.scenes_json, slides_json: c.slides_json, overlay_text: c.overlay_text,
                        alt_text: c.alt_text, tags: c.tags, thumbnail_url: c.thumbnail_url,
                        idea_visual: c.idea_visual, voiceover_script: c.voiceover_script, music_mood: c.music_mood,
                        link_prodotto_finale: c.link_prodotto_finale || c.link_prodotto,
                        brand_name: brand?.brand_name, social_handle: brand?.social_handle,
                      })) } catch {}
                    }}
                    title="Anteprima del post"
                    className="btn-secondary py-1.5 px-2 md:px-3 justify-center inline-flex items-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span className="hidden md:inline text-xs">Preview</span>
                  </Link>
                  <button
                    onClick={() => setSelected(c)}
                    title="Dettagli e brief completo"
                    className="btn-secondary py-1.5 px-2 md:px-3 justify-center"
                  >
                    <Info className="w-3.5 h-3.5" />
                    <span className="hidden md:inline text-xs">Dettagli</span>
                  </button>
                  <button
                    onClick={() => handleScore(c)}
                    disabled={scoring === c.id}
                    title="Valuta con AI (punteggio qualità)"
                    className={`py-1.5 px-2 md:px-3 justify-center inline-flex items-center gap-1.5 rounded-lg text-xs font-medium transition-colors ${
                      scores[c.id]
                        ? 'bg-violet-50 text-violet-700 border border-violet-200'
                        : 'btn-secondary'
                    }`}
                  >
                    {scoring === c.id
                      ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      : <Sparkles className="w-3.5 h-3.5" />
                    }
                    <span className="hidden md:inline">{scores[c.id] ? (scores[c.id].score_globale as number) : 'Valuta'}</span>
                  </button>
                  {c.status === 'DA_APPROVARE' && (
                    <>
                      <button onClick={() => approva(c)} disabled={saving === c.id} title="Approva contenuto" className="btn-primary py-1.5 px-2 md:px-3 justify-center">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span className="hidden md:inline">{saving === c.id ? '...' : 'Approva'}</span>
                      </button>
                      <button onClick={() => rifiuta(c)} disabled={saving === c.id} title="Rifiuta / elimina" className="btn-danger py-1.5 px-2 md:px-3 justify-center">
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
                  <button
                    onClick={() => setDeleteTarget(c)}
                    disabled={saving === c.id}
                    className="py-1.5 px-2 md:px-3 justify-center inline-flex items-center gap-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors"
                    title="Elimina definitivamente il contenuto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">Elimina</span>
                  </button>
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
                <p className="text-sm text-gray-500">
                  {selected.canale} · {selected.formato} · {formatCategoryLabel(selected.obiettivo)} · {formatDateLabel(selected.data_pubblicazione)} alle {formatTimeLabel(selected.ora_pubblicazione)}
                </p>
                {selected.quality_level && (
                  <span className="inline-flex mt-2 text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full bg-violet-100 text-violet-700">
                    Qualità {selected.quality_level}
                  </span>
                )}
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Anteprima visuale post */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 -mx-6 -mt-6 px-6 py-6 border-b">
                <p className="label mb-3">Anteprima {selected.canale}</p>
                <PostPreview c={selected} brand={brand} />
              </div>

              {/* Contenuto */}
              {hasText(selected.hook) && (
                <div>
                  <p className="label">Hook</p>
                  <p className="text-sm text-gray-800 font-medium">{asText(selected.hook)}</p>
                </div>
              )}
              {hasText(selected.caption) && (
                <div>
                  <p className="label">Caption</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{asText(selected.caption)}</p>
                </div>
              )}
              {hasText(selected.hashtag) && (
                <div>
                  <p className="label">Hashtag</p>
                  <p className="text-sm text-brand-600">{asText(selected.hashtag)}</p>
                </div>
              )}
              {hasText(selected.cta) && (
                <div>
                  <p className="label">CTA</p>
                  <p className="text-sm text-gray-700">{asText(selected.cta)}</p>
                </div>
              )}

              {Boolean(selected.angle || selected.audience_segment || selected.funnel_stage || selected.kpi_target || selected.primary_message || selected.creative_brief || selected.template_id || selected.template_style || selected.production_notes || selected.compliance_notes || selected.expected_outcome || selected.production_cycle_stage || selected.performance_hypothesis || selected.optimization_cycle_json || selected.next_iteration_actions) && (
                <div className="rounded-xl border border-violet-100 bg-violet-50/60 p-4">
                  <p className="text-sm font-bold text-violet-900 mb-3">Strategia operativa</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                    {[
                      { label: 'Audience', value: selected.audience_segment },
                      { label: 'Funnel', value: selected.funnel_stage },
                      { label: 'Angolo', value: selected.angle },
                      { label: 'KPI', value: selected.kpi_target },
                      { label: 'Messaggio', value: selected.primary_message },
                      { label: 'Outcome', value: selected.expected_outcome },
                      { label: 'Ciclo', value: selected.production_cycle_stage },
                      { label: 'Ipotesi', value: selected.performance_hypothesis },
                      { label: 'Template', value: selected.template_id },
                      { label: 'Stile', value: selected.template_style },
                    ].filter(item => Boolean(item.value)).map(item => (
                      <div key={item.label} className="bg-white rounded-lg p-2 border border-violet-100">
                        <p className="text-[10px] uppercase text-violet-500 font-bold">{item.label}</p>
                        <p className="text-xs text-gray-800 mt-0.5">{asText(item.value)}</p>
                      </div>
                    ))}
                  </div>
                  {selected.creative_brief && (
                    <div className="mb-2">
                      <p className="text-[10px] uppercase text-violet-600 font-bold">Brief creativo</p>
                      <p className="text-xs text-violet-900 whitespace-pre-wrap">{selected.creative_brief}</p>
                    </div>
                  )}
                  {Boolean(selected.layout_spec_json || selected.asset_requirements_json) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                      {Boolean(selected.layout_spec_json) && (
                        <div className="bg-white rounded-lg p-2 border border-violet-100">
                          <p className="text-[10px] uppercase text-violet-600 font-bold">Layout</p>
                          <pre className="text-[10px] text-violet-900 whitespace-pre-wrap font-mono mt-1">{JSON.stringify(selected.layout_spec_json, null, 2)}</pre>
                        </div>
                      )}
                      {Boolean(selected.asset_requirements_json) && (
                        <div className="bg-white rounded-lg p-2 border border-violet-100">
                          <p className="text-[10px] uppercase text-violet-600 font-bold">Asset richiesti</p>
                          <pre className="text-[10px] text-violet-900 whitespace-pre-wrap font-mono mt-1">{JSON.stringify(selected.asset_requirements_json, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  )}
                  {Boolean(selected.optimization_cycle_json || selected.next_iteration_actions) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                      {Boolean(selected.optimization_cycle_json) && (
                        <div className="bg-white rounded-lg p-2 border border-violet-100">
                          <p className="text-[10px] uppercase text-violet-600 font-bold">Ottimizzazione</p>
                          <pre className="text-[10px] text-violet-900 whitespace-pre-wrap font-mono mt-1">{JSON.stringify(selected.optimization_cycle_json, null, 2)}</pre>
                        </div>
                      )}
                      {Boolean(selected.next_iteration_actions) && (
                        <div className="bg-white rounded-lg p-2 border border-violet-100">
                          <p className="text-[10px] uppercase text-violet-600 font-bold">Prossime azioni</p>
                          <pre className="text-[10px] text-violet-900 whitespace-pre-wrap font-mono mt-1">{JSON.stringify(selected.next_iteration_actions, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  )}
                  {selected.production_notes && (
                    <div className="mb-2">
                      <p className="text-[10px] uppercase text-violet-600 font-bold">Produzione</p>
                      <p className="text-xs text-violet-900 whitespace-pre-wrap">{selected.production_notes}</p>
                    </div>
                  )}
                  {selected.compliance_notes && (
                    <div>
                      <p className="text-[10px] uppercase text-violet-600 font-bold">Compliance</p>
                      <p className="text-xs text-violet-900 whitespace-pre-wrap">{selected.compliance_notes}</p>
                    </div>
                  )}
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
                <button
                  onClick={() => handleScore(selected)}
                  disabled={scoring === selected.id}
                  className="btn-secondary w-full justify-center mt-3 text-xs py-2"
                >
                  {scoring === selected.id
                    ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    : <Sparkles className="w-3.5 h-3.5" />
                  }
                  {scoring === selected.id ? 'Valutando...' : scores[selected.id] ? 'Rivaluta contenuto' : 'AI Score — Valuta qualità'}
                </button>
              </div>

              {/* AI Score */}
              {scores[selected.id] && (
                <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl p-4 border border-violet-100">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-bold text-violet-900">AI Content Score</p>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      (scores[selected.id].giudizio as string) === 'OTTIMO' ? 'bg-green-100 text-green-700' :
                      (scores[selected.id].giudizio as string) === 'BUONO' ? 'bg-violet-100 text-violet-700' :
                      (scores[selected.id].giudizio as string) === 'MEDIOCRE' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {scores[selected.id].giudizio as string} · {scores[selected.id].score_globale as number}/100
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                    {[
                      { k: 'hook_strength', l: 'Hook' },
                      { k: 'copy_quality', l: 'Copy' },
                      { k: 'brand_fit', l: 'Brand' },
                      { k: 'cta_effectiveness', l: 'CTA' },
                      { k: 'hashtag_relevance', l: 'Hashtag' },
                      { k: 'seo_potential', l: 'SEO' },
                      { k: 'platform_native_fit', l: 'Native' },
                      { k: 'creative_clarity', l: 'Brief' },
                      { k: 'conversion_path', l: 'Funnel' },
                      { k: 'accessibility', l: 'Access' },
                      { k: 'compliance', l: 'Regole' },
                      { k: 'optimization_readiness', l: 'Itera' },
                    ].map(({ k, l }) => {
                      const rawValue = scores[selected.id][k]
                      const val = typeof rawValue === 'number' ? rawValue : 0
                      const color = val >= 80 ? 'bg-green-500' : val >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                      return (
                        <div key={k} className="bg-white rounded-lg p-2 text-center">
                          <p className="text-[10px] text-gray-400 uppercase">{l}</p>
                          <p className="text-sm font-bold text-gray-900">{val}</p>
                          <div className="w-full h-1 bg-gray-100 rounded-full mt-1">
                            <div className={`h-full rounded-full ${color}`} style={{ width: `${val}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {Array.isArray(scores[selected.id].punti_forti) && (scores[selected.id].punti_forti as string[]).length > 0 && (
                    <div className="mb-2">
                      <p className="text-[10px] uppercase text-green-600 font-bold mb-1">Punti forti</p>
                      <ul className="space-y-0.5">
                        {(scores[selected.id].punti_forti as string[]).map((p: string, i: number) => (
                          <li key={i} className="text-xs text-green-700 flex items-start gap-1">
                            <span className="text-green-500 mt-0.5">✓</span> {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {Array.isArray(scores[selected.id].punti_deboli) && (scores[selected.id].punti_deboli as string[]).length > 0 && (
                    <div className="mb-2">
                      <p className="text-[10px] uppercase text-red-500 font-bold mb-1">Da migliorare</p>
                      <ul className="space-y-0.5">
                        {(scores[selected.id].punti_deboli as string[]).map((p: string, i: number) => (
                          <li key={i} className="text-xs text-red-600 flex items-start gap-1">
                            <span className="text-red-400 mt-0.5">○</span> {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {Array.isArray(scores[selected.id].suggerimenti) && (scores[selected.id].suggerimenti as string[]).length > 0 && (
                    <div>
                      <p className="text-[10px] uppercase text-violet-600 font-bold mb-1">Suggerimenti</p>
                      <ul className="space-y-0.5">
                        {(scores[selected.id].suggerimenti as string[]).map((s: string, i: number) => (
                          <li key={i} className="text-xs text-violet-700 flex items-start gap-1">
                            <Sparkles className="w-3 h-3 text-violet-400 mt-0.5 flex-shrink-0" />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Immagine AI locale (ComfyUI) — gratis, gira sul Mac. Solo in locale. */}
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <p className="text-sm font-bold text-emerald-900">Immagine AI locale (ComfyUI)</p>
                </div>
                <p className="text-xs text-emerald-700/80 mb-3">
                  Genera un&apos;immagine dal contenuto con ComfyUI sul tuo Mac (gratis). Richiede ComfyUI avviato e l&apos;app in locale — non funziona sul sito.
                </p>
                <button
                  onClick={() => generaImmagineComfy(selected)}
                  disabled={comfyState === 'generating'}
                  className="w-full text-xs font-semibold py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 flex items-center justify-center gap-1.5"
                >
                  {comfyState === 'generating' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  {comfyState === 'generating' ? 'Generazione in corso…' : 'Genera immagine (locale)'}
                </button>
                {comfyMsg && (
                  <p className={`text-xs mt-2 ${comfyState === 'error' ? 'text-red-600' : 'text-emerald-700'}`}>{comfyMsg}</p>
                )}
              </div>

              {/* Immagini del post — ogni slot ha il suo campo carica/sostituisci/rimuovi */}
              {(() => {
                const isCarousel = selected.formato === 'carousel'
                const slotCount = isCarousel ? 10 : 1
                const mediaVals = [
                  selected.link_media_1, selected.link_media_2, selected.link_media_3,
                  selected.link_media_4, selected.link_media_5, selected.link_media_6, selected.link_media_7,
                  selected.link_media_8, selected.link_media_9, selected.link_media_10,
                ]
                // Mostra tutti gli slot pieni + il primo slot vuoto (per aggiungerne uno).
                const lastFilled = mediaVals.reduce((acc, v, i) => (v ? i : acc), -1)
                const visibleSlots = isCarousel
                  ? Math.min(slotCount, Math.max(1, lastFilled + 2))
                  : 1
                return (
                  <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-4">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <ImagePlus className="w-4 h-4 text-sky-600" />
                        <p className="text-sm font-bold text-sky-900">Immagini del post</p>
                      </div>
                      <span className="text-[10px] text-sky-600 uppercase font-bold">
                        {isCarousel ? 'carosello · fino a 7' : '1 immagine'}
                      </span>
                    </div>
                    <p className="text-xs text-sky-700/80 mb-3">
                      Carica le tue foto dal computer. Ogni immagine ha il suo campo: puoi sostituirla o rimuoverla singolarmente.
                    </p>
                    <div className={`grid gap-2 ${isCarousel ? 'grid-cols-3 sm:grid-cols-4' : 'grid-cols-1 max-w-[200px]'}`}>
                      {Array.from({ length: visibleSlots }).map((_, i) => {
                        const slot = i + 1
                        const url = mediaVals[i]
                        const busy = uploadingPhoto === `${selected.id}:${slot}`
                        return (
                          <div key={slot} className="relative">
                            <label
                              className={`relative block ${isCarousel ? 'aspect-square' : 'aspect-[4/5]'} rounded-lg overflow-hidden border-2 ${url ? 'border-sky-200' : 'border-dashed border-sky-300'} bg-white cursor-pointer group`}
                              title={url ? 'Sostituisci immagine' : 'Carica immagine'}
                            >
                              {url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={url} alt={`Slide ${slot}`} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-sky-400 gap-1">
                                  <Camera className="w-5 h-5" />
                                  <span className="text-[10px] font-medium">Carica</span>
                                </div>
                              )}
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                                {busy ? (
                                  <RefreshCw className="w-4 h-4 text-white animate-spin" />
                                ) : url ? (
                                  <Camera className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                ) : null}
                              </div>
                              <span className="absolute top-1 left-1 text-[9px] font-bold bg-black/50 text-white rounded px-1">{slot}</span>
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                                className="hidden"
                                disabled={busy}
                                onChange={e => { const f = e.target.files?.[0]; if (f) attachPhoto(selected, f, slot); e.target.value = '' }}
                              />
                            </label>
                            {url && !busy && (
                              <button
                                type="button"
                                onClick={() => removePhoto(selected, slot)}
                                title="Rimuovi immagine"
                                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white border border-gray-200 shadow flex items-center justify-center text-gray-500 hover:text-red-600 hover:border-red-200"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}

              {/* Grafica AI (Blotato visual) */}
              {(() => {
                const id = selected.id_contenuto
                const vstate = visualState[id] ?? (selected.visual_status === 'done' ? 'done' : 'idle')
                const generating = vstate === 'generating'
                const imgs = Array.isArray(selected.visual_image_urls) ? (selected.visual_image_urls as string[]) : []
                const video = typeof selected.visual_url === 'string' ? selected.visual_url : ''
                return (
                  <div className="rounded-xl border border-fuchsia-100 bg-gradient-to-br from-fuchsia-50/70 to-violet-50/70 p-4">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <Wand2 className="w-4 h-4 text-fuchsia-600" />
                        <p className="text-sm font-bold text-fuchsia-900">Grafica AI</p>
                      </div>
                      <span className="text-[10px] text-fuchsia-600 uppercase font-bold">
                        {selected.formato === 'carousel' ? 'carosello' : ['reel','video','story','short'].includes(String(selected.formato)) ? 'video' : 'immagine'}
                      </span>
                    </div>
                    <p className="text-xs text-fuchsia-700/80 mb-3">
                      L&apos;AI crea la grafica dal contenuto: foto prodotto in scena lifestyle, carosello o slideshow video. Viene aggiunta ai media del post.
                    </p>

                    {(imgs.length > 0 || video) && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                        {video && (
                          <div className="col-span-3 rounded-lg overflow-hidden border border-fuchsia-100 bg-black/5">
                            <video src={video} controls className="w-full max-h-64 object-contain">
                              <track kind="captions" />
                            </video>
                          </div>
                        )}
                        {imgs.slice(0, 6).map((u, i) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={i} src={u} alt={`Grafica AI ${i + 1}`} className="w-full aspect-square object-cover rounded-lg border border-fuchsia-100" />
                        ))}
                      </div>
                    )}

                    <button
                      onClick={() => generaVisual(selected)}
                      disabled={generating}
                      className="btn-secondary w-full justify-center text-xs py-2 border-fuchsia-200 text-fuchsia-700 hover:bg-fuchsia-50"
                    >
                      {generating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : (video || imgs.length ? <RefreshCw className="w-3.5 h-3.5" /> : <Film className="w-3.5 h-3.5" />)}
                      {generating ? 'Generando la grafica… (può richiedere 1-3 min)' : (video || imgs.length ? 'Rigenera grafica' : 'Genera grafica AI')}
                    </button>

                    {visualMsg[id] && (
                      <p className={`text-xs mt-2 ${vstate === 'error' ? 'text-red-600' : 'text-fuchsia-700'}`}>{visualMsg[id]}</p>
                    )}
                  </div>
                )
              })()}

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
            <div className="p-6 border-t space-y-3">
              {/* Approval link */}
              {selected.status === 'DA_APPROVARE' && (
                <div className="flex flex-col gap-2">
                  <div className="flex gap-3">
                    <button onClick={() => generateApprovalLink(selected)} disabled={sendingToken === selected.id} className="btn-secondary flex-1 justify-center py-2">
                      <Share2 className="w-4 h-4" />
                      {sendingToken === selected.id ? 'Genero...' : 'Invia al cliente'}
                    </button>
                  </div>
                  {approvalUrl && (
                    <div className="bg-brand-50 border border-brand-200 rounded-lg p-2.5">
                      <p className="text-xs text-brand-700 font-medium mb-1">✅ Link approvazione generato:</p>
                      <div className="flex gap-2">
                        <input readOnly value={approvalUrl} className="input text-xs flex-1" onClick={e => (e.target as HTMLInputElement).select()} />
                        <button onClick={() => { navigator.clipboard?.writeText(approvalUrl) }} className="btn-primary text-xs px-3">Copia</button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {selected.status === 'DA_APPROVARE' && (
                <div className="flex gap-3">
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
            </div>

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

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => !deleting && setDeleteTarget(null)}>
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900">Cancellare contenuto?</h2>
                <p className="text-xs text-gray-500">{deleteTarget.id_contenuto} · {deleteTarget.canale} · {deleteTarget.formato}</p>
              </div>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-sm text-gray-700">
                Questa azione elimina il contenuto dal calendario e rimuove eventuali token di approvazione collegati. Prima puoi scaricare un backup JSON.
              </p>
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
                Se il contenuto è già pubblicato su social, questo cancella solo la copia interna della piattaforma.
              </div>
            </div>
            <div className="p-5 border-t flex gap-3">
              <button onClick={() => setDeleteTarget(null)} disabled={deleting} className="btn-secondary flex-1 justify-center">
                Annulla
              </button>
              <button
                onClick={() => deleteContent(deleteTarget)}
                disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-lg text-sm flex items-center justify-center gap-2"
              >
                {deleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {deleting ? 'Cancello...' : 'Cancella'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale conferma eliminazione multipla */}
      {bulkDeleteOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => !bulkDeleting && setBulkDeleteOpen(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900">Eliminare {selectedIds.size} contenuti?</h2>
                <p className="text-xs text-gray-500">Eliminazione multipla dal calendario</p>
              </div>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-sm text-gray-700">
                Elimina definitivamente <span className="font-semibold">{selectedIds.size} contenuti</span> selezionati e i relativi token di approvazione. Utile per svuotare un piano editoriale generato che non ti serve.
              </p>
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
                Azione irreversibile. I contenuti già pubblicati sui social non vengono rimossi dalle piattaforme, solo la copia interna.
              </div>
            </div>
            <div className="p-5 border-t flex gap-3">
              <button onClick={() => setBulkDeleteOpen(false)} disabled={bulkDeleting} className="btn-secondary flex-1 justify-center">
                Annulla
              </button>
              <button
                onClick={bulkDelete}
                disabled={bulkDeleting}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-lg text-sm flex items-center justify-center gap-2"
              >
                {bulkDeleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {bulkDeleting ? 'Elimino...' : `Elimina ${selectedIds.size}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
