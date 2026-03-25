'use client'

import { AGENTS } from '@/lib/agents/registry'
import { useWorkspaceStore } from '@/store/workspace-store'
import { Check, Loader2 } from 'lucide-react'

const ORCHESTRATOR_SEQUENCE = ['emma', 'bob', 'alex'] as const

export function AgentTimeline() {
  const activeAgent = useWorkspaceStore((s) => s.activeAgent)
  const messages = useWorkspaceStore((s) => s.messages)

  // Determine which agents have completed (appeared in messages with agent_end)
  const completedAgents = new Set<string>()
  for (const msg of messages) {
    if (msg.role === 'agent' && msg.agent_name && msg.content) {
      completedAgents.add(msg.agent_name)
    }
  }

  // If active agent exists, it's not completed yet
  if (activeAgent) {
    completedAgents.delete(activeAgent)
  }

  return (
    <div className="flex items-center gap-1 px-4 py-2 border-b border-border bg-muted/30">
      {ORCHESTRATOR_SEQUENCE.map((name, idx) => {
        const agent = AGENTS[name]
        const isActive = activeAgent === name
        const isCompleted = completedAgents.has(name)
        const isPending = !isActive && !isCompleted

        return (
          <div key={name} className="flex items-center gap-1">
            {idx > 0 && (
              <div className={`w-6 h-px ${isCompleted || isActive ? 'bg-primary' : 'bg-border'}`} />
            )}
            <div
              className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-all ${
                isActive
                  ? 'bg-primary/10 text-primary ring-1 ring-primary/30'
                  : isCompleted
                  ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              <span className="text-sm">{agent.emoji}</span>
              <span>{agent.displayName}</span>
              {isActive && <Loader2 className="w-3 h-3 animate-spin" />}
              {isCompleted && <Check className="w-3 h-3" />}
              {isPending && <span className="w-3 h-3" />}
            </div>
          </div>
        )
      })}
    </div>
  )
}
