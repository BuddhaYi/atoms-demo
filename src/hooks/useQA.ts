'use client'

import { useEffect, useRef } from 'react'
import { useWorkspaceStore } from '@/store/workspace-store'
import type { ChatMessage } from '@/types'

const MAX_QA_ATTEMPTS = 3
const ERROR_STABILIZATION_DELAY = 3000

type SendMessageFn = (message: string, options?: { error?: string }) => Promise<void>

export function useQA(sendMessage: SendMessageFn) {
  const isGenerating = useWorkspaceStore((s) => s.isGenerating)
  const qaEnabled = useWorkspaceStore((s) => s.qaEnabled)
  const prevGeneratingRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const wasGenerating = prevGeneratingRef.current
    prevGeneratingRef.current = isGenerating

    // Trigger QA check when generation finishes
    if (wasGenerating && !isGenerating && qaEnabled) {
      // Clear any existing timer
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }

      // Wait for Sandpack to render and stabilize
      timerRef.current = setTimeout(() => {
        const state = useWorkspaceStore.getState()
        const { qaErrors, qaAttempts } = state

        if (qaErrors.length === 0) {
          // No errors — reset attempt counter on success
          if (qaAttempts > 0) {
            state.resetQa()
          }
          return
        }

        if (qaAttempts >= MAX_QA_ATTEMPTS) {
          // Max attempts reached — notify user
          const maxMsg: ChatMessage = {
            id: crypto.randomUUID(),
            project_id: '',
            role: 'agent',
            agent_name: 'qa',
            content: `Fix attempt ${qaAttempts}/${MAX_QA_ATTEMPTS} — max attempts reached. Please check the console for remaining errors.`,
            content_type: 'text',
            metadata: {},
            created_at: new Date().toISOString(),
          }
          state.addMessage(maxMsg)
          state.setActiveAgent(null)
          return
        }

        // Trigger auto-fix
        const attempt = qaAttempts + 1
        state.setActiveAgent('qa')
        state.incrementQaAttempts()

        const qaMsg: ChatMessage = {
          id: crypto.randomUUID(),
          project_id: '',
          role: 'agent',
          agent_name: 'qa',
          content: `Detected ${qaErrors.length} runtime error(s). Auto-fix attempt ${attempt}/${MAX_QA_ATTEMPTS}...`,
          content_type: 'text',
          metadata: {},
          created_at: new Date().toISOString(),
        }
        state.addMessage(qaMsg)

        // Clear errors before fix attempt (will be re-populated by listener)
        const errorSummary = qaErrors.slice(0, 5).join('\n')
        state.setQaErrors([])

        sendMessage('', { error: errorSummary })
      }, ERROR_STABILIZATION_DELAY)
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [isGenerating, qaEnabled, sendMessage])
}
