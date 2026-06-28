'use client'
import { useEffect, useState, useRef } from 'react'
import { Sparkles, Check, ChevronDown, Key, Zap, AlertCircle, Search, ThumbsUp } from 'lucide-react'

type Model = {
  id: string
  name: string
  provider: 'anthropic' | 'openrouter' | 'gemini' | 'opencode'
  tier: 'default' | 'free' | 'paid'
  context: string
  speed: 'fast' | 'medium' | 'slow'
  quality: 'top' | 'high' | 'medium'
  badge?: string
  recommendedFor?: string[]
}

type Task =
  | 'contenuti-social'
  | 'piano-editoriale'
  | 'seo-audit'
  | 'blog-articolo'

const TASK_LABELS: Record<Task, string> = {
  'contenuti-social': 'Contenuti Social',
  'piano-editoriale': 'Piano Editoriale',
  'seo-audit': 'SEO Audit',
  'blog-articolo': 'Blog SEO',
}

const TASK_RECOMMENDED: Record<Task, string> = {
  'contenuti-social': 'nvidia/nemotron-3-super-120b-a12b:free',
  'piano-editoriale': 'meta-llama/llama-3.3-70b-instruct:free',
  'seo-audit': 'meta-llama/llama-3.3-70b-instruct:free',
  'blog-articolo': 'meta-llama/llama-3.3-70b-instruct:free',
}

const MODELS: Model[] = [
  // Anthropic Premium
  { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', provider: 'anthropic', tier: 'default', context: '200K', speed: 'fast',   quality: 'top',  badge: 'Default',        recommendedFor: ['seo-audit', 'blog-articolo', 'piano-editoriale'] },
  { id: 'claude-opus-4-7',   name: 'Claude Opus 4.7',   provider: 'anthropic', tier: 'default', context: '200K', speed: 'medium', quality: 'top',  badge: 'Premium',        recommendedFor: ['blog-articolo', 'seo-audit'] },
  { id: 'claude-haiku-4-5',  name: 'Claude Haiku 4.5',  provider: 'anthropic', tier: 'default', context: '200K', speed: 'fast',   quality: 'high', badge: 'Veloce',         recommendedFor: ['contenuti-social'] },

  // OpenRouter Free
  { id: 'nvidia/nemotron-3-super-120b-a12b:free',  name: 'NVIDIA Nemotron 3 Super 120B', provider: 'openrouter', tier: 'free', context: '128K', speed: 'fast',   quality: 'top',  badge: 'Marketing',      recommendedFor: ['contenuti-social'] },
  { id: 'nvidia/nemotron-3-ultra-550b-a55b:free',   name: 'NVIDIA Nemotron 3 Ultra',       provider: 'openrouter', tier: 'free', context: '1M',   speed: 'slow',   quality: 'top',  badge: '1M contesto · lento' },
  { id: 'nvidia/nemotron-3.5-content-safety:free',  name: 'NVIDIA Nemotron 3.5 Safety',    provider: 'openrouter', tier: 'free', context: '131K', speed: 'fast',   quality: 'high', badge: 'Content Safety', recommendedFor: ['contenuti-social'] },
  { id: 'openrouter/free',                          name: 'OpenRouter Free Router',        provider: 'openrouter', tier: 'free', context: '200K', speed: 'fast',   quality: 'high', badge: 'Auto' },
  { id: 'openai/gpt-oss-120b:free',                 name: 'OpenAI gpt-oss-120b',           provider: 'openrouter', tier: 'free', context: '131K', speed: 'medium', quality: 'high' },
  { id: 'openai/gpt-oss-20b:free',                  name: 'OpenAI gpt-oss-20b',            provider: 'openrouter', tier: 'free', context: '131K', speed: 'fast',   quality: 'medium' },
  { id: 'google/gemma-4-31b-it:free',               name: 'Google Gemma 4 31B',            provider: 'openrouter', tier: 'free', context: '262K', speed: 'fast',   quality: 'high' },
  { id: 'google/gemma-4-26b-a4b-it:free',           name: 'Google Gemma 4 26B',            provider: 'openrouter', tier: 'free', context: '262K', speed: 'fast',   quality: 'high' },
  { id: 'qwen/qwen3-next-80b-a3b-instruct:free',    name: 'Qwen3 Next 80B',                provider: 'openrouter', tier: 'free', context: '262K', speed: 'medium', quality: 'high' },
  { id: 'meta-llama/llama-3.3-70b-instruct:free',   name: 'Llama 3.3 70B',                 provider: 'openrouter', tier: 'free', context: '128K', speed: 'fast',   quality: 'high', badge: 'Consigliato',    recommendedFor: ['piano-editoriale', 'seo-audit', 'blog-articolo', 'contenuti-social'] },
  { id: 'nousresearch/hermes-3-llama-3.1-405b:free', name: 'Hermes 3 405B',                provider: 'openrouter', tier: 'free', context: '131K', speed: 'medium', quality: 'top',  badge: '405B' },

  // OpenRouter A PAGAMENTO (richiede credito sull'account): NIENTE code/429,
  // capacità dedicata. Costo irrisorio (~0,001€/post). Servono con la key OpenRouter.
  { id: 'meta-llama/llama-3.3-70b-instruct',  name: 'Llama 3.3 70B (paid)', provider: 'openrouter', tier: 'paid', context: '131K', speed: 'fast',   quality: 'high', badge: '★ Affidabile · ~0,001€', recommendedFor: ['contenuti-social', 'piano-editoriale', 'seo-audit', 'blog-articolo'] },
  { id: 'google/gemini-2.5-flash-lite',       name: 'Gemini 2.5 Flash Lite', provider: 'openrouter', tier: 'paid', context: '1M', speed: 'fast', quality: 'high', badge: 'Google · economico' },
  { id: 'google/gemini-2.5-flash',            name: 'Gemini 2.5 Flash',      provider: 'openrouter', tier: 'paid', context: '1M', speed: 'fast', quality: 'top',  badge: 'Google' },
  { id: 'openai/gpt-4o-mini',                 name: 'GPT-4o mini',          provider: 'openrouter', tier: 'paid', context: '128K', speed: 'fast',   quality: 'high', badge: 'OpenAI · affidabile' },
  { id: 'deepseek/deepseek-chat',             name: 'DeepSeek Chat',        provider: 'openrouter', tier: 'paid', context: '131K', speed: 'medium', quality: 'top',  badge: 'Economico' },

  // Google Gemini (free tier, key gratuita su aistudio.google.com)
  { id: 'gemini-2.0-flash',       name: 'Gemini 2.0 Flash',      provider: 'gemini', tier: 'free', context: '1M',   speed: 'fast',   quality: 'high', badge: 'Google · Free', recommendedFor: ['contenuti-social', 'piano-editoriale', 'seo-audit', 'blog-articolo'] },
  { id: 'gemini-2.0-flash-lite',  name: 'Gemini 2.0 Flash Lite', provider: 'gemini', tier: 'free', context: '1M',   speed: 'fast',   quality: 'medium', badge: 'Google · Veloce' },
  { id: 'gemini-1.5-flash',       name: 'Gemini 1.5 Flash',      provider: 'gemini', tier: 'free', context: '1M',   speed: 'fast',   quality: 'high', badge: 'Google' },

  // OpenCode Zen/Go (gateway, key sk- su opencode.ai/auth). RICHIEDE account a pagamento/credito.
  { id: 'opencode/deepseek-v4-flash-free', name: 'DeepSeek V4 Flash',  provider: 'opencode', tier: 'paid', context: '1M',   speed: 'fast',   quality: 'high', badge: 'OpenCode · a pagamento' },
  { id: 'opencode/nemotron-3-ultra-free',  name: 'Nemotron 3 Ultra',   provider: 'opencode', tier: 'paid', context: '1M',   speed: 'medium', quality: 'top',  badge: 'OpenCode · a pagamento' },
  { id: 'opencode/deepseek-v4-pro',        name: 'DeepSeek V4 Pro',    provider: 'opencode', tier: 'paid', context: '1M',   speed: 'medium', quality: 'top',  badge: 'OpenCode' },
  { id: 'opencode/glm-5.2',                name: 'GLM-5.2',            provider: 'opencode', tier: 'paid', context: '1M',   speed: 'fast',   quality: 'top',  badge: 'OpenCode' },
  { id: 'opencode/kimi-k2.6',              name: 'Kimi K2.6',          provider: 'opencode', tier: 'paid', context: '256K', speed: 'fast',   quality: 'top',  badge: 'OpenCode' },
]

const QUALITY_DOT: Record<string, string> = {
  top:    'bg-violet-500',
  high:   'bg-blue-500',
  medium: 'bg-gray-400',
}

export default function AIModelSelector({ task }: { task?: Task }) {
  const [open, setOpen] = useState(false)
  const [selectedId, setSelectedId] = useState('meta-llama/llama-3.3-70b-instruct:free')
  const [showKeyInput, setShowKeyInput] = useState(false)
  const [orKey, setOrKey] = useState('')
  const [savedKey, setSavedKey] = useState('')
  const [showGemInput, setShowGemInput] = useState(false)
  const [gemKey, setGemKey] = useState('')
  const [savedGemKey, setSavedGemKey] = useState('')
  const [showOpcInput, setShowOpcInput] = useState(false)
  const [opcKey, setOpcKey] = useState('')
  const [savedOpcKey, setSavedOpcKey] = useState('')
  const [search, setSearch] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    setSelectedId(localStorage.getItem('ai_model') || (task ? TASK_RECOMMENDED[task] : 'meta-llama/llama-3.3-70b-instruct:free'))
    const key = localStorage.getItem('openrouter_key') || ''
    setSavedKey(key)
    setOrKey(key)
    const gk = localStorage.getItem('gemini_key') || ''
    setSavedGemKey(gk)
    setGemKey(gk)
    const ok = localStorage.getItem('opencode_key') || ''
    setSavedOpcKey(ok)
    setOpcKey(ok)
  }, [task])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const selected = MODELS.find(m => m.id === selectedId) ?? MODELS[0]

  function selectModel(id: string) {
    setSelectedId(id)
    localStorage.setItem('ai_model', id)
    setOpen(false)
    setSearch('')
  }

  function saveKey() {
    localStorage.setItem('openrouter_key', orKey.trim())
    setSavedKey(orKey.trim())
    setShowKeyInput(false)
  }

  function saveGemKey() {
    localStorage.setItem('gemini_key', gemKey.trim())
    setSavedGemKey(gemKey.trim())
    setShowGemInput(false)
  }

  function saveOpcKey() {
    localStorage.setItem('opencode_key', opcKey.trim())
    setSavedOpcKey(opcKey.trim())
    setShowOpcInput(false)
  }

  function removeKey() {
    localStorage.removeItem('openrouter_key')
    setOrKey(''); setSavedKey(''); setShowKeyInput(false)
  }
  function removeGemKey() {
    localStorage.removeItem('gemini_key')
    setGemKey(''); setSavedGemKey(''); setShowGemInput(false)
  }
  function removeOpcKey() {
    localStorage.removeItem('opencode_key')
    setOpcKey(''); setSavedOpcKey(''); setShowOpcInput(false)
  }

  const filtered = MODELS.filter(m =>
    !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.id.toLowerCase().includes(search.toLowerCase())
  )
  const anthropicModels = filtered.filter(m => m.provider === 'anthropic')
  const geminiModels = filtered.filter(m => m.provider === 'gemini')
  const opencodeModels = filtered.filter(m => m.provider === 'opencode')
  const freeModels = filtered.filter(m => m.provider === 'openrouter' && m.tier === 'free')
  const paidOpenRouterModels = filtered.filter(m => m.provider === 'openrouter' && m.tier === 'paid')
  const needsOrKey = selected.provider === 'openrouter' && !savedKey
  const needsGemKey = selected.provider === 'gemini' && !savedGemKey
  const needsOpcKey = selected.provider === 'opencode' && !savedOpcKey

  const recommendedId = task ? TASK_RECOMMENDED[task] : null
  const isOnRecommended = recommendedId === selectedId

  const taskModels = task
    ? MODELS.filter(m => m.recommendedFor?.includes(task)).slice(0, 3)
    : []

  return (
    <div className="card p-4 md:p-5 mb-6 bg-gradient-to-br from-white to-gray-50 border-gray-100 overflow-visible">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
            selected.provider === 'anthropic' ? 'bg-gradient-to-br from-violet-500 to-purple-600'
              : selected.provider === 'gemini' ? 'bg-gradient-to-br from-blue-500 to-indigo-600'
              : selected.provider === 'opencode' ? 'bg-gradient-to-br from-orange-500 to-amber-600'
              : 'bg-gradient-to-br from-emerald-500 to-teal-600'
          }`}>
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Modello AI</p>
              {selected.badge && (
                <span className="text-[10px] px-1.5 py-0.5 bg-brand-100 text-brand-700 rounded-full font-medium">{selected.badge}</span>
              )}
              {selected.tier === 'free' && (
                <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">FREE</span>
              )}
              {isOnRecommended && (
                <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium flex items-center gap-1">
                  <ThumbsUp className="w-3 h-3" /> Consigliato
                </span>
              )}
            </div>
            <p className="font-semibold text-gray-900 truncate">{selected.name}</p>
            <p className="text-xs text-gray-500 mt-0.5 truncate">
              {selected.provider === 'anthropic' ? 'Anthropic' : selected.provider === 'gemini' ? 'Google Gemini' : selected.provider === 'opencode' ? 'OpenCode' : 'OpenRouter'} · {selected.context} · {selected.speed} · {selected.quality}
            </p>
          </div>
        </div>

        <div className="flex items-stretch sm:items-center gap-2 flex-shrink-0 flex-col sm:flex-row md:flex-nowrap w-full md:w-auto">
          {!savedKey ? (
            <button onClick={() => setShowKeyInput(s => !s)} className="btn-secondary text-xs py-2 px-3 justify-center">
              <Key className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">OpenRouter</span>
            </button>
          ) : (
            <button onClick={() => setShowKeyInput(s => !s)} title="Cambia o rimuovi key OpenRouter" className="text-xs text-green-700 bg-green-50 px-2.5 py-1 rounded-full font-medium flex items-center gap-1 hover:bg-green-100">
              <Check className="w-3 h-3" /> OpenRouter <span className="text-green-500">· modifica</span>
            </button>
          )}

          {!savedGemKey ? (
            <button onClick={() => setShowGemInput(s => !s)} className="btn-secondary text-xs py-2 px-3 justify-center">
              <Key className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Gemini</span>
            </button>
          ) : (
            <button onClick={() => setShowGemInput(s => !s)} title="Cambia o rimuovi key Gemini" className="text-xs text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full font-medium flex items-center gap-1 hover:bg-blue-100">
              <Check className="w-3 h-3" /> Gemini <span className="text-blue-400">· modifica</span>
            </button>
          )}

          {!savedOpcKey ? (
            <button onClick={() => setShowOpcInput(s => !s)} className="btn-secondary text-xs py-2 px-3 justify-center">
              <Key className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">OpenCode</span>
            </button>
          ) : (
            <button onClick={() => setShowOpcInput(s => !s)} title="Cambia o rimuovi key OpenCode" className="text-xs text-orange-700 bg-orange-50 px-2.5 py-1 rounded-full font-medium flex items-center gap-1 hover:bg-orange-100">
              <Check className="w-3 h-3" /> OpenCode <span className="text-orange-400">· modifica</span>
            </button>
          )}

          <div className="relative max-w-full w-full sm:w-auto" ref={dropdownRef}>
            <button
              onClick={() => setOpen(o => !o)}
              className="btn-primary text-xs py-2 px-3 min-w-0 sm:min-w-[140px] justify-between w-full sm:w-auto"
            >
              <span className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                Cambia modello
              </span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
              <div className="fixed left-3 right-3 top-24 max-h-[calc(100vh-7rem)] sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[360px] sm:max-w-[360px] bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
                <div className="p-2 border-b border-gray-100">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text" value={search} onChange={e => setSearch(e.target.value)}
                      placeholder="Cerca modello..." autoFocus
                      className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </div>
                </div>

                <div className="max-h-[calc(100vh-12rem)] sm:max-h-[460px] overflow-y-auto overscroll-contain">
                  {/* Task recommendation banner */}
                  {task && taskModels.length > 0 && !search && (
                    <div className="px-3 py-2.5 border-b border-gray-100">
                      <p className="text-[10px] uppercase tracking-wide text-amber-700 font-bold mb-2">
                        Consigliati per {TASK_LABELS[task]}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {taskModels.map(m => (
                          <button
                            key={m.id}
                            onClick={() => selectModel(m.id)}
                            className={`text-[10px] px-2.5 py-1.5 rounded-lg border font-medium transition-colors text-left ${
                              m.id === selectedId
                                ? 'border-brand-500 bg-brand-50 text-brand-700'
                                : m.id === recommendedId
                                ? 'border-amber-300 bg-amber-50 text-amber-800 hover:border-amber-400'
                                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                            }`}
                          >
                            <span className="block font-semibold">{m.name}</span>
                            <span className="block text-[9px] text-gray-400">{m.context} · {m.speed} · {m.quality}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {anthropicModels.length > 0 && (
                    <>
                      <div className="px-3 py-2 bg-gray-50 sticky top-0 z-10">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-violet-700">Anthropic · Premium</p>
                      </div>
                      {anthropicModels.map(m => (
                        <ModelOption
                          key={m.id} m={m} selected={m.id === selectedId}
                          recommended={m.id === recommendedId}
                          onClick={() => selectModel(m.id)}
                        />
                      ))}
                    </>
                  )}
                  {geminiModels.length > 0 && (
                    <>
                      <div className="px-3 py-2 bg-gray-50 sticky top-0 z-10 flex items-center gap-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Google Gemini · Gratis</p>
                        <span className="text-[9px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full font-bold tracking-normal">free key</span>
                      </div>
                      {geminiModels.map(m => (
                        <ModelOption
                          key={m.id} m={m} selected={m.id === selectedId}
                          recommended={m.id === recommendedId}
                          onClick={() => selectModel(m.id)}
                        />
                      ))}
                    </>
                  )}
                  {opencodeModels.length > 0 && (
                    <>
                      <div className="px-3 py-2 bg-gray-50 sticky top-0 z-10 flex items-center gap-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-orange-700">OpenCode Zen/Go</p>
                        <span className="text-[9px] px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded-full font-bold tracking-normal">a pagamento</span>
                      </div>
                      {opencodeModels.map(m => (
                        <ModelOption
                          key={m.id} m={m} selected={m.id === selectedId}
                          recommended={m.id === recommendedId}
                          onClick={() => selectModel(m.id)}
                        />
                      ))}
                    </>
                  )}
                  {paidOpenRouterModels.length > 0 && (
                    <>
                      <div className="px-3 py-2 bg-emerald-50 sticky top-0 z-10 flex items-center gap-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">OpenRouter · a pagamento</p>
                        <span className="text-[9px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-bold tracking-normal">no code · serve credito</span>
                      </div>
                      {paidOpenRouterModels.map(m => (
                        <ModelOption
                          key={m.id} m={m} selected={m.id === selectedId}
                          recommended={m.id === recommendedId}
                          onClick={() => selectModel(m.id)}
                        />
                      ))}
                    </>
                  )}
                  {freeModels.length > 0 && (
                    <>
                      <div className="px-3 py-2 bg-gray-50 sticky top-0 z-10 flex items-center gap-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-green-700">OpenRouter · Gratis</p>
                        <span className="text-[9px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full font-bold tracking-normal">{freeModels.length} modelli</span>
                      </div>
                      {freeModels.map(m => (
                        <ModelOption
                          key={m.id} m={m} selected={m.id === selectedId}
                          recommended={m.id === recommendedId}
                          onClick={() => selectModel(m.id)}
                        />
                      ))}
                    </>
                  )}
                  {filtered.length === 0 && (
                    <div className="p-6 text-center text-xs text-gray-400">Nessun modello trovato per &ldquo;{search}&rdquo;</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {needsOrKey && (
        <div className="mt-3 flex items-start gap-2 text-xs bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-amber-900">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>Modello OpenRouter selezionato — aggiungi API key per usarlo</span>
        </div>
      )}

      {needsGemKey && (
        <div className="mt-3 flex items-start gap-2 text-xs bg-blue-50 border border-blue-200 rounded-lg p-2.5 text-blue-900">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>Modello Gemini selezionato — aggiungi la API key Google (gratis) per usarlo</span>
        </div>
      )}

      {needsOpcKey && (
        <div className="mt-3 flex items-start gap-2 text-xs bg-orange-50 border border-orange-200 rounded-lg p-2.5 text-orange-900">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>Modello OpenCode selezionato — aggiungi la API key OpenCode (sk-...) per usarlo</span>
        </div>
      )}

      {showKeyInput && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <label className="label">OpenRouter API Key</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input type="password" value={orKey} onChange={e => setOrKey(e.target.value)} placeholder="sk-or-v1-..." className="input flex-1" />
            <button onClick={saveKey} className="btn-primary text-xs justify-center">Salva</button>
            {savedKey && <button onClick={removeKey} className="btn-secondary text-xs justify-center text-red-600">Rimuovi</button>}
          </div>
          <p className="text-[10px] text-gray-400 mt-1.5">
            Crea key gratis su <a href="https://openrouter.ai/keys" target="_blank" rel="noopener" className="text-brand-600 hover:underline">openrouter.ai/keys</a>
          </p>
        </div>
      )}

      {showGemInput && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <label className="label">Google Gemini API Key</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input type="password" value={gemKey} onChange={e => setGemKey(e.target.value)} placeholder="AIza..." className="input flex-1" />
            <button onClick={saveGemKey} className="btn-primary text-xs justify-center">Salva</button>
            {savedGemKey && <button onClick={removeGemKey} className="btn-secondary text-xs justify-center text-red-600">Rimuovi</button>}
          </div>
          <p className="text-[10px] text-gray-400 mt-1.5">
            Crea key gratis su <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener" className="text-brand-600 hover:underline">aistudio.google.com/apikey</a>
          </p>
        </div>
      )}

      {showOpcInput && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <label className="label">OpenCode API Key</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input type="password" value={opcKey} onChange={e => setOpcKey(e.target.value)} placeholder="sk-..." className="input flex-1" />
            <button onClick={saveOpcKey} className="btn-primary text-xs justify-center">Salva</button>
            {savedOpcKey && <button onClick={removeOpcKey} className="btn-secondary text-xs justify-center text-red-600">Rimuovi</button>}
          </div>
          <p className="text-[10px] text-gray-400 mt-1.5">
            <a href="https://opencode.ai/auth" target="_blank" rel="noopener" className="text-brand-600 hover:underline">opencode.ai/auth</a> (Zen/Go) — richiede account a pagamento/credito. Per gratis affidabile usa Gemini.
          </p>
        </div>
      )}
    </div>
  )
}

function ModelOption({ m, selected, recommended, onClick }: { m: Model; selected: boolean; recommended: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full px-3 py-2.5 text-left hover:bg-gray-50 transition-colors flex items-center gap-2.5 ${
        selected ? 'bg-brand-50' : recommended ? 'bg-amber-50/50' : ''
      }`}
    >
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${QUALITY_DOT[m.quality]}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-semibold text-gray-900 truncate">{m.name}</p>
          {m.badge && (
            <span className="text-[9px] px-1 py-0.5 bg-brand-100 text-brand-700 rounded-full font-medium flex-shrink-0">{m.badge}</span>
          )}
          {recommended && (
            <ThumbsUp className="w-3 h-3 text-amber-500 flex-shrink-0" />
          )}
        </div>
        <p className="text-[10px] text-gray-400 truncate">
          {m.context} · {m.speed} · qualità {m.quality}
          {m.recommendedFor?.length ? ` · ${m.recommendedFor.map(t => TASK_LABELS[t as Task] || t).join(', ')}` : ''}
        </p>
      </div>
      {selected && <Check className="w-4 h-4 text-brand-600 flex-shrink-0" />}
    </button>
  )
}
