import { buildReviewPrompt } from '@/lib/ai/prompts/system'
import { streamFromModel } from '@/lib/ai/model-router'
import { createStreamParser } from '@/lib/agents/stream-parser'
import type { ModelProvider, StreamEvent } from '@/types'

export const runtime = 'edge'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      code,
      model = 'claude' as ModelProvider,
    } = body

    if (!code || Object.keys(code).length === 0) {
      return new Response(JSON.stringify({ error: 'No code to review' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const systemPrompt = buildReviewPrompt(code)
    const llmStream = await streamFromModel(model, systemPrompt, 'Review this code', [])
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
    const message = err instanceof Error ? err.message : 'Review failed'
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
