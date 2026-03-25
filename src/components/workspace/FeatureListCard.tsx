'use client'

import { ListChecks, Check, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useWorkspaceStore } from '@/store/workspace-store'
import { useChatDispatch } from '@/hooks/useChatDispatch'
import { useTranslation } from '@/hooks/useTranslation'

interface FeatureListCardProps {
  content: string
}

export function FeatureListCard({ content }: FeatureListCardProps) {
  const { t } = useTranslation()
  const { pendingFeatures, awaitingApproval, isGenerating } = useWorkspaceStore()
  const { toggleFeatureApproval, setAwaitingApproval, setPendingFeatures } = useWorkspaceStore()
  const { approveFeatures, sendMessage } = useChatDispatch()

  const items = content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => line.replace(/^\d+\.\s*/, ''))

  // Interactive mode: awaiting approval with checkboxes
  if (awaitingApproval && pendingFeatures) {
    const approvedCount = pendingFeatures.filter((f) => f.approved).length

    return (
      <div className="bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-400 dark:border-amber-600 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <ListChecks className="w-4 h-4 text-amber-600" />
          <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">
            {t('card.requirements')}
          </span>
        </div>
        <p className="text-xs text-amber-600 dark:text-amber-500 mb-3">
          {t('approval.reviewHint')}
        </p>
        <div className="space-y-2 mb-4">
          {pendingFeatures.map((feature, i) => (
            <label
              key={i}
              className="flex items-start gap-3 text-sm cursor-pointer group"
              onClick={() => toggleFeatureApproval(i)}
            >
              <span
                className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                  feature.approved
                    ? 'bg-amber-500 border-amber-500 text-white'
                    : 'border-gray-300 dark:border-gray-600 group-hover:border-amber-400'
                }`}
              >
                {feature.approved && <Check className="w-3 h-3" />}
              </span>
              <span
                className={`${
                  feature.approved
                    ? 'text-foreground/80'
                    : 'text-muted-foreground line-through'
                }`}
              >
                {feature.text}
              </span>
            </label>
          ))}
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-amber-200 dark:border-amber-800">
          <span className="text-xs text-amber-600 dark:text-amber-500">
            {approvedCount}/{pendingFeatures.length}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              disabled={isGenerating}
              onClick={() => {
                setAwaitingApproval(false)
                setPendingFeatures(null)
              }}
            >
              <Pencil className="w-3 h-3 mr-1" />
              {t('approval.editPlan')}
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white"
              disabled={approvedCount === 0 || isGenerating}
              onClick={approveFeatures}
            >
              <Check className="w-3 h-3 mr-1" />
              {t('approval.approve')}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Static mode: read-only list (after approval or in non-team mode)
  return (
    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <ListChecks className="w-4 h-4 text-amber-600" />
        <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">
          {t('card.requirements')}
        </span>
      </div>
      <ol className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm">
            <span className="w-5 h-5 rounded-full bg-amber-200 dark:bg-amber-800 text-amber-700 dark:text-amber-300 flex items-center justify-center text-xs shrink-0 mt-0.5">
              {i + 1}
            </span>
            <span className="text-foreground/80">{item}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
