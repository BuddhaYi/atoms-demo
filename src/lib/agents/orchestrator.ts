import type { AgentName, ModelProvider, StreamEvent, ToolCall } from '@/types'
import { callModelWithTools } from '@/lib/ai/model-router'
import { createToolExecutor, createMemoryExecutor } from '@/lib/agents/tools/tool-executor'
import type { SandboxSession } from '@/lib/sandbox/e2b-client'
import type { AgentConfig, AgentContext } from './agent-config'
import type { ToolExecutor } from '@/lib/agents/tools/tool-executor'

interface OrchestratorConfig {
  model: ModelProvider
  agents: AgentConfig[]
  userMessage: string
  initialFiles: Record<string, string>
  history: Array<{ role: string; content: string }>
  sandbox?: SandboxSession
  timeoutMs?: number
}

const DEFAULT_TIMEOUT_MS = 300_000 // 5 minutes for full pipeline

export function runOrchestrator(config: OrchestratorConfig): ReadableStream<Uint8Array> {
  const {
    model,
    agents,
    userMessage,
    initialFiles,
    history,
    sandbox,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = config

  const encoder = new TextEncoder()
  let aborted = false

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const timeout = setTimeout(() => { aborted = true }, timeoutMs)

      try {
        // Shared executor across all agents
        const executor = sandbox
          ? createToolExecutor(initialFiles, sandbox)
          : createMemoryExecutor(initialFiles)

        const artifacts: Record<string, string> = {}
        let totalTokens = 0

        for (let agentIdx = 0; agentIdx < agents.length; agentIdx++) {
          if (aborted) {
            emit(controller, encoder, { type: 'error', message: 'Orchestrator timed out' })
            break
          }

          const agentConfig = agents[agentIdx]
          const context: AgentContext = {
            userMessage,
            existingCode: Object.keys(initialFiles).length > 0 ? initialFiles : undefined,
            artifacts,
          }

          const systemPrompt = agentConfig.buildSystemPrompt(context)

          // Emit agent start
          emit(controller, encoder, {
            type: 'agent_start',
            agent: agentConfig.name,
            message: '',
          })

          // Run this agent's loop
          const agentTokens = await runSingleAgentLoop({
            controller,
            encoder,
            model,
            systemPrompt,
            userMessage,
            history,
            executor,
            agentName: agentConfig.name,
            maxIterations: agentConfig.maxIterations,
            abortCheck: () => aborted,
          })

          totalTokens += agentTokens

          // Emit agent end
          emit(controller, encoder, {
            type: 'agent_end',
            agent: agentConfig.name,
          })

          // Collect artifact if this agent produces one
          if (agentConfig.outputArtifact) {
            const files = executor.getFiles()
            const artifactFile = agentConfig.outputArtifact === 'requirements'
              ? files['/requirements.md']
              : agentConfig.outputArtifact === 'architecture'
              ? files['/architecture.md']
              : undefined

            if (artifactFile) {
              artifacts[agentConfig.outputArtifact] = artifactFile
            }
          }
        }

        // Emit final code from all files written by all agents (include all files)
        const finalFiles = executor.getFiles()
        if (Object.keys(finalFiles).length > 0) {
          emit(controller, encoder, { type: 'code_complete', files: finalFiles })
        }

        emit(controller, encoder, { type: 'done', tokens_used: totalTokens })
      } catch (err) {
        emit(controller, encoder, {
          type: 'error',
          message: err instanceof Error ? err.message : 'Orchestrator failed',
        })
      } finally {
        clearTimeout(timeout)
        controller.close()
      }
    },
  })
}

interface SingleAgentLoopParams {
  controller: ReadableStreamDefaultController<Uint8Array>
  encoder: TextEncoder
  model: ModelProvider
  systemPrompt: string
  userMessage: string
  history: Array<{ role: string; content: string }>
  executor: ToolExecutor
  agentName: AgentName
  maxIterations: number
  abortCheck: () => boolean
}

async function runSingleAgentLoop(params: SingleAgentLoopParams): Promise<number> {
  const {
    controller, encoder, model, systemPrompt, userMessage,
    history, executor, agentName, maxIterations, abortCheck,
  } = params

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const messages: Array<{ role: string; content: any }> = [
    ...history.map((h) => ({ role: h.role, content: h.content })),
    { role: 'user', content: userMessage },
  ]

  let totalTokens = 0

  for (let i = 0; i < maxIterations; i++) {
    if (abortCheck()) break

    emit(controller, encoder, { type: 'iteration', current: i + 1, max: maxIterations })

    const response = await callModelWithTools(model, systemPrompt, messages)
    totalTokens += response.tokensUsed

    // Emit text content (strip :::files blocks — those are handled by the fallback extractor)
    if (response.content.trim()) {
      const cleanContent = stripFilesBlocks(stripThinkBlocks(response.content))
      if (cleanContent.trim()) {
        emit(controller, encoder, {
          type: 'agent_message',
          agent: agentName,
          content: cleanContent.trim(),
          content_type: 'text',
        })
      }
    }

    // If no tool calls, try text fallback and break
    if (response.toolCalls.length === 0 || response.stopReason === 'end_turn') {
      const cleanText = stripThinkBlocks(response.content)
      const extractedFiles = extractFilesFromText(cleanText)
      for (const [path, content] of Object.entries(extractedFiles)) {
        const writeCall: ToolCall = {
          id: `fallback-${Date.now()}-${path}`,
          name: 'write_file',
          input: { path, content },
        }
        emit(controller, encoder, { type: 'tool_call', agent: agentName, tool: writeCall })
        const result = await executor.execute(writeCall)
        emit(controller, encoder, { type: 'tool_result', agent: agentName, result })
      }
      break
    }

    // Build assistant message for conversation history
    if (model === 'claude') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const contentBlocks: any[] = []
      if (response.content) contentBlocks.push({ type: 'text', text: response.content })
      for (const tc of response.toolCalls) {
        contentBlocks.push({ type: 'tool_use', id: tc.id, name: tc.name, input: tc.input })
      }
      messages.push({ role: 'assistant', content: contentBlocks })
    } else {
      messages.push({
        role: 'assistant',
        content: response.content || null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...({ tool_calls: response.toolCalls.map((tc) => ({
          id: tc.id, type: 'function',
          function: { name: tc.name, arguments: JSON.stringify(tc.input) },
        })) } as any),
      })
    }

    // Execute tool calls
    for (const toolCall of response.toolCalls) {
      emit(controller, encoder, { type: 'tool_call', agent: agentName, tool: toolCall })
      const result = await executor.execute(toolCall)
      emit(controller, encoder, { type: 'tool_result', agent: agentName, result })

      if (model === 'claude') {
        messages.push({
          role: 'user',
          content: [{ type: 'tool_result', tool_use_id: toolCall.id, content: result.output }],
        })
      } else {
        messages.push({
          role: 'tool',
          content: result.output,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ...({ tool_call_id: toolCall.id } as any),
        })
      }
    }
  }

  return totalTokens
}

function emit(
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  event: StreamEvent,
) {
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
}

function stripThinkBlocks(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
}

function stripFilesBlocks(text: string): string {
  // Remove :::files...::: blocks and ```json :::files blocks
  return text
    .replace(/```json\s*:::files[\s\S]*/g, '')
    .replace(/:::files[\s\S]*?:::/g, '')
    .replace(/:::files[\s\S]*/g, '')
    .trim()
}

function extractFilesFromText(text: string): Record<string, string> {
  const files: Record<string, string> = {}
  const filesBlockMatch = text.match(/:::files\s*([\s\S]*)/)
  if (filesBlockMatch) {
    let jsonStr = filesBlockMatch[1].replace(/:::$/, '').trim()
    const jsonMatch = jsonStr.match(/\{[\s\S]*/)
    if (jsonMatch) {
      jsonStr = jsonMatch[0]
      try {
        const parsed = JSON.parse(jsonStr)
        for (const [key, value] of Object.entries(parsed)) {
          if (typeof value === 'string') {
            files[key.startsWith('/') ? key : `/${key}`] = value
          }
        }
        return files
      } catch {
        // JSON truncated — extract complete key-value pairs
        const pairRegex = /"(\/[^"]+)":\s*"((?:[^"\\]|\\.)*)"/g
        let pairMatch
        while ((pairMatch = pairRegex.exec(jsonStr)) !== null) {
          try {
            files[pairMatch[1]] = JSON.parse(`"${pairMatch[2]}"`)
          } catch {
            files[pairMatch[1]] = pairMatch[2].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\')
          }
        }
      }
    }
  }
  return files
}
