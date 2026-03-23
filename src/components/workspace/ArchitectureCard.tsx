'use client'

import { Network } from 'lucide-react'

interface ArchitectureCardProps {
  content: string
}

export function ArchitectureCard({ content }: ArchitectureCardProps) {
  const lines = content.split('\n').filter((l) => l.trim().length > 0)

  return (
    <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Network className="w-4 h-4 text-rose-600" />
        <span className="text-sm font-semibold text-rose-700 dark:text-rose-400">
          Architecture
        </span>
      </div>
      <pre className="text-sm font-mono text-foreground/80 overflow-x-auto">
        {lines.map((line, i) => (
          <div key={i} className="leading-relaxed">
            {line}
          </div>
        ))}
      </pre>
    </div>
  )
}
