import type { AgentName, ModelProvider, StreamEvent, ToolCall } from '@/types'
import { callModelWithTools } from '@/lib/ai/model-router'
import { createToolExecutor, createMemoryExecutor } from '@/lib/agents/tools/tool-executor'
import type { SandboxSession } from '@/lib/sandbox/e2b-client'

interface AgentLoopConfig {
  model: ModelProvider
  systemPrompt: string
  userMessage: string
  history: Array<{ role: string; content: string }>
  initialFiles: Record<string, string>
  maxIterations?: number
  timeoutMs?: number
  agentName?: AgentName
  sandbox?: SandboxSession
}

const DEFAULT_MAX_ITERATIONS = 15
const DEFAULT_TIMEOUT_MS = 120_000

export function runAgentLoop(config: AgentLoopConfig): ReadableStream<Uint8Array> {
  const {
    model,
    systemPrompt,
    userMessage,
    history,
    initialFiles,
    maxIterations = DEFAULT_MAX_ITERATIONS,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    agentName = 'alex',
    sandbox,
  } = config

  const encoder = new TextEncoder()
  let aborted = false

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const timeout = setTimeout(() => {
        aborted = true
      }, timeoutMs)

      try {
        const executor = sandbox
          ? createToolExecutor(initialFiles, sandbox)
          : createMemoryExecutor(initialFiles)

        // Build messages array for the conversation
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const messages: Array<{ role: string; content: any }> = [
          ...history.map((h) => ({ role: h.role, content: h.content })),
          { role: 'user', content: userMessage },
        ]

        // Emit agent start
        emit(controller, encoder, {
          type: 'agent_start',
          agent: agentName,
          message: '',
        })

        let totalTokens = 0

        for (let i = 0; i < maxIterations; i++) {
          if (aborted) {
            emit(controller, encoder, {
              type: 'error',
              message: 'Agent loop timed out',
            })
            break
          }

          // Emit iteration progress
          emit(controller, encoder, {
            type: 'iteration',
            current: i + 1,
            max: maxIterations,
          })

          // Call LLM with tools
          const response = await callModelWithTools(
            model,
            systemPrompt,
            messages,
          )

          totalTokens += response.tokensUsed

          // Emit text content if any
          if (response.content.trim()) {
            // Strip <think> blocks
            const cleanContent = stripThinkBlocks(response.content)
            if (cleanContent.trim()) {
              emit(controller, encoder, {
                type: 'agent_message',
                agent: agentName,
                content: cleanContent.trim(),
                content_type: 'text',
              })
            }
          }

          // If no tool calls, try text-based file extraction fallback
          // (for models that don't support function calling, e.g. Gemini proxy)
          if (response.toolCalls.length === 0 || response.stopReason === 'end_turn') {
            const cleanText = stripThinkBlocks(response.content)
            const extractedFiles = extractFilesFromText(cleanText)
            if (Object.keys(extractedFiles).length > 0) {
              // Write extracted files to executor
              for (const [path, content] of Object.entries(extractedFiles)) {
                const writeCall: ToolCall = {
                  id: `fallback-${Date.now()}-${path}`,
                  name: 'write_file',
                  input: { path, content },
                }
                emit(controller, encoder, {
                  type: 'tool_call',
                  agent: agentName,
                  tool: writeCall,
                })
                const result = await executor.execute(writeCall)
                emit(controller, encoder, {
                  type: 'tool_result',
                  agent: agentName,
                  result,
                })
              }
            }
            messages.push({ role: 'assistant', content: response.content })
            break
          }

          // Build assistant message with tool_use for Claude format
          if (model === 'claude') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const contentBlocks: any[] = []
            if (response.content) {
              contentBlocks.push({ type: 'text', text: response.content })
            }
            for (const tc of response.toolCalls) {
              contentBlocks.push({
                type: 'tool_use',
                id: tc.id,
                name: tc.name,
                input: tc.input,
              })
            }
            messages.push({ role: 'assistant', content: contentBlocks })
          } else {
            // OpenAI format
            messages.push({
              role: 'assistant',
              content: response.content || null,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ...({ tool_calls: response.toolCalls.map((tc) => ({
                id: tc.id,
                type: 'function',
                function: {
                  name: tc.name,
                  arguments: JSON.stringify(tc.input),
                },
              })) } as any),
            })
          }

          // Execute each tool call
          for (const toolCall of response.toolCalls) {
            // Emit tool call event
            emit(controller, encoder, {
              type: 'tool_call',
              agent: agentName,
              tool: toolCall,
            })

            // Execute the tool
            const result = await executor.execute(toolCall)

            // Emit tool result event
            emit(controller, encoder, {
              type: 'tool_result',
              agent: agentName,
              result,
            })

            // Add tool result to messages
            if (model === 'claude') {
              messages.push({
                role: 'user',
                content: [{
                  type: 'tool_result',
                  tool_use_id: toolCall.id,
                  content: result.output,
                }],
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

        // Emit final code
        const finalFiles = executor.getFiles()
        if (Object.keys(finalFiles).length > 0) {
          emit(controller, encoder, {
            type: 'code_complete',
            files: finalFiles,
          })
        }

        // Emit agent end
        emit(controller, encoder, {
          type: 'agent_end',
          agent: agentName,
        })

        // Emit done
        emit(controller, encoder, {
          type: 'done',
          tokens_used: totalTokens,
        })
      } catch (err) {
        emit(controller, encoder, {
          type: 'error',
          message: err instanceof Error ? err.message : 'Agent loop failed',
        })
      } finally {
        clearTimeout(timeout)
        controller.close()
      }
    },
  })
}

function emit(
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  event: StreamEvent,
) {
  controller.enqueue(
    encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
  )
}

function stripThinkBlocks(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
}

/**
 * Fallback: extract files from LLM text output when tool calling is not available.
 * Supports two formats:
 * 1. :::files JSON block (existing stream-parser format)
 * 2. ```filename.js code blocks with file path headers
 */
function extractFilesFromText(text: string): Record<string, string> {
  const files: Record<string, string> = {}

  // Try :::files JSON block first
  const filesBlockMatch = text.match(/:::files\s*([\s\S]*?):::/)
  if (filesBlockMatch) {
    try {
      const jsonStr = filesBlockMatch[1].trim()
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        for (const [key, value] of Object.entries(parsed)) {
          if (typeof value === 'string') {
            const normalizedKey = key.startsWith('/') ? key : `/${key}`
            files[normalizedKey] = value
          }
        }
        return files
      }
    } catch {
      // Fall through to code block parsing
    }
  }

  // Try ```filename code blocks
  // Pattern: **`/path/to/file`** or ### /path/to/file followed by ```code```
  const codeBlockRegex = /(?:(?:\*\*`?|###?\s*)([/\w.-]+\.\w+)`?\*\*|(?:^|\n)([/\w.-]+\.\w+)\s*\n)[\s\S]*?```[\w]*\n([\s\S]*?)```/g
  let match
  while ((match = codeBlockRegex.exec(text)) !== null) {
    const filePath = match[1] || match[2]
    const code = match[3]
    if (filePath && code) {
      const normalizedPath = filePath.startsWith('/') ? filePath : `/${filePath}`
      files[normalizedPath] = code.trim()
    }
  }

  return files
}
