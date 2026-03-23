import { buildSystemPrompt, buildFixBugPrompt, OPTIMIZE_PROMPT } from '@/lib/ai/prompts/system'
import { streamFromModel } from '@/lib/ai/model-router'
import { createStreamParser } from '@/lib/agents/stream-parser'
import type { ModelProvider, WorkspaceMode, StreamEvent } from '@/types'

export const runtime = 'edge'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      message,
      mode = 'team' as WorkspaceMode,
      model = 'claude' as ModelProvider,
      existingCode,
      history = [],
      fixBug,
      error: bugError,
      phase,
      approvedFeatures,
    } = body

    if (!message && !fixBug) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    let systemPrompt: string
    if (fixBug) {
      systemPrompt = buildFixBugPrompt(bugError || '', existingCode || {})
    } else if (phase === 'optimize') {
      systemPrompt = OPTIMIZE_PROMPT
    } else if (phase === 'plan') {
      systemPrompt = buildSystemPrompt(mode, existingCode, {
        activeAgents: ['emma'],
        stopAfterAgent: 'emma',
      })
    } else {
      systemPrompt = buildSystemPrompt(mode, existingCode)
    }

    let userMessage: string
    if (fixBug) {
      userMessage = `Fix this error: ${bugError}`
    } else if (phase === 'implement' && Array.isArray(approvedFeatures)) {
      const featureList = approvedFeatures.map((f, i) => `${i + 1}. ${f}`).join('\n')
      userMessage = `${message}\n\nApproved features to implement:\n${featureList}\n\nPlease have Bob design the architecture first, then Alex implement the code. Do NOT skip Bob.`
    } else {
      userMessage = message
    }

    const llmStream = await streamFromModel(model, systemPrompt, userMessage, history)
    const parser = createStreamParser()
    const reader = llmStream.getReader()
    const encoder = new TextEncoder()

    const sseStream = new ReadableStream({
      async pull(controller) {
        while (true) {
          const { done, value } = await reader.read()

          if (done) {
            const flushEvents = parser.flush()
            for (const event of flushEvents) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
              )
            }
            controller.close()
            return
          }

          const events = parser.parse(value)
          for (const event of events) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
            )
          }
        }
      },
    })

    return new Response(sseStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    const errorEvent: StreamEvent = { type: 'error', message }
    const encoder = new TextEncoder()

    const errorStream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`)
        )
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
        )
        controller.close()
      },
    })

    return new Response(errorStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    })
  }
}
