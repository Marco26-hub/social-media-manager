'use client'

export const DEFAULT_AI_MODEL = 'meta-llama/llama-3.3-70b-instruct:free'

export function readAISettings() {
  if (typeof window === 'undefined') {
    return {
      model: DEFAULT_AI_MODEL,
      openrouter_key: undefined as string | undefined,
      gemini_key: undefined as string | undefined,
      opencode_key: undefined as string | undefined,
    }
  }

  const model = localStorage.getItem('ai_model') || DEFAULT_AI_MODEL
  const openrouterKey = localStorage.getItem('openrouter_key')?.trim()
  const geminiKey = localStorage.getItem('gemini_key')?.trim()
  const opencodeKey = localStorage.getItem('opencode_key')?.trim()
  return {
    model,
    openrouter_key: openrouterKey || undefined,
    gemini_key: geminiKey || undefined,
    opencode_key: opencodeKey || undefined,
  }
}

export async function readApiError(response: Response, fallback: string) {
  try {
    const data = await response.clone().json()
    if (typeof data?.error === 'string' && data.error.trim()) return data.error
    if (typeof data?.message === 'string' && data.message.trim()) return data.message
  } catch {
    try {
      const text = await response.text()
      const trimmed = text.trim()
      // Non rovesciare l'HTML di una pagina d'errore gateway (502/504).
      if (/^\s*<|<!doctype|<html/i.test(trimmed)) {
        if (response.status === 502 || response.status === 504) {
          return 'Operazione troppo lunga, interrotta dal server (timeout). Riprova.'
        }
        return `Errore server (${response.status || 'rete'}). Riprova tra poco.`
      }
      if (trimmed) return trimmed.slice(0, 500)
    } catch {
      // keep fallback
    }
  }

  return fallback
}

export async function assertApiOk(response: Response, fallback: string) {
  if (response.ok) return
  throw new Error(await readApiError(response, fallback))
}
