import { NextRequest } from 'next/server'
import { runAgentLoop } from '@/lib/agents/agent-loop'
import { runOrchestrator } from '@/lib/agents/orchestrator'
import { buildAgentSystemPrompt } from '@/lib/ai/prompts/agent-system'
import { getOrchestratorAgents } from '@/lib/agents/agent-config'
import { isE2BConfigured, getOrCreateSession } from '@/lib/sandbox/session-manager'
import type { ModelProvider } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      message,
      model = 'gemini',
      existingCode = {},
      history = [],
      projectId,
      multiAgent = false,
    } = body as {
      message: string
      model: ModelProvider
      existingCode?: Record<string, string>
      history?: Array<{ role: string; content: string }>
      projectId?: string
      multiAgent?: boolean
    }

    if (!message?.trim()) {
      return Response.json({ error: 'Message is required' }, { status: 400 })
    }

    const textOnly = model === 'gemini'

    // Create sandbox if E2B is configured
    const useSandbox = isE2BConfigured() && !textOnly
    const sandbox = useSandbox && projectId
      ? await getOrCreateSession(projectId, existingCode)
      : undefined

    let stream: ReadableStream<Uint8Array>

    if (multiAgent) {
      // P2: Multi-agent orchestration (Emma → Bob → Alex)
      const agents = getOrchestratorAgents(textOnly)
      stream = runOrchestrator({
        model,
        agents,
        userMessage: message,
        initialFiles: existingCode,
        history,
        sandbox,
      })
    } else {
      // P0: Single agent loop (Alex only)
      const systemPrompt = buildAgentSystemPrompt(
        Object.keys(existingCode).length > 0 ? existingCode : undefined,
        { textOnly }
      )
      stream = runAgentLoop({
        model,
        systemPrompt,
        userMessage: message,
        history,
        initialFiles: existingCode,
        sandbox,
      })
    }

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return Response.json({ error: message }, { status: 500 })
  }
}
