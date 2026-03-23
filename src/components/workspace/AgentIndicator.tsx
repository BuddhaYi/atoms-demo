'use client'

import { AGENTS } from '@/lib/agents/registry'
import type { AgentName } from '@/types'

interface AgentIndicatorProps {
  agentName: AgentName
}

export function AgentIndicator({ agentName }: AgentIndicatorProps) {
  const agent = AGENTS[agentName]

  return (
    <div className="flex items-center gap-3 px-4 py-3 mb-2">
      <div className="relative">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
          style={{ backgroundColor: agent.color + '20', color: agent.color }}
        >
          {agent.emoji}
        </div>
        <span
          className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full animate-pulse border-2 border-background"
          style={{ backgroundColor: agent.color }}
        />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{agent.displayName}</span>
        <span className="text-xs text-muted-foreground">is {getAction(agentName)}...</span>
        <div className="flex gap-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  )
}

function getAction(agent: AgentName): string {
  const actions: Record<AgentName, string> = {
    mike: 'coordinating',
    emma: 'analyzing requirements',
    bob: 'designing architecture',
    alex: 'writing code',
    david: 'analyzing data',
    iris: 'researching',
    sarah: 'optimizing SEO',
  }
  return actions[agent]
}
