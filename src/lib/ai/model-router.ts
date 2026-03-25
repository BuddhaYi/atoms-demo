import type { ModelProvider, ToolCall } from '@/types'
import { getClaudeTools, getOpenAITools } from '@/lib/agents/tools/tool-definitions'

// --- Non-streaming tool-use call for Agent Loop ---

export interface ModelResponse {
  content: string
  toolCalls: ToolCall[]
  stopReason: 'end_turn' | 'tool_use' | 'max_tokens'
  tokensUsed: number
}

export async function callModelWithTools(
  model: ModelProvider,
  systemPrompt: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  messages: Array<{ role: string; content: any }>,
): Promise<ModelResponse> {
  if (model === 'claude') {
    return callClaudeWithTools(systemPrompt, messages)
  }
  if (model === 'gemini') {
    // Gemini proxy doesn't support function calling — use text-only mode
    return callGeminiTextOnly(systemPrompt, messages)
  }
  if (model === 'deepseek') {
    return callOpenAICompatibleWithTools(
      {
        url: 'https://api.deepseek.com/v1/chat/completions',
        apiKey: process.env.DEEPSEEK_API_KEY || '',
        model: 'deepseek-coder',
        maxTokens: 8192,
      },
      systemPrompt,
      messages,
    )
  }
  return callOpenAICompatibleWithTools(
    {
      url: 'https://api.openai.com/v1/chat/completions',
      apiKey: process.env.OPENAI_API_KEY || '',
      model: 'gpt-4o',
    },
    systemPrompt,
    messages,
  )
}

function getGeminiConfig() {
  const apiKey = process.env.GEMINI_API_KEY || ''
  const baseUrl = (process.env.GEMINI_BASE_URL || 'https://grsai.com/v1').replace(/\/+$/, '')
  const modelName = process.env.GEMINI_MODEL || 'gemini-3.1-pro'
  return { url: `${baseUrl}/chat/completions`, apiKey, model: modelName }
}

async function callClaudeWithTools(
  systemPrompt: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  messages: Array<{ role: string; content: any }>,
): Promise<ModelResponse> {
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
      tools: getClaudeTools(),
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Claude API error: ${response.status} ${text}`)
  }

  const data = await response.json()
  let content = ''
  const toolCalls: ToolCall[] = []

  for (const block of data.content || []) {
    if (block.type === 'text') {
      content += block.text
    } else if (block.type === 'tool_use') {
      toolCalls.push({
        id: block.id,
        name: block.name,
        input: block.input,
      })
    }
  }

  const stopReason = data.stop_reason === 'tool_use' ? 'tool_use'
    : data.stop_reason === 'max_tokens' ? 'max_tokens'
    : 'end_turn'

  return {
    content,
    toolCalls,
    stopReason,
    tokensUsed: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
  }
}

async function callOpenAICompatibleWithTools(
  config: { url: string; apiKey: string; model: string; maxTokens?: number },
  systemPrompt: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  messages: Array<{ role: string; content: any }>,
): Promise<ModelResponse> {
  const openaiMessages = [
    { role: 'system', content: systemPrompt },
    ...messages,
  ]

  const response = await fetch(config.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: config.maxTokens || 8192,
      messages: openaiMessages,
      tools: getOpenAITools(),
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`API error: ${response.status} ${text}`)
  }

  const data = await response.json()
  const choice = data.choices?.[0]
  const message = choice?.message

  const content = message?.content || ''
  const toolCalls: ToolCall[] = (message?.tool_calls || []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (tc: any) => ({
      id: tc.id,
      name: tc.function.name,
      input: JSON.parse(tc.function.arguments || '{}'),
    })
  )

  const stopReason = choice?.finish_reason === 'tool_calls' ? 'tool_use'
    : choice?.finish_reason === 'length' ? 'max_tokens'
    : 'end_turn'

  return {
    content,
    toolCalls,
    stopReason,
    tokensUsed: (data.usage?.prompt_tokens || 0) + (data.usage?.completion_tokens || 0),
  }
}

/** Gemini text-only mode (no tools param, uses :::files fallback format) */
async function callGeminiTextOnly(
  systemPrompt: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  messages: Array<{ role: string; content: any }>,
): Promise<ModelResponse> {
  const config = getGeminiConfig()

  const openaiMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.map((m) => ({
      role: m.role,
      content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
    })),
  ]

  const response = await fetch(config.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 8192,
      messages: openaiMessages,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Gemini API error: ${response.status} ${text}`)
  }

  const data = await response.json()
  const choice = data.choices?.[0]
  const content = choice?.message?.content || ''

  return {
    content,
    toolCalls: [],
    stopReason: 'end_turn',
    tokensUsed: (data.usage?.prompt_tokens || 0) + (data.usage?.completion_tokens || 0),
  }
}

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
  if (model === 'deepseek') {
    return streamFromDeepSeek(systemPrompt, userMessage, history)
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

async function streamFromDeepSeek(
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

  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-coder',
      max_tokens: 8192,
      messages,
      stream: true,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`DeepSeek API error: ${response.status} ${text}`)
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
