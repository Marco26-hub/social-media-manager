'use client'
import { useEffect, useState, useCallback } from 'react'
import { Globe, FileCode, FileText, FileJson, Copy, Upload, Undo2, Check, ExternalLink, Loader2, Printer } from 'lucide-react'
import { renderHtml, renderBodyHtml, renderMarkdown, renderJson, normalizeArticle, type BlogArticleData } from '@/lib/blog-render'

type Row = Record<string, unknown> & { id: string; slug: string; h1: string; status: string; url_pubblicato: string | null }

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); a.remove()
  URL.revokeObjectURL(url)
}

// PDF senza dipendenze: apre l'articolo stilizzato in una finestra e lancia la stampa
// del browser → l'utente sceglie "Salva come PDF". Ideale per invio al cliente/archivio.
function printPdf(a: BlogArticleData) {
  const w = window.open('', '_blank')
  if (!w) { alert('Consenti i popup per generare il PDF.'); return }
  const title = a.meta_title || a.h1 || 'Articolo'
  w.document.write(
    `<!doctype html><html lang="it"><head><meta charset="utf-8"><title>${title}</title>` +
    `<style>@page{margin:18mm} body{margin:0}</style></head><body>` +
    renderBodyHtml(a) +
    // Aspetta il rendering (immagine cover inclusa) prima di aprire la stampa.
    `<script>window.onload=function(){setTimeout(function(){window.print()},350)}<\/script>` +
    `</body></html>`,
  )
  w.document.close()
}

const STATUS_STYLE: Record<string, string> = {
  PUBBLICATO: 'bg-green-100 text-green-700',
  BOZZA: 'bg-gray-100 text-gray-600',
  DA_APPROVARE: 'bg-amber-100 text-amber-700',
  ARCHIVIATO: 'bg-gray-100 text-gray-400',
}

export default function BlogArticlesList({ reloadKey }: { reloadKey?: number }) {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/data/blog')
      const d = await r.json()
      setRows(Array.isArray(d.articoli) ? d.articoli : [])
    } catch { setRows([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load, reloadKey])

  async function publish(id: string, action: 'publish' | 'unpublish') {
    setBusy(id)
    try { await fetch('/api/data/blog', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action }) }); await load() }
    finally { setBusy(null) }
  }

  async function copyHtml(row: Row) {
    const html = renderHtml(normalizeArticle(row))
    try { await navigator.clipboard.writeText(html); setCopied(row.id); setTimeout(() => setCopied(null), 1500) } catch { /* ignore */ }
  }

  if (loading) return <div className="card p-5 text-sm text-gray-400 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Carico gli articoli…</div>
  if (rows.length === 0) return null

  return (
    <div className="card p-4 md:p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] uppercase tracking-wide text-gray-400 font-bold">I tuoi articoli ({rows.length})</p>
        <span className="text-[10px] text-gray-400">Pubblica sul sito o esporta per Shopify / CMS</span>
      </div>
      <div className="space-y-2">
        {rows.map(row => {
          const a = normalizeArticle(row)
          const published = row.status === 'PUBBLICATO'
          return (
            <div key={row.id} className="border border-gray-150 rounded-lg p-3">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{a.h1}</p>
                  <p className="text-[11px] text-gray-400 font-mono truncate">/blog/{a.slug}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_STYLE[row.status] || 'bg-gray-100 text-gray-600'}`}>{row.status}</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {published ? (
                  <button onClick={() => publish(row.id, 'unpublish')} disabled={busy === row.id} className="btn-secondary text-[11px] py-1 px-2 disabled:opacity-50">
                    {busy === row.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Undo2 className="w-3 h-3" />} Ritira
                  </button>
                ) : (
                  <button onClick={() => publish(row.id, 'publish')} disabled={busy === row.id} className="btn-primary text-[11px] py-1 px-2 disabled:opacity-50">
                    {busy === row.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />} Pubblica sul sito
                  </button>
                )}
                {published && (
                  <a href={`/blog/${a.slug}`} target="_blank" rel="noopener" className="btn-secondary text-[11px] py-1 px-2">
                    <ExternalLink className="w-3 h-3" /> Vedi
                  </a>
                )}
                <button onClick={() => download(`${a.slug}.html`, renderHtml(a), 'text/html')} className="btn-secondary text-[11px] py-1 px-2" title="HTML con JSON-LD per Shopify/CMS">
                  <FileCode className="w-3 h-3" /> HTML
                </button>
                <button onClick={() => printPdf(a)} className="btn-secondary text-[11px] py-1 px-2" title="Genera PDF (stampa browser → Salva come PDF) per invio al cliente/archivio">
                  <Printer className="w-3 h-3" /> PDF
                </button>
                <button onClick={() => download(`${a.slug}.md`, renderMarkdown(a), 'text/markdown')} className="btn-secondary text-[11px] py-1 px-2" title="Markdown per siti headless">
                  <FileText className="w-3 h-3" /> Markdown
                </button>
                <button onClick={() => download(`${a.slug}.json`, renderJson(a), 'application/json')} className="btn-secondary text-[11px] py-1 px-2" title="JSON strutturato — il più facile da caricare in un admin custom">
                  <FileJson className="w-3 h-3" /> JSON
                </button>
                <button onClick={() => copyHtml(row)} className="btn-secondary text-[11px] py-1 px-2">
                  {copied === row.id ? <><Check className="w-3 h-3 text-green-600" /> Copiato</> : <><Copy className="w-3 h-3" /> Copia HTML</>}
                </button>
              </div>
            </div>
          )
        })}
      </div>
      <p className="text-[10px] text-gray-400 mt-3 flex items-start gap-1">
        <Globe className="w-3 h-3 flex-shrink-0 mt-0.5" />
        &ldquo;Pubblica sul sito&rdquo; rende l&apos;articolo una pagina web live (con SEO + dati strutturati per Google e le AI). Per Shopify usa &ldquo;Esporta HTML&rdquo;.
      </p>
    </div>
  )
}
