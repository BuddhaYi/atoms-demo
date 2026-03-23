'use client'

import { ListChecks } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'

interface FeatureListCardProps {
  content: string
}

export function FeatureListCard({ content }: FeatureListCardProps) {
  const { t } = useTranslation()
  const items = content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => line.replace(/^\d+\.\s*/, ''))

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
