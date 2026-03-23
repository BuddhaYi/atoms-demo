'use client'

import { useCallback, useRef } from 'react'
import { useWorkspaceStore } from '@/store/workspace-store'
import type { ChatMessage, StreamEvent, AgentName } from '@/types'

function parseFeatureList(content: string): string[] {
  return content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => line.replace(/^\d+\.\s*/, ''))
}

interface SendOptions {
  error?: string
  phase?: 'plan' | 'implement'
  approvedFeatures?: string[]
}

export function useChat() {
  const store = useWorkspaceStore()
  const abortRef = useRef<AbortController | null>(null)

  const sendMessage = useCallback(
    async (message: string, options?: SendOptions) => {
      const {
        mode,
        model,
        currentCode,
        messages,
        currentVersionNumber,
        setIsGenerating,
        setActiveAgent,
        addMessage,
        mergeCode,
        addVersion,
        setPendingFeatures,
        setAwaitingApproval,
        setLastUserPrompt,
      } = useWorkspaceStore.getState()

      const fixBug = options?.error ? { error: options.error } : undefined
      const phase = options?.phase
      const approvedFeatures = options?.approvedFeatures

      // Add user message (skip for fixBug and implement phase)
      if (!fixBug && phase !== 'implement') {
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
      }

      setIsGenerating(true)

      // Determine phase: team mode + new message (not fixBug, not already phased, no existing code) → plan
      const hasExistingCode = Object.keys(currentCode).length > 0
      const effectivePhase = phase || (mode === 'team' && !fixBug && !hasExistingCode ? 'plan' : undefined)

      // Build history from recent messages (last 10 for context, save tokens)
      const recentMessages = messages.slice(-10)
      const history = recentMessages
        .filter((m) => m.role !== 'system')
        .map((m) => ({
          role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
          content: m.role === 'agent' && m.agent_name
            ? `[${m.agent_name.toUpperCase()}] ${m.content}`
            : m.content,
        }))

      abortRef.current = new AbortController()

      // Track if we saw a feature_list in this stream (for plan phase auto-pause)
      let sawFeatureList = false
      let featureListContent = ''

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: fixBug ? `Fix this error: ${fixBug.error}` : message,
            mode,
            model,
            existingCode: Object.keys(currentCode).length > 0 ? currentCode : undefined,
            history,
            fixBug: !!fixBug,
            error: fixBug?.error,
            phase: effectivePhase,
            approvedFeatures,
          }),
          signal: abortRef.current.signal,
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const reader = response.body!.getReader()
        const decoder = new TextDecoder()
        let currentAgentName: AgentName | null = null
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
                  // Create a new agent message placeholder
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
                  // Track feature_list content for plan phase
                  if (event.content_type === 'feature_list' && effectivePhase === 'plan') {
                    sawFeatureList = true
                    featureListContent += (featureListContent ? '\n' : '') + event.content
                  }

                  // Update the last agent message with content
                  const state = useWorkspaceStore.getState()
                  const msgs = [...state.messages]
                  const lastIdx = msgs.length - 1
                  if (lastIdx >= 0 && msgs[lastIdx].role === 'agent' && msgs[lastIdx].agent_name === event.agent) {
                    if (event.content_type !== 'text' && msgs[lastIdx].content === '') {
                      // First content for a rich block - replace
                      msgs[lastIdx] = {
                        ...msgs[lastIdx],
                        content: event.content,
                        content_type: event.content_type,
                      }
                    } else if (msgs[lastIdx].content_type === event.content_type || event.content_type === 'text') {
                      // Append to existing text
                      msgs[lastIdx] = {
                        ...msgs[lastIdx],
                        content: msgs[lastIdx].content
                          ? msgs[lastIdx].content + '\n' + event.content
                          : event.content,
                      }
                    } else {
                      // Different content type - add new message
                      const newMsg: ChatMessage = {
                        id: crypto.randomUUID(),
                        project_id: '',
                        role: 'agent',
                        agent_name: event.agent,
                        content: event.content,
                        content_type: event.content_type,
                        metadata: {},
                        created_at: new Date().toISOString(),
                      }
                      msgs.push(newMsg)
                    }
                    useWorkspaceStore.setState({ messages: msgs })
                  }
                  break
                }

                case 'agent_end': {
                  if (currentAgentName === event.agent) {
                    currentAgentName = null
                  }
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

                case 'done': {
                  break
                }
              }
            } catch {
              // Skip unparseable events
            }
          }
        }

        // After stream ends: if plan phase and we saw feature_list, pause for approval
        if (effectivePhase === 'plan' && sawFeatureList && featureListContent) {
          const features = parseFeatureList(featureListContent)
          if (features.length > 0) {
            setPendingFeatures(features.map((text) => ({ text, approved: true })))
            setAwaitingApproval(true)
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return
        }
        // Clear approval state on error during plan phase
        if (effectivePhase === 'plan') {
          setPendingFeatures(null)
          setAwaitingApproval(false)
        }
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
      }
    },
    []
  )

  const approveFeatures = useCallback(async () => {
    const state = useWorkspaceStore.getState()
    const { pendingFeatures, lastUserPrompt, isGenerating } = state

    if (!pendingFeatures || !lastUserPrompt?.trim() || isGenerating) return

    const approved = pendingFeatures
      .filter((f) => f.approved)
      .map((f) => f.text)

    if (approved.length === 0) return

    // Clear approval state
    state.setAwaitingApproval(false)
    state.setPendingFeatures(null)

    // Trigger Phase 2 with approved features
    await sendMessage(lastUserPrompt, {
      phase: 'implement',
      approvedFeatures: approved,
    })
  }, [sendMessage])

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort()
    useWorkspaceStore.getState().setIsGenerating(false)
    useWorkspaceStore.getState().setActiveAgent(null)
  }, [])

  return {
    sendMessage,
    approveFeatures,
    stopGeneration,
    isGenerating: store.isGenerating,
  }
}
