'use client'

import { useWorkspaceStore } from '@/store/workspace-store'
import { useChatDispatch } from '@/hooks/useChatDispatch'
import { useTranslation } from '@/hooks/useTranslation'
import { Sparkles } from 'lucide-react'

interface PromptOptionsCardProps {
  content: string
}

export function PromptOptionsCard({ content }: PromptOptionsCardProps) {
  const { t } = useTranslation()
  const { selectPrompt } = useChatDispatch()
  const awaitingSelection = useWorkspaceStore((s) => s.awaitingPromptSelection)
  const pendingOptions = useWorkspaceStore((s) => s.pendingPromptOptions)
  const isGenerating = useWorkspaceStore((s) => s.isGenerating)

  // Parse options from content for display
  const lines = content
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  if (!awaitingSelection || !pendingOptions) {
    // Static display after selection
    return (
      <div className="bg-muted/50 rounded-xl px-4 py-3">
        <div className="flex items-center gap-2 mb-2 text-amber-600 dark:text-amber-400">
          <Sparkles className="w-4 h-4" />
          <span className="font-semibold text-sm">{t('optimize.title')}</span>
        </div>
        <div className="space-y-1 text-sm whitespace-pre-wrap">{content}</div>
      </div>
    )
  }

  // Interactive selection mode
  return (
    <div className="bg-muted/50 rounded-xl px-4 py-3">
      <div className="flex items-center gap-2 mb-2 text-amber-600 dark:text-amber-400">
        <Sparkles className="w-4 h-4" />
        <span className="font-semibold text-sm">{t('optimize.title')}</span>
      </div>
      <p className="text-xs text-muted-foreground mb-3">{t('optimize.hint')}</p>
      <div className="space-y-2">
        {pendingOptions.map((option, i) => {
          // Split "**title**: description" format
          const boldMatch = option.match(/^\*\*(.+?)\*\*[：:]\s*(.+)$/)
          const title = boldMatch ? boldMatch[1] : `${t('optimize.option')} ${i + 1}`
          const desc = boldMatch ? boldMatch[2] : option

          return (
            <button
              key={i}
              disabled={isGenerating}
              onClick={() => selectPrompt(desc)}
              className="w-full text-left p-3 rounded-lg border border-border hover:border-amber-500/50 hover:bg-amber-500/5 transition-colors group"
            >
              <div className="flex items-start gap-2">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-xs font-bold shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <div>
                  <span className="font-medium text-sm text-foreground group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                    {title}
                  </span>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
