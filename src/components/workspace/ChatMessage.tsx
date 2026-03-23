'use client'

import type { ChatMessage as ChatMessageType } from '@/types'
import { AGENTS } from '@/lib/agents/registry'
import { FeatureListCard } from './FeatureListCard'
import { ArchitectureCard } from './ArchitectureCard'

interface ChatMessageProps {
  message: ChatMessageType
}

export function ChatMessage({ message }: ChatMessageProps) {
  if (message.role === 'system') {
    return (
      <div className="flex justify-center my-2">
        <div className="px-3 py-1.5 bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 text-sm rounded-full">
          {message.content}
        </div>
      </div>
    )
  }

  if (message.role === 'user') {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-[80%] px-4 py-3 bg-primary text-primary-foreground rounded-2xl rounded-br-md">
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    )
  }

  // Agent message
  const agent = message.agent_name ? AGENTS[message.agent_name] : null

  return (
    <div className="flex gap-3 mb-4">
      {agent && (
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 mt-0.5"
          style={{ backgroundColor: agent.color + '20', color: agent.color }}
        >
          {agent.emoji}
        </div>
      )}
      <div className="flex-1 min-w-0">
        {agent && (
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm">{agent.displayName}</span>
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ backgroundColor: agent.color + '15', color: agent.color }}
            >
              {agent.role}
            </span>
          </div>
        )}
        <div className="text-sm">
          {message.content_type === 'feature_list' ? (
            <FeatureListCard content={message.content} />
          ) : message.content_type === 'architecture' ? (
            <ArchitectureCard content={message.content} />
          ) : (
            <div className="bg-muted/50 rounded-xl px-4 py-3 whitespace-pre-wrap">
              {message.content}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
