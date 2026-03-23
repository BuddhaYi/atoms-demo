'use client'

import { useEffect, useRef } from 'react'
import { useWorkspaceStore } from '@/store/workspace-store'
import { useChat } from '@/hooks/useChat'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'
import { AgentIndicator } from './AgentIndicator'

export function ChatPanel() {
  const { messages, activeAgent, isGenerating } = useWorkspaceStore()
  const { sendMessage, stopGeneration } = useChat()
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, activeAgent])

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-1">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <p className="text-lg font-medium mb-1">Start building</p>
              <p className="text-sm">Describe what you want to create</p>
            </div>
          </div>
        )}
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        {activeAgent && <AgentIndicator agentName={activeAgent} />}
      </div>

      {/* Input */}
      <ChatInput
        onSend={sendMessage}
        onStop={stopGeneration}
        isGenerating={isGenerating}
        placeholder={
          messages.length === 0
            ? 'Describe what you want to build...'
            : 'Ask for changes or additions...'
        }
      />
    </div>
  )
}
