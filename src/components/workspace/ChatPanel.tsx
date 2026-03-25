'use client'

import { useEffect, useRef } from 'react'
import { useWorkspaceStore } from '@/store/workspace-store'
import { useChatDispatch } from '@/hooks/useChatDispatch'
import { useTranslation } from '@/hooks/useTranslation'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'
import { AgentIndicator } from './AgentIndicator'
import { AgentTimeline } from './AgentTimeline'

export function ChatPanel() {
  const { messages, activeAgent, isGenerating, mode, multiAgent } = useWorkspaceStore()
  const { sendMessage, stopGeneration } = useChatDispatch()
  const { t } = useTranslation()
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, activeAgent])

  const showTimeline = mode === 'agent' && multiAgent && isGenerating

  return (
    <div className="flex flex-col h-full">
      {/* Agent Timeline (multi-agent mode) */}
      {showTimeline && <AgentTimeline />}
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-1">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <p className="text-lg font-medium mb-1">{t('chat.startBuilding')}</p>
              <p className="text-sm">{t('chat.describeCreate')}</p>
            </div>
          </div>
        )}
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        {isGenerating && !activeAgent && (
          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm bg-primary/10">
              <span className="animate-spin text-primary">⚙</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">AI 团队正在思考</span>
              <div className="flex gap-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        {activeAgent && <AgentIndicator agentName={activeAgent} />}
      </div>

      {/* Input */}
      <ChatInput
        onSend={sendMessage}
        onStop={stopGeneration}
        isGenerating={isGenerating}
        placeholder={
          messages.length === 0
            ? t('chat.placeholderFirst')
            : t('chat.placeholderFollowup')
        }
      />
    </div>
  )
}
