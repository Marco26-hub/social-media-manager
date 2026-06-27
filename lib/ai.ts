const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

const FALLBACK_MODELS = [
  'openrouter/free',
  'nvidia/nemotron-3-ultra-550b-a55b:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'google/gemma-4-31b-it:free',
  'google/gemma-4-26b-a4b-it:free',
  'qwen/qwen3-next-80b-a3b-instruct:free',
  'openai/gpt-oss-120b:free',
  'claude-sonnet-4-6',
]

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
    .slice(0, 500)
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
    return 'No AI provider configured. Aggiungi OPENROUTER_API_KEY o ANTHROPIC_API_KEY su Render, oppure incolla una OpenRouter API Key nella pagina.'
  }

  const summary = attempts
    .map((attempt, index) => `${index + 1}. ${attempt.provider}/${attempt.model}: ${attempt.ok ? 'ok' : attempt.error || 'errore'}`)
    .join(' | ')
  return `AI generation failed after ${attempts.length} attempt(s): ${summary}`
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
  const orKey = (params.openrouterKey || process.env.OPENROUTER_API_KEY || '').trim()
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
      for (const fb of FALLBACK_MODELS) {
        if (fb === model || isAnthropicModel(fb)) continue
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
  timeout = 60000,
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
    if (!res.ok) throw new Error(`${res.status} ${await res.text().catch(() => '')}`)
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
  timeout = 60000,
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
    if (!res.ok) throw new Error(`${res.status} ${await res.text().catch(() => '')}`)
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
