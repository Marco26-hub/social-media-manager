'use client'
import { useEffect, useState } from 'react'
import { Sparkles, Check, ChevronDown, Key, Zap, AlertCircle } from 'lucide-react'

type Model = {
  id: string
  name: string
  provider: 'anthropic' | 'openrouter'
  tier: 'default' | 'free' | 'paid'
  context: string
  speed: 'fast' | 'medium' | 'slow'
  quality: 'top' | 'high' | 'medium'
  badge?: string
}

const MODELS: Model[] = [
  // Default — Claude
  { id: 'claude-sonnet-4-6',           name: 'Claude Sonnet 4.6',           provider: 'anthropic',  tier: 'default', context: '200K', speed: 'fast',   quality: 'top',    badge: 'Tuo default' },
  { id: 'claude-opus-4-7',             name: 'Claude Opus 4.7',             provider: 'anthropic',  tier: 'default', context: '200K', speed: 'medium', quality: 'top',    badge: 'Premium' },
  { id: 'claude-haiku-4-5',            name: 'Claude Haiku 4.5',            provider: 'anthropic',  tier: 'default', context: '200K', speed: 'fast',   quality: 'high',   badge: 'Veloce' },

  // OpenRouter Free — top usage attuale
  { id: 'nvidia/nemotron-3-super:free',       name: 'NVIDIA Nemotron 3 Super', provider: 'openrouter', tier: 'free', context: '1M',   speed: 'medium', quality: 'top',    badge: 'Consigliato free' },
  { id: 'deepseek/deepseek-v4-flash:free',    name: 'DeepSeek V4 Flash',       provider: 'openrouter', tier: 'free', context: '1M',   speed: 'fast',   quality: 'high' },
  { id: 'openai/gpt-oss-120b:free',           name: 'OpenAI gpt-oss-120b',     provider: 'openrouter', tier: 'free', context: '131K', speed: 'medium', quality: 'high' },
  { id: 'z-ai/glm-4.5-air:free',              name: 'Z.ai GLM 4.5 Air',        provider: 'openrouter', tier: 'free', context: '131K', speed: 'fast',   quality: 'high' },
  { id: 'google/gemma-4-31b:free',            name: 'Google Gemma 4 31B',      provider: 'openrouter', tier: 'free', context: '262K', speed: 'fast',   quality: 'high' },
  { id: 'minimax/minimax-m2.5:free',          name: 'MiniMax M2.5',            provider: 'openrouter', tier: 'free', context: '204K', speed: 'medium', quality: 'high' },
]

const QUALITY_COLOR: Record<string, string> = {
  top:    'bg-violet-100 text-violet-700',
  high:   'bg-blue-100 text-blue-700',
  medium: 'bg-gray-100 text-gray-600',
}

export default function AIModelSelector() {
  const [open, setOpen] = useState(false)
  const [selectedId, setSelectedId] = useState('claude-sonnet-4-6')
  const [showKeyInput, setShowKeyInput] = useState(false)
  const [orKey, setOrKey] = useState('')
  const [savedKey, setSavedKey] = useState('')

  useEffect(() => {
    if (typeof window === 'undefined') return
    const saved = localStorage.getItem('ai_model') || 'claude-sonnet-4-6'
    const key = localStorage.getItem('openrouter_key') || ''
    setSelectedId(saved)
    setSavedKey(key)
    setOrKey(key)
  }, [])

  const selected = MODELS.find(m => m.id === selectedId) ?? MODELS[0]

  function selectModel(id: string) {
    setSelectedId(id)
    localStorage.setItem('ai_model', id)
    setOpen(false)
  }

  function saveKey() {
    localStorage.setItem('openrouter_key', orKey)
    setSavedKey(orKey)
    setShowKeyInput(false)
  }

  const needsOrKey = selected.provider === 'openrouter' && !savedKey

  return (
    <div className="card p-4 md:p-5 mb-6 bg-gradient-to-br from-white to-gray-50 border-gray-100">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Sinistra: modello attuale */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
            selected.provider === 'anthropic' ? 'bg-gradient-to-br from-violet-500 to-purple-600' : 'bg-gradient-to-br from-emerald-500 to-teal-600'
          }`}>
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Modello AI attivo</p>
              {selected.badge && (
                <span className="text-[10px] px-1.5 py-0.5 bg-brand-100 text-brand-700 rounded-full font-medium">{selected.badge}</span>
              )}
            </div>
            <p className="font-semibold text-gray-900 truncate">{selected.name}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {selected.provider === 'anthropic' ? 'Anthropic' : 'OpenRouter'} · {selected.context} context · qualità {selected.quality}
            </p>
          </div>
        </div>

        {/* Destra: bottoni */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {!savedKey && (
            <button
              onClick={() => setShowKeyInput(s => !s)}
              className="btn-secondary text-xs py-2 px-3"
            >
              <Key className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Aggiungi OpenRouter</span>
              <span className="md:hidden">OpenRouter</span>
            </button>
          )}
          {savedKey && (
            <span className="text-xs text-green-700 bg-green-50 px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
              <Check className="w-3 h-3" />
              OpenRouter
            </span>
          )}
          <button
            onClick={() => setOpen(o => !o)}
            className="btn-primary text-xs py-2 px-3"
          >
            <Zap className="w-3.5 h-3.5" />
            Cambia modello
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Warning OpenRouter key mancante */}
      {needsOrKey && (
        <div className="mt-3 flex items-start gap-2 text-xs bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-amber-900">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>Modello OpenRouter selezionato — aggiungi API key per usarlo</span>
        </div>
      )}

      {/* Input API key OpenRouter */}
      {showKeyInput && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <label className="label">OpenRouter API Key</label>
          <div className="flex gap-2">
            <input
              type="password"
              value={orKey}
              onChange={e => setOrKey(e.target.value)}
              placeholder="sk-or-v1-..."
              className="input flex-1"
            />
            <button onClick={saveKey} className="btn-primary text-xs">Salva</button>
          </div>
          <p className="text-[10px] text-gray-400 mt-1.5">
            Crea key su <a href="https://openrouter.ai/keys" target="_blank" rel="noopener" className="text-brand-600 hover:underline">openrouter.ai/keys</a> · usata solo lato client
          </p>
        </div>
      )}

      {/* Picker modelli */}
      {open && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          {/* Default Claude */}
          <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-2">Anthropic · default sistema</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
            {MODELS.filter(m => m.tier === 'default').map(m => (
              <ModelCard key={m.id} m={m} selected={m.id === selectedId} onClick={() => selectModel(m.id)} />
            ))}
          </div>

          {/* Free OpenRouter */}
          <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-2 flex items-center gap-2">
            OpenRouter · gratis
            <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full normal-case font-medium tracking-normal">FREE</span>
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {MODELS.filter(m => m.tier === 'free').map(m => (
              <ModelCard key={m.id} m={m} selected={m.id === selectedId} onClick={() => selectModel(m.id)} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ModelCard({ m, selected, onClick }: { m: Model; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`text-left p-3 rounded-lg border transition-all ${
        selected ? 'border-brand-500 bg-brand-50 shadow-sm' : 'border-gray-100 hover:border-gray-300 bg-white'
      }`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <p className="font-semibold text-sm text-gray-900 truncate">{m.name}</p>
        {selected && <Check className="w-4 h-4 text-brand-600 flex-shrink-0" />}
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${QUALITY_COLOR[m.quality]}`}>
          {m.quality}
        </span>
        <span className="text-[10px] text-gray-500">{m.context}</span>
        <span className="text-[10px] text-gray-400">· {m.speed}</span>
      </div>
    </button>
  )
}
