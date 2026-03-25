'use client'

import { useState } from 'react'
import { Brain, ChevronDown, ChevronRight } from 'lucide-react'

interface ThinkingBlockProps {
  content: string
}

export function ThinkingBlock({ content }: ThinkingBlockProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded-lg border border-border bg-muted/20 text-xs">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-muted/50 rounded-lg transition-colors"
      >
        {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        <Brain className="w-3.5 h-3.5 text-violet-500" />
        <span className="font-medium text-muted-foreground italic">Thinking...</span>
      </button>
      {expanded && (
        <div className="px-3 pb-2">
          <p className="whitespace-pre-wrap text-[11px] text-muted-foreground italic leading-relaxed">
            {content}
          </p>
        </div>
      )}
    </div>
  )
}
