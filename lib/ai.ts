const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'
const GEMINI_DEFAULT_MODEL = 'gemini-2.0-flash'
// OpenCode Zen/Go: gateway OpenAI-compatible (DeepSeek, GLM, Kimi, Qwen...).
const OPENCODE_API_URL = 'https://opencode.ai/zen/v1/chat/completions'
const OPENCODE_PREFIX = 'opencode/'
const OPENCODE_DEFAULT_MODEL = 'deepseek-v4-flash-free'

// Ordine: modelli veloci/affidabili prima. Il 550B (lento su free tier) è escluso
// dalla cascade per evitare timeout a catena. claude resta solo per Anthropic diretto.
const FALLBACK_MODELS = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'openai/gpt-oss-120b:free',
  'qwen/qwen3-next-80b-a3b-instruct:free',
  'google/gemma-4-31b-it:free',
  'claude-sonnet-4-6',
]

// Quanti fallback OpenRouter provare al massimo prima di arrendersi.
// Con timeout 30s/tentativo i 429 sono istantanei; solo le generazioni lente
// consumano tempo. Cap basso per restare sotto il timeout gateway (evita 502).
const MAX_OPENROUTER_FALLBACKS = 2

type AIAttempt = {
  provider: 'openrouter' | 'anthropic' | 'gemini' | 'opencode'
  model: string
  ok: boolean
  error?: string
}

function isAnthropicModel(model: string) {
  return model.startsWith('claude-')
}

// Modello Gemini "nativo" (Google AI), distinto da 'google/gemma-*' che è OpenRouter.
function isGeminiModel(model: string) {
  return /^gemini[-.]/i.test(model)
}

// Modello OpenCode Zen/Go, marcato col prefisso 'opencode/' nella UI.
function isOpenCodeModel(model: string) {
  return model.startsWith(OPENCODE_PREFIX)
}
function stripOpenCodePrefix(model: string) {
  return model.startsWith(OPENCODE_PREFIX) ? model.slice(OPENCODE_PREFIX.length) : model
}

function sanitizeAIError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || 'errore sconosciuto')
  return message
    .replace(/Bearer\s+[A-Za-z0-9._-]+/g, 'Bearer [redacted]')
    .replace(/sk-[A-Za-z0-9._-]{10,}/g, 'sk-[redacted]')
    .replace(/AIza[A-Za-z0-9._-]{10,}/g, 'AIza[redacted]')
    // Non esporre identificatori/utente del provider nel messaggio al client.
    .replace(/"?user_id"?\s*:\s*"[^"]*"/gi, '')
    .slice(0, 300)
}

function isRateLimit(message?: string) {
  return /\b429\b|rate.?limit/i.test(message || '')
}

// Estrae un motivo BREVE e sicuro da una risposta HTTP del provider, senza
// riversare il corpo JSON grezzo (che contiene user_id, metadata, ecc.).
function formatHttpError(status: number, body: string): string {
  if (status === 429) {
    // OpenRouter: retry_after_seconds. Gemini: retryDelay:"27s". OpenCode: vario.
    const m = body.match(/retry_after_seconds"?\s*:\s*"?(\d+)/i)
      || body.match(/retryDelay"?\s*:\s*"?(\d+)s/i)
      || body.match(/retry[- ]?after"?\s*:\s*"?(\d+)/i)
    return m ? `429 rate-limited (retry ${m[1]}s)` : '429 rate-limited'
  }
  let reason = ''
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string } | string }
    reason = typeof parsed.error === 'string' ? parsed.error : (parsed.error?.message || '')
  } catch {
    reason = body
  }
  return `${status} ${reason}`.trim().slice(0, 160)
}

function recordAttempt(attempts: AIAttempt[], attempt: AIAttempt) {
  attempts.push(attempt)
  if (!attempt.ok) {
    console.warn('[AI fallback]', `${attempt.provider}(${attempt.model}): ${attempt.error}`)
  } else if (attempts.length > 1) {
    console.warn('[AI fallback ok]', `${attempt.provider}(${attempt.model}) dopo ${attempts.length - 1} fallback`)
  }
}

function buildFailureMessage(attempts: AIAttempt[]) {
  if (!attempts.length) {
    return 'Nessun provider AI configurato. Aggiungi OPENROUTER_API_KEY o ANTHROPIC_API_KEY, oppure incolla una OpenRouter API Key nella pagina.'
  }

  // Se TUTTI i tentativi falliti sono per rate limit, dai un messaggio chiaro e
  // azionabile invece di riversare i dump grezzi dei provider.
  const failed = attempts.filter(a => !a.ok)
  if (failed.length && failed.every(a => isRateLimit(a.error))) {
    const retry = failed.map(a => a.error?.match(/retry (\d+)s/)?.[1]).find(Boolean)
    const wait = retry ? ` Riprova tra ~${retry}s` : ' Riprova tra qualche secondo'
    return `Modelli AI gratuiti temporaneamente sovraccarichi (rate limit).${wait}, oppure aggiungi una tua API key (OpenRouter/Anthropic) per saltare le code del piano gratuito.`
  }

  const summary = attempts
    .map((attempt, index) => `${index + 1}. ${attempt.provider}/${attempt.model}: ${attempt.ok ? 'ok' : attempt.error || 'errore'}`)
    .join(' | ')
  return `Generazione AI fallita dopo ${attempts.length} tentativo/i: ${summary}`
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Bridge affidabilità free tier: attesa massima prima del ritentativo, per
// restare sotto il timeout del client (95s). Usa il Retry-After più alto
// suggerito dai 429 (cap 28s); default 8s se i provider non lo indicano.
const MAX_RETRY_WAIT_MS = 28000
function rateLimitWaitMs(failures: AIAttempt[]): number {
  const secs = failures
    .map(a => Number(a.error?.match(/retry (\d+)s/)?.[1] || 0))
    .filter(n => n > 0)
  const max = secs.length ? Math.max(...secs) : 8
  return Math.min(max * 1000 + 500, MAX_RETRY_WAIT_MS)
}

async function tryOpenRouterModel(
  model: string,
  systemPrompt: string | undefined,
  userPrompt: string,
  key: string,
  maxTokens: number,
  attempts: AIAttempt[],
): Promise<string | null> {
  try {
    const res = await callOpenRouter(model, systemPrompt, userPrompt, key, maxTokens)
    if (!res.trim()) throw new Error('Risposta AI vuota')
    recordAttempt(attempts, { provider: 'openrouter', model, ok: true })
    return res
  } catch (e) {
    recordAttempt(attempts, { provider: 'openrouter', model, ok: false, error: sanitizeAIError(e) })
    return null
  }
}

async function tryGeminiModel(
  model: string,
  systemPrompt: string | undefined,
  userPrompt: string,
  key: string,
  maxTokens: number,
  attempts: AIAttempt[],
): Promise<string | null> {
  try {
    const res = await callGemini(model, systemPrompt, userPrompt, key, maxTokens)
    if (!res.trim()) throw new Error('Risposta AI vuota')
    recordAttempt(attempts, { provider: 'gemini', model, ok: true })
    return res
  } catch (e) {
    recordAttempt(attempts, { provider: 'gemini', model, ok: false, error: sanitizeAIError(e) })
    return null
  }
}

async function tryOpenCodeModel(
  model: string,
  systemPrompt: string | undefined,
  userPrompt: string,
  key: string,
  maxTokens: number,
  attempts: AIAttempt[],
): Promise<string | null> {
  try {
    const res = await callOpenCode(stripOpenCodePrefix(model), systemPrompt, userPrompt, key, maxTokens)
    if (!res.trim()) throw new Error('Risposta AI vuota')
    recordAttempt(attempts, { provider: 'opencode', model, ok: true })
    return res
  } catch (e) {
    recordAttempt(attempts, { provider: 'opencode', model, ok: false, error: sanitizeAIError(e) })
    return null
  }
}

export async function callAI(params: {
  model: string
  systemPrompt?: string
  userPrompt: string
  openrouterKey?: string
  geminiKey?: string
  opencodeKey?: string
  maxTokens?: number
  silentFallback?: boolean
}): Promise<string> {
  const { model, systemPrompt, userPrompt, maxTokens = 4000, silentFallback = true } = params
  // SICUREZZA: le chiavi BYO arrivano dal client (localStorage). Accettale solo se
  // hanno il formato atteso, altrimenti ignorale e usa quelle server.
  const byoKey = (params.openrouterKey || '').trim()
  const validByoKey = /^sk-or-v1-[A-Za-z0-9_-]{20,}$/.test(byoKey) ? byoKey : ''
  const orKey = (validByoKey || process.env.OPENROUTER_API_KEY || '').trim()
  const anthropicKey = (process.env.ANTHROPIC_API_KEY || '').trim()
  const byoGemini = (params.geminiKey || '').trim()
  const validGemini = /^[A-Za-z0-9_-]{20,}$/.test(byoGemini) ? byoGemini : ''
  const geminiKey = (validGemini || process.env.GEMINI_API_KEY || '').trim()
  const byoOpencode = (params.opencodeKey || '').trim()
  const validOpencode = /^sk-[A-Za-z0-9_-]{16,}$/.test(byoOpencode) ? byoOpencode : ''
  const opencodeKey = (validOpencode || process.env.OPENCODE_API_KEY || '').trim()

  const attempts: AIAttempt[] = []

  // I modelli Gemini/OpenCode/Anthropic non vanno su OpenRouter.
  const canUseRequestedOnOpenRouter = !isAnthropicModel(model) && !isGeminiModel(model) && !isOpenCodeModel(model)

  // Try 0a: Gemini come provider primario, se l'utente ha scelto un modello Gemini.
  if (geminiKey && isGeminiModel(model)) {
    const res = await tryGeminiModel(model, systemPrompt, userPrompt, geminiKey, maxTokens, attempts)
    if (res) return res
    // Free tier Gemini = 15 req/min: un 429 con finestra breve si libera in pochi
    // secondi. Attende il retryDelay (cap 18s, sotto il timeout client) e ritenta UNA volta.
    const lastGem = attempts.filter(a => a.provider === 'gemini').pop()
    if (lastGem && isRateLimit(lastGem.error)) {
      const waitMs = Math.min(rateLimitWaitMs([lastGem]), 8000)
      if (waitMs > 0) {
        console.warn('[AI bridge]', `Gemini rate-limited, attendo ${Math.round(waitMs / 1000)}s e ritento`)
        await sleep(waitMs)
        const retry = await tryGeminiModel(model, systemPrompt, userPrompt, geminiKey, maxTokens, attempts)
        if (retry) return retry
      }
    }
  }

  // Try 0b: OpenCode come provider primario, se l'utente ha scelto un modello opencode/*.
  if (opencodeKey && isOpenCodeModel(model)) {
    const res = await tryOpenCodeModel(model, systemPrompt, userPrompt, opencodeKey, maxTokens, attempts)
    if (res) return res
  }

  // Try 1: OpenRouter. Bridge affidabilità: prima ondata veloce sul modello
  // richiesto + fallback; se TUTTO è rate-limited, attende il Retry-After e
  // ritenta una volta (le code free upstream si liberano in ~20-30s). Questo
  // converte i 429 "retry shortly" in successi senza alcuna API key a pagamento.
  if (orKey) {
    const orModels: string[] = []
    if (canUseRequestedOnOpenRouter) orModels.push(model)
    if (silentFallback) {
      let n = 0
      for (const fb of FALLBACK_MODELS) {
        if (fb === model || isAnthropicModel(fb)) continue
        if (n >= MAX_OPENROUTER_FALLBACKS) break
        n++
        orModels.push(fb)
      }
    }

    // Ondata 1
    for (const m of orModels) {
      const res = await tryOpenRouterModel(m, systemPrompt, userPrompt, orKey, maxTokens, attempts)
      if (res) return res
    }

    // Ondata 2: attende il Retry-After e ritenta SOLO se OpenRouter è l'unica
    // opzione. Se c'è una key affidabile (Gemini/OpenCode/Anthropic), salta
    // l'attesa e passa direttamente a quella.
    const orFailures = attempts.filter(a => a.provider === 'openrouter' && !a.ok)
    if (!geminiKey && !opencodeKey && !anthropicKey && orModels.length && orFailures.length && orFailures.every(a => isRateLimit(a.error))) {
      const waitMs = rateLimitWaitMs(orFailures)
      if (waitMs > 0) {
        console.warn('[AI bridge]', `modelli free rate-limited, attendo ${Math.round(waitMs / 1000)}s e ritento`)
        await sleep(waitMs)
        const res = await tryOpenRouterModel(orModels[0], systemPrompt, userPrompt, orKey, maxTokens, attempts)
        if (res) return res
      }
    }
  }

  // Try 1.5: Gemini come fallback affidabile (free, no rate-limit aggressivo).
  // Salta se il modello è già stato tentato sopra (evita ritentativi identici).
  if (geminiKey && silentFallback) {
    const triedGemini = new Set(attempts.filter(a => a.provider === 'gemini').map(a => a.model))
    const fbModel = isGeminiModel(model) ? model : GEMINI_DEFAULT_MODEL
    if (!triedGemini.has(fbModel)) {
      const res = await tryGeminiModel(fbModel, systemPrompt, userPrompt, geminiKey, maxTokens, attempts)
      if (res) return res
    }
  }

  // Try 1.6: OpenCode come fallback affidabile (modello free DeepSeek V4 Flash).
  if (opencodeKey && silentFallback) {
    const triedOpencode = new Set(attempts.filter(a => a.provider === 'opencode').map(a => a.model))
    const fbModel = isOpenCodeModel(model) ? model : OPENCODE_PREFIX + OPENCODE_DEFAULT_MODEL
    if (!triedOpencode.has(fbModel)) {
      const res = await tryOpenCodeModel(fbModel, systemPrompt, userPrompt, opencodeKey, maxTokens, attempts)
      if (res) return res
    }
  }

  // Try 2: Anthropic direct
  if (anthropicKey && isAnthropicModel(model)) {
    try {
      const res = await callAnthropic(model, systemPrompt, userPrompt, anthropicKey, maxTokens)
      if (!res.trim()) throw new Error('Risposta AI vuota')
      recordAttempt(attempts, { provider: 'anthropic', model, ok: true })
      return res
    } catch (e) {
      recordAttempt(attempts, { provider: 'anthropic', model, ok: false, error: sanitizeAIError(e) })
    }
  } else if (anthropicKey && silentFallback) {
    // Try with Claude fallback on Anthropic
    try {
      const res = await callAnthropic('claude-sonnet-4-6', systemPrompt, userPrompt, anthropicKey, maxTokens)
      if (!res.trim()) throw new Error('Risposta AI vuota')
      recordAttempt(attempts, { provider: 'anthropic', model: 'claude-sonnet-4-6', ok: true })
      return res
    } catch (fallbackError) {
      recordAttempt(attempts, { provider: 'anthropic', model: 'claude-sonnet-4-6', ok: false, error: sanitizeAIError(fallbackError) })
    }
  }

  // Give up
  throw new Error(buildFailureMessage(attempts))
}

async function callOpenRouter(
  model: string,
  systemPrompt: string | undefined,
  userPrompt: string,
  key: string,
  maxTokens: number,
  timeout = 30000,
): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)

  const messages: { role: string; content: string }[] = []
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt })
  messages.push({ role: 'user', content: userPrompt })

  try {
    const res = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      },
      signal: controller.signal,
      body: JSON.stringify({ model, messages, max_tokens: maxTokens }),
    })
    if (!res.ok) throw new Error(formatHttpError(res.status, await res.text().catch(() => '')))
    const data = await res.json()
    return data.choices?.[0]?.message?.content || ''
  } finally {
    clearTimeout(timer)
  }
}

async function callAnthropic(
  model: string,
  systemPrompt: string | undefined,
  userPrompt: string,
  key: string,
  maxTokens: number,
  timeout = 30000,
): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)

  const messages: { role: string; content: string }[] = [
    { role: 'user', content: userPrompt },
  ]
  const body: Record<string, unknown> = { model, max_tokens: maxTokens, messages }
  if (systemPrompt) body.system = systemPrompt

  try {
    const res = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      signal: controller.signal,
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(formatHttpError(res.status, await res.text().catch(() => '')))
    const data = await res.json()
    return data.content?.[0]?.text || ''
  } finally {
    clearTimeout(timer)
  }
}

const GEMINI_SAFETY = [
  'HARM_CATEGORY_HARASSMENT',
  'HARM_CATEGORY_HATE_SPEECH',
  'HARM_CATEGORY_SEXUALLY_EXPLICIT',
  'HARM_CATEGORY_DANGEROUS_CONTENT',
].map((category) => ({ category, threshold: 'BLOCK_NONE' }))

async function callGemini(
  model: string,
  systemPrompt: string | undefined,
  userPrompt: string,
  key: string,
  maxTokens: number,
  timeout = 30000,
): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)

  const body: Record<string, unknown> = {
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    // maxOutputTokens generoso: con schema JSON ricchi 4000 può troncare (MAX_TOKENS → vuoto).
    generationConfig: { maxOutputTokens: Math.min(Math.max(maxTokens, 2048), 8192), temperature: 0.8 },
    // Marketing/moda può far scattare filtri safety troppo aggressivi → blocco silenzioso.
    safetySettings: GEMINI_SAFETY,
  }
  if (systemPrompt) body.systemInstruction = { parts: [{ text: systemPrompt }] }

  try {
    // La key va nell'header x-goog-api-key (non in querystring) per non finire nei log.
    const res = await fetch(`${GEMINI_API_BASE}/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      signal: controller.signal,
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(formatHttpError(res.status, await res.text().catch(() => '')))
    const data = await res.json()
    const candidate = data.candidates?.[0]
    const parts = candidate?.content?.parts
    const text = Array.isArray(parts) ? parts.map((p: { text?: string }) => p.text || '').join('') : ''
    if (!text.trim()) {
      // Diagnostica chiara invece di "risposta vuota" generico.
      const block = data.promptFeedback?.blockReason
      const finish = candidate?.finishReason
      if (block) throw new Error(`Gemini ha bloccato il prompt (${block})`)
      if (finish && finish !== 'STOP') throw new Error(`Gemini interrotto: ${finish}`)
      throw new Error('Gemini ha restituito una risposta vuota')
    }
    return text
  } finally {
    clearTimeout(timer)
  }
}

// OpenCode Zen/Go è OpenAI-compatible: stesso shape di OpenRouter, base URL diverso.
async function callOpenCode(
  model: string,
  systemPrompt: string | undefined,
  userPrompt: string,
  key: string,
  maxTokens: number,
  timeout = 30000,
): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)

  const messages: { role: string; content: string }[] = []
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt })
  messages.push({ role: 'user', content: userPrompt })

  try {
    const res = await fetch(OPENCODE_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      signal: controller.signal,
      body: JSON.stringify({ model, messages, max_tokens: maxTokens }),
    })
    if (!res.ok) throw new Error(formatHttpError(res.status, await res.text().catch(() => '')))
    const data = await res.json()
    return data.choices?.[0]?.message?.content || ''
  } finally {
    clearTimeout(timer)
  }
}

export function extractJSON(text: string): unknown {
  const m = text.match(/\{[\s\S]*\}/)
  if (!m) throw new Error('No JSON object found in AI response')
  try {
    return JSON.parse(m[0])
  } catch {
    throw new Error(`Malformed JSON in AI response: ${m[0].slice(0, 300)}`)
  }
}

export function extractJSONArray(text: string): unknown[] {
  const m = text.match(/\[[\s\S]*\]/)
  if (!m) throw new Error('No JSON array found in AI response')
  try {
    return JSON.parse(m[0])
  } catch {
    throw new Error(`Malformed JSON array in AI response: ${m[0].slice(0, 300)}`)
  }
}
