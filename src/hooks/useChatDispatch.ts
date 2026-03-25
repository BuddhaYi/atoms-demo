'use client'

import { useCallback } from 'react'
import { useWorkspaceStore } from '@/store/workspace-store'
import { useChat } from './useChat'
import { useAgentChat } from './useAgentChat'

export function useChatDispatch() {
  const mode = useWorkspaceStore((s) => s.mode)
  const chat = useChat()
  const agentChat = useAgentChat()

  const sendMessage = useCallback(
    async (message: string, options?: { error?: string; phase?: 'optimize' | 'plan' | 'implement'; approvedFeatures?: string[] }) => {
      if (mode === 'agent') {
        return agentChat.sendMessage(message)
      }
      return chat.sendMessage(message, options)
    },
    [mode, chat, agentChat]
  )

  const stopGeneration = useCallback(() => {
    if (mode === 'agent') {
      agentChat.stopGeneration()
    } else {
      chat.stopGeneration()
    }
  }, [mode, chat, agentChat])

  return {
    sendMessage,
    selectPrompt: chat.selectPrompt,
    approveFeatures: chat.approveFeatures,
    stopGeneration,
    isGenerating: chat.isGenerating || agentChat.isGenerating,
  }
}
