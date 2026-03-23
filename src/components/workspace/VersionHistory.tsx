'use client'

import { Clock, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useWorkspaceStore } from '@/store/workspace-store'
import { useTranslation } from '@/hooks/useTranslation'

export function VersionHistory() {
  const { versions, currentVersionNumber, rollbackToVersion } = useWorkspaceStore()
  const { t } = useTranslation()

  if (versions.length === 0) return null

  return (
    <div className="border-t border-border bg-background">
      <div className="px-3 py-2 flex items-center gap-2 text-xs text-muted-foreground">
        <Clock className="w-3 h-3" />
        <span>{t('ver.versions')}</span>
      </div>
      <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto">
        {versions.map((v) => (
          <button
            key={v.version_number}
            onClick={() => rollbackToVersion(v.version_number)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors ${
              v.version_number === currentVersionNumber
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-accent text-muted-foreground'
            }`}
          >
            <span>v{v.version_number}</span>
            {v.version_number !== currentVersionNumber && (
              <RotateCcw className="w-3 h-3 opacity-60" />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
