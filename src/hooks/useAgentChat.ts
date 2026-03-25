'use client'

import { useCallback, useRef } from 'react'
import { useWorkspaceStore } from '@/store/workspace-store'
import type { ChatMessage, StreamEvent, AgentName } from '@/types'

export function useAgentChat() {
  const store = useWorkspaceStore()
  const abortRef = useRef<AbortController | null>(null)

  const sendMessage = useCallback(
    async (message: string) => {
      const {
        model,
        currentCode,
        messages,
        currentVersionNumber,
        multiAgent,
        setIsGenerating,
        setActiveAgent,
        addMessage,
        mergeCode,
        addVersion,
        clearAgentSteps,
        setAgentIterations,
        addAgentStep,
        setLastUserPrompt,
      } = useWorkspaceStore.getState()

      // Add user message
      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        project_id: '',
        role: 'user',
        content: message,
        content_type: 'text',
        metadata: {},
        created_at: new Date().toISOString(),
      }
      addMessage(userMsg)
      setLastUserPrompt(message)
      setIsGenerating(true)
      clearAgentSteps()

      // Build history
      const recentMessages = messages.slice(-10)
      const history = recentMessages
        .filter((m) => m.role !== 'system')
        .map((m) => ({
          role: (m.role === 'user' ? 'user' : 'assistant') as string,
          content: m.role === 'agent' && m.agent_name
            ? `[${m.agent_name.toUpperCase()}] ${m.content}`
            : m.content,
        }))

      abortRef.current = new AbortController()
      let currentAgentName: AgentName | null = null

      try {
        const response = await fetch('/api/agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message,
            model,
            existingCode: Object.keys(currentCode).length > 0 ? currentCode : undefined,
            history,
            projectId: useWorkspaceStore.getState().projectId,
            multiAgent,
          }),
          signal: abortRef.current.signal,
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const reader = response.body!.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6).trim()
            if (!data) continue

            try {
              const event: StreamEvent = JSON.parse(data)

              switch (event.type) {
                case 'agent_start': {
                  currentAgentName = event.agent
                  setActiveAgent(event.agent)
                  const agentMsg: ChatMessage = {
                    id: crypto.randomUUID(),
                    project_id: '',
                    role: 'agent',
                    agent_name: event.agent,
                    content: '',
                    content_type: 'text',
                    metadata: {},
                    created_at: new Date().toISOString(),
                  }
                  addMessage(agentMsg)
                  break
                }

                case 'agent_message': {
                  const state = useWorkspaceStore.getState()
                  const msgs = [...state.messages]
                  const lastIdx = msgs.length - 1
                  if (lastIdx >= 0 && msgs[lastIdx].role === 'agent') {
                    msgs[lastIdx] = {
                      ...msgs[lastIdx],
                      content: msgs[lastIdx].content
                        ? msgs[lastIdx].content + '\n' + event.content
                        : event.content,
                    }
                    useWorkspaceStore.setState({ messages: msgs })
                  }
                  break
                }

                case 'tool_call': {
                  addAgentStep({
                    id: event.tool.id,
                    type: 'tool_call',
                    agent: event.agent,
                    content: `${event.tool.name}(${JSON.stringify(event.tool.input)})`,
                    metadata: { tool: event.tool },
                    timestamp: new Date().toISOString(),
                  })
                  // Add tool call as a message
                  const toolMsg: ChatMessage = {
                    id: crypto.randomUUID(),
                    project_id: '',
                    role: 'agent',
                    agent_name: event.agent,
                    content: event.tool.name,
                    content_type: 'tool_call',
                    metadata: { tool: event.tool },
                    created_at: new Date().toISOString(),
                  }
                  addMessage(toolMsg)
                  break
                }

                case 'tool_result': {
                  addAgentStep({
                    id: event.result.tool_call_id,
                    type: 'tool_result',
                    agent: event.agent,
                    content: event.result.output,
                    metadata: { is_error: event.result.is_error },
                    timestamp: new Date().toISOString(),
                  })
                  // Update the last tool_call message with the result
                  const state2 = useWorkspaceStore.getState()
                  const msgs2 = [...state2.messages]
                  const lastIdx2 = msgs2.length - 1
                  if (lastIdx2 >= 0 && msgs2[lastIdx2].content_type === 'tool_call') {
                    msgs2[lastIdx2] = {
                      ...msgs2[lastIdx2],
                      content_type: 'tool_result',
                      content: event.result.output,
                      metadata: {
                        ...msgs2[lastIdx2].metadata,
                        tool_name: event.result.name,
                        is_error: event.result.is_error,
                      },
                    }
                    useWorkspaceStore.setState({ messages: msgs2 })
                  }
                  break
                }

                case 'iteration': {
                  setAgentIterations({ current: event.current, max: event.max })
                  break
                }

                case 'code_complete': {
                  mergeCode(event.files)
                  const newVersion = currentVersionNumber + 1
                  addVersion({
                    id: crypto.randomUUID(),
                    project_id: '',
                    version_number: newVersion,
                    files: { ...useWorkspaceStore.getState().currentCode, ...event.files },
                    prompt: message,
                    agent_name: currentAgentName || 'alex',
                    model_used: model,
                    tokens_used: 0,
                    created_at: new Date().toISOString(),
                  })
                  break
                }

                case 'agent_end': {
                  if (currentAgentName === event.agent) {
                    currentAgentName = null
                  }
                  break
                }

                case 'error': {
                  const errMsg: ChatMessage = {
                    id: crypto.randomUUID(),
                    project_id: '',
                    role: 'system',
                    content: event.message,
                    content_type: 'text',
                    metadata: {},
                    created_at: new Date().toISOString(),
                  }
                  addMessage(errMsg)
                  break
                }

                case 'done':
                  break
              }
            } catch {
              // Skip unparseable events
            }
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
        const errMsg: ChatMessage = {
          id: crypto.randomUUID(),
          project_id: '',
          role: 'system',
          content: err instanceof Error ? err.message : 'Failed to connect',
          content_type: 'text',
          metadata: {},
          created_at: new Date().toISOString(),
        }
        addMessage(errMsg)
      } finally {
        setIsGenerating(false)
        setActiveAgent(null)
        setAgentIterations(null)
      }
    },
    []
  )

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort()
    useWorkspaceStore.getState().setIsGenerating(false)
    useWorkspaceStore.getState().setActiveAgent(null)
  }, [])

  return {
    sendMessage,
    stopGeneration,
    isGenerating: store.isGenerating,
  }
}
