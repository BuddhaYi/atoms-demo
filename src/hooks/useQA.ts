'use client'

import { useEffect, useRef } from 'react'
import { useWorkspaceStore } from '@/store/workspace-store'
import type { ChatMessage } from '@/types'

const MAX_QA_ATTEMPTS = 3
const ERROR_STABILIZATION_DELAY = 5000

type SendMessageFn = (message: string, options?: { error?: string }) => Promise<void>

export function useQA(sendMessage: SendMessageFn) {
  const isGenerating = useWorkspaceStore((s) => s.isGenerating)
  const qaEnabled = useWorkspaceStore((s) => s.qaEnabled)
  const qaErrors = useWorkspaceStore((s) => s.qaErrors)
  const qaAttempts = useWorkspaceStore((s) => s.qaAttempts)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const triggeringRef = useRef(false)

  useEffect(() => {
    // Clear timer when generation starts
    if (isGenerating) {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      triggeringRef.current = false
      return
    }

    // Not generating — check if there are errors to fix
    if (!qaEnabled || qaErrors.length === 0 || triggeringRef.current) {
      // No errors or already triggering — reset attempts on success
      if (!isGenerating && qaErrors.length === 0 && qaAttempts > 0 && !triggeringRef.current) {
        useWorkspaceStore.getState().resetQa()
      }
      return
    }

    if (qaAttempts >= MAX_QA_ATTEMPTS) {
      // Max attempts — notify user once
      if (timerRef.current) return
      const state = useWorkspaceStore.getState()
      const maxMsg: ChatMessage = {
        id: crypto.randomUUID(),
        project_id: '',
        role: 'agent',
        agent_name: 'qa',
        content: `Auto-fix attempt ${qaAttempts}/${MAX_QA_ATTEMPTS} — max attempts reached. Please fix manually or click "Fix Bug".`,
        content_type: 'text',
        metadata: {},
        created_at: new Date().toISOString(),
      }
      state.addMessage(maxMsg)
      state.setActiveAgent(null)
      return
    }

    // Errors detected while not generating — start stabilization timer
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    timerRef.current = setTimeout(() => {
      const state = useWorkspaceStore.getState()
      const { qaErrors: currentErrors, isGenerating: stillGenerating } = state

      // Double-check: still have errors and not generating
      if (currentErrors.length === 0 || stillGenerating || triggeringRef.current) return

      triggeringRef.current = true
      const attempt = state.qaAttempts + 1
      state.setActiveAgent('qa')
      state.incrementQaAttempts()

      const qaMsg: ChatMessage = {
        id: crypto.randomUUID(),
        project_id: '',
        role: 'agent',
        agent_name: 'qa',
        content: `Detected ${currentErrors.length} runtime error(s). Auto-fix attempt ${attempt}/${MAX_QA_ATTEMPTS}...`,
        content_type: 'text',
        metadata: {},
        created_at: new Date().toISOString(),
      }
      state.addMessage(qaMsg)

      const errorSummary = currentErrors.slice(0, 5).join('\n')
      state.setQaErrors([])

      sendMessage('', { error: errorSummary }).finally(() => {
        triggeringRef.current = false
      })
    }, ERROR_STABILIZATION_DELAY)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [isGenerating, qaEnabled, qaErrors, qaAttempts, sendMessage])
}
