'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import type { Setting } from '@/lib/types'
import { Save, RefreshCw, KeyRound, Check } from 'lucide-react'
import { demoSettings } from '@/lib/demo-data'

import { isDemo } from '@/lib/demo'

// Key gestite con card dedicata (secret mascherato), escluse dalla lista generica.
const SECRET_KEYS = new Set(['blotato_api_key'])

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([])
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState<string | null>(null)
  const [saved, setSaved]       = useState<string | null>(null)
  const [blotatoKey, setBlotatoKey] = useState('')
  const [savingBlotato, setSavingBlotato] = useState(false)
  const [savedBlotato, setSavedBlotato] = useState(false)
  const demo = isDemo()

  useEffect(() => {
    if (demo) {
      setSettings(demoSettings)
      setLoading(false)
      return
    }
    fetch('/api/data/settings')
      .then(res => res.json())
      .then(data => {
        const arr = (data ?? []) as Setting[]
        setSettings(arr)
        const bk = arr.find(s => s.chiave === 'blotato_api_key')?.valore || ''
        setBlotatoKey(bk)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [demo])

  async function saveBlotatoKey() {
    setSavingBlotato(true)
    setSavedBlotato(false)
    try {
      if (!demo) {
        await fetch('/api/data/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chiave: 'blotato_api_key', valore: blotatoKey.trim(), descrizione: 'API key Blotato del cliente (pubblicazione social)' }),
        })
      }
      setSavedBlotato(true)
      setTimeout(() => setSavedBlotato(false), 2500)
    } finally {
      setSavingBlotato(false)
    }
  }

  async function updateSetting(s: Setting, newVal: string) {
    setSaving(s.id)
    if (!demo) {
      await fetch('/api/data/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: s.id, valore: newVal })
      })
    }
    setSettings(prev => prev.map(x => x.id === s.id ? { ...x, valore: newVal } : x))
    setSaved(s.id)
    setTimeout(() => setSaved(null), 2000)
    setSaving(null)
  }

  const boolKeys = ['automation_enabled','dry_run','telegram_notifications','backup_enabled','approval_required','media_validation_required','stock_check_required']

  // Nomi leggibili + descrizione dei toggle (le chiavi tecniche confondono).
  const KEY_LABEL: Record<string, string> = {
    dry_run: 'Modalità pubblicazione',
    automation_enabled: 'Automazione',
    telegram_notifications: 'Notifiche Telegram',
    backup_enabled: 'Backup automatico',
    approval_required: 'Approvazione obbligatoria',
    media_validation_required: 'Validazione media',
    stock_check_required: 'Controllo stock',
  }
  // dry_run è invertito: TRUE = prova (non pubblica), FALSE = pubblica davvero.
  // Mostriamo REAL/DEMO come stato esplicito così non si sbaglia mai.
  function dryRunBadge(val: string) {
    const isDryRun = val.toUpperCase() === 'TRUE'
    return isDryRun
      ? { text: 'DEMO', cls: 'bg-amber-100 text-amber-700', hint: 'Prova: i post NON vengono pubblicati' }
      : { text: 'REAL', cls: 'bg-green-100 text-green-700', hint: 'Live: i post vengono pubblicati sui social' }
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Impostazioni</h1>
        <p className="text-xs md:text-sm text-gray-500 mt-0.5">Configurazione automazione</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
        </div>
      ) : (
        <div className="max-w-2xl space-y-3">
          {/* Blotato API key — per-cliente (ogni cliente il suo account Blotato) */}
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-1">
              <KeyRound className="w-4 h-4 text-gray-500" />
              <p className="text-sm font-medium text-gray-900">Blotato API Key (di questo cliente)</p>
            </div>
            <p className="text-xs text-gray-400 mb-2">Key del cliente attivo per pubblicare sui suoi social. Se vuota, si usa la key globale dell&apos;agenzia (se impostata). La key resta privata.</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="password"
                value={blotatoKey}
                onChange={e => setBlotatoKey(e.target.value)}
                placeholder="Incolla la API key Blotato del cliente"
                className="input flex-1 font-mono text-sm"
                autoComplete="off"
              />
              <button onClick={saveBlotatoKey} disabled={savingBlotato} className="btn-primary py-2 px-4 justify-center whitespace-nowrap">
                {savingBlotato ? <RefreshCw className="w-4 h-4 animate-spin" /> : savedBlotato ? <><Check className="w-4 h-4" /> Salvata</> : 'Salva key'}
              </button>
            </div>
          </div>

          {settings.filter(s => !SECRET_KEYS.has(s.chiave)).map(s => {
            const isDry = s.chiave === 'dry_run'
            // dry_run invertito: lo switch acceso (blu) = REAL/pubblica; il valore TRUE = DEMO.
            // Quindi lo stato "acceso" dello switch corrisponde a valore FALSE.
            const toggleOn = isDry ? s.valore.toUpperCase() === 'FALSE' : s.valore.toUpperCase() === 'TRUE'
            const nextVal = isDry
              ? (s.valore.toUpperCase() === 'FALSE' ? 'TRUE' : 'FALSE')
              : (s.valore.toUpperCase() === 'TRUE' ? 'FALSE' : 'TRUE')
            const badge = isDry ? dryRunBadge(s.valore) : null
            return (
            <div key={s.id} className="card p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{KEY_LABEL[s.chiave] || s.chiave}</p>
                <p className="text-xs text-gray-400 mt-0.5">{badge ? badge.hint : s.descrizione}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {badge && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.text}</span>
                )}
                {boolKeys.includes(s.chiave) ? (
                  <button
                    onClick={() => updateSetting(s, nextVal)}
                    disabled={saving === s.id}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      toggleOn ? (isDry ? 'bg-green-600' : 'bg-brand-600') : 'bg-gray-200'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      toggleOn ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      defaultValue={s.valore}
                      onBlur={e => {
                        if (e.target.value !== s.valore) updateSetting(s, e.target.value)
                      }}
                      className="input w-40 text-right"
                    />
                    {saving === s.id && <RefreshCw className="w-4 h-4 text-gray-400 animate-spin" />}
                    {saved === s.id && <Save className="w-4 h-4 text-green-500" />}
                  </div>
                )}
                {boolKeys.includes(s.chiave) && saved === s.id && (
                  <Save className="w-4 h-4 text-green-500" />
                )}
              </div>
            </div>
            )
          })}
        </div>
      )}

      {/* Sezione pericolosa */}
      <div className="max-w-2xl mt-10">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Zone pericolose</h2>
        <div className="card border-red-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Automation enabled</p>
              <p className="text-xs text-gray-400">Se disabilitato, NESSUN post viene pubblicato</p>
            </div>
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${
              settings.find(s => s.chiave === 'automation_enabled')?.valore?.toUpperCase() === 'TRUE'
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}>
              {settings.find(s => s.chiave === 'automation_enabled')?.valore?.toUpperCase() === 'TRUE' ? 'ATTIVA' : 'SPENTA'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
