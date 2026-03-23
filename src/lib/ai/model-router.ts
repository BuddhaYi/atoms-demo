import type { ModelProvider } from '@/types'

export async function streamFromModel(
  model: ModelProvider,
  systemPrompt: string,
  userMessage: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<ReadableStream<string>> {
  if (model === 'claude') {
    return streamFromClaude(systemPrompt, userMessage, history)
  }
  if (model === 'gemini') {
    return streamFromGemini(systemPrompt, userMessage, history)
  }
  return streamFromOpenAI(systemPrompt, userMessage, history)
}

async function streamFromClaude(
  systemPrompt: string,
  userMessage: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<ReadableStream<string>> {
  const messages = [
    ...history.map(h => ({
      role: h.role as 'user' | 'assistant',
      content: h.content,
    })),
    { role: 'user' as const, content: userMessage },
  ]

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY || '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      system: systemPrompt,
      messages,
      stream: true,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Claude API error: ${response.status} ${text}`)
  }

  return createSSETextStream(response, (parsed) => {
    if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
      return parsed.delta.text
    }
    return null
  })
}

async function streamFromOpenAI(
  systemPrompt: string,
  userMessage: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<ReadableStream<string>> {
  const messages = [
    { role: 'system' as const, content: systemPrompt },
    ...history.map(h => ({
      role: h.role as 'user' | 'assistant',
      content: h.content,
    })),
    { role: 'user' as const, content: userMessage },
  ]

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 8192,
      messages,
      stream: true,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`OpenAI API error: ${response.status} ${text}`)
  }

  return createSSETextStream(response, (parsed) => {
    const content = parsed.choices?.[0]?.delta?.content
    return content || null
  })
}

async function streamFromGemini(
  systemPrompt: string,
  userMessage: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<ReadableStream<string>> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set')
  }

  const baseUrl = (process.env.GEMINI_BASE_URL || 'https://grsai.com/v1').replace(/\/+$/, '')
  const modelName = process.env.GEMINI_MODEL || 'gemini-3.1-pro'

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    ...history.map(h => ({
      role: h.role as 'user' | 'assistant',
      content: h.content,
    })),
    { role: 'user' as const, content: userMessage },
  ]

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelName,
      max_tokens: 8192,
      messages,
      stream: true,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Gemini API error: ${response.status} ${text}`)
  }

  return createSSETextStream(response, (parsed) => {
    const content = parsed.choices?.[0]?.delta?.content
    return content || null
  })
}

/**
 * Creates a ReadableStream<string> from an SSE response with proper line buffering.
 * The extractor function maps parsed JSON events to text content (or null to skip).
 */
function createSSETextStream(
  response: Response,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  extractor: (parsed: any) => string | null
): ReadableStream<string> {
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let sseBuffer = ''

  return new ReadableStream<string>({
    async pull(controller) {
      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          controller.close()
          return
        }

        sseBuffer += decoder.decode(value, { stream: true })
        const lines = sseBuffer.split('\n')
        // Keep the last (potentially incomplete) line in the buffer
        sseBuffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data: ')) continue
          const data = trimmed.slice(6)
          if (data === '[DONE]') {
            controller.close()
            return
          }
          try {
            const parsed = JSON.parse(data)
            const text = extractor(parsed)
            if (text) {
              controller.enqueue(text)
            }
          } catch {
            // skip unparseable
          }
        }
      }
    },
  })
}
