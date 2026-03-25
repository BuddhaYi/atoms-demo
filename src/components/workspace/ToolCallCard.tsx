'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, FileText, FolderOpen, Terminal, PenLine } from 'lucide-react'

interface ToolCallCardProps {
  toolName: string
  content: string
  isError?: boolean
  isResult?: boolean
}

const TOOL_ICONS: Record<string, typeof FileText> = {
  read_file: FileText,
  write_file: PenLine,
  list_files: FolderOpen,
  run_command: Terminal,
}

const TOOL_LABELS: Record<string, string> = {
  read_file: 'Read File',
  write_file: 'Write File',
  list_files: 'List Files',
  run_command: 'Run Command',
}

export function ToolCallCard({ toolName, content, isError, isResult }: ToolCallCardProps) {
  const [expanded, setExpanded] = useState(false)
  const Icon = TOOL_ICONS[toolName] || Terminal
  const label = TOOL_LABELS[toolName] || toolName

  const truncatedContent = content.length > 200 ? content.slice(0, 200) + '...' : content
  const needsExpand = content.length > 200

  return (
    <div className={`rounded-lg border text-xs ${isError ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950' : 'border-border bg-muted/30'}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-muted/50 rounded-lg transition-colors"
      >
        {expanded ? <ChevronDown className="w-3 h-3 shrink-0" /> : <ChevronRight className="w-3 h-3 shrink-0" />}
        <Icon className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
        <span className="font-medium">{label}</span>
        {isResult && (
          <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded ${isError ? 'bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-200' : 'bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-200'}`}>
            {isError ? 'error' : 'done'}
          </span>
        )}
      </button>
      {expanded && (
        <div className="px-3 pb-2">
          <pre className="whitespace-pre-wrap break-all text-[11px] text-muted-foreground leading-relaxed max-h-[300px] overflow-auto">
            {content}
          </pre>
        </div>
      )}
      {!expanded && needsExpand && (
        <div className="px-3 pb-2">
          <pre className="whitespace-pre-wrap break-all text-[11px] text-muted-foreground leading-relaxed">
            {truncatedContent}
          </pre>
        </div>
      )}
    </div>
  )
}
