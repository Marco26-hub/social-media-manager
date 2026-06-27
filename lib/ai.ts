const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

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
// Con timeout 45s/tentativo, 2 fallback + tentativo primario stanno sotto i 90s del client.
const MAX_OPENROUTER_FALLBACKS = 2

type AIAttempt = {
  provider: 'openrouter' | 'anthropic'
  model: string
  ok: boolean
  error?: string
}

function isAnthropicModel(model: string) {
  return model.startsWith('claude-')
}

function sanitizeAIError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || 'errore sconosciuto')
  return message
    .replace(/Bearer\s+[A-Za-z0-9._-]+/g, 'Bearer [redacted]')
    .replace(/sk-or-v1-[A-Za-z0-9._-]+/g, 'sk-or-v1-[redacted]')
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
    const m = body.match(/retry_after_seconds"?\s*:\s*"?(\d+)/i)
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

export async function callAI(params: {
  model: string
  systemPrompt?: string
  userPrompt: string
  openrouterKey?: string
  maxTokens?: number
  silentFallback?: boolean
}): Promise<string> {
  const { model, systemPrompt, userPrompt, maxTokens = 4000, silentFallback = true } = params
  // SICUREZZA: la chiave BYO arriva dal client (localStorage). Accettala solo se
  // ha il formato OpenRouter atteso, altrimenti ignorala e usa quella server.
  const byoKey = (params.openrouterKey || '').trim()
  const validByoKey = /^sk-or-v1-[A-Za-z0-9_-]{20,}$/.test(byoKey) ? byoKey : ''
  const orKey = (validByoKey || process.env.OPENROUTER_API_KEY || '').trim()
  const anthropicKey = (process.env.ANTHROPIC_API_KEY || '').trim()

  const attempts: AIAttempt[] = []

  const canUseRequestedOnOpenRouter = !isAnthropicModel(model) || model.startsWith('anthropic/')

  // Try 1: OpenRouter (if key available)
  if (orKey) {
    if (canUseRequestedOnOpenRouter) {
      try {
        const res = await callOpenRouter(model, systemPrompt, userPrompt, orKey, maxTokens)
        if (!res.trim()) throw new Error('Risposta AI vuota')
        recordAttempt(attempts, { provider: 'openrouter', model, ok: true })
        return res
      } catch (e) {
        recordAttempt(attempts, { provider: 'openrouter', model, ok: false, error: sanitizeAIError(e) })
      }
    }

    if (silentFallback) {
      let fallbacksTried = 0
      for (const fb of FALLBACK_MODELS) {
        if (fb === model || isAnthropicModel(fb)) continue
        if (fallbacksTried >= MAX_OPENROUTER_FALLBACKS) break
        fallbacksTried++
        try {
          const res = await callOpenRouter(fb, systemPrompt, userPrompt, orKey, maxTokens)
          if (!res.trim()) throw new Error('Risposta AI vuota')
          recordAttempt(attempts, { provider: 'openrouter', model: fb, ok: true })
          return res
        } catch (fallbackError) {
          recordAttempt(attempts, { provider: 'openrouter', model: fb, ok: false, error: sanitizeAIError(fallbackError) })
        }
      }
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
  timeout = 45000,
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
  timeout = 45000,
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
