import { buildSystemPrompt, buildFixBugPrompt } from '@/lib/ai/prompts/system'
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
    } = body

    if (!message && !fixBug) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const systemPrompt = fixBug
      ? buildFixBugPrompt(bugError || '', existingCode || {})
      : buildSystemPrompt(mode, existingCode)

    const userMessage = fixBug
      ? `Fix this error: ${bugError}`
      : message

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
