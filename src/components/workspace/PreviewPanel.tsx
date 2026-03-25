'use client'

import { useState } from 'react'
import { Monitor, Smartphone, Terminal, Bug, ClipboardCheck, Code2, FolderOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useWorkspaceStore } from '@/store/workspace-store'
import { useChatDispatch } from '@/hooks/useChatDispatch'
import { useTranslation } from '@/hooks/useTranslation'
import { SandpackPreview } from './SandpackPreview'
import { CodeEditorPanel } from './CodeEditorPanel'
import { FilesPanel } from './FilesPanel'
import { VersionHistory } from './VersionHistory'
import { ReviewPanel } from './ReviewPanel'

type ActiveView = 'preview' | 'editor' | 'files'

export function PreviewPanel() {
  const {
    currentCode,
    previewDevice,
    showConsole,
    setPreviewDevice,
    setShowConsole,
    isGenerating,
  } = useWorkspaceStore()
  const { sendMessage } = useChatDispatch()
  const { t } = useTranslation()
  const [showReview, setShowReview] = useState(false)
  const [activeView, setActiveView] = useState<ActiveView>('preview')

  const hasCode = Object.keys(currentCode).length > 0

  return (
    <div className="flex flex-col h-full bg-muted/30 relative">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-background">
        <div className="flex items-center gap-1">
          {/* Preview device buttons */}
          <Button
            variant={activeView === 'preview' && previewDevice === 'desktop' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => {
              setActiveView('preview')
              setPreviewDevice('desktop')
            }}
            className="h-8"
          >
            <Monitor className="w-4 h-4 mr-1" />
            {t('prev.desktop')}
          </Button>
          <Button
            variant={activeView === 'preview' && previewDevice === 'mobile' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => {
              setActiveView('preview')
              setPreviewDevice('mobile')
            }}
            className="h-8"
          >
            <Smartphone className="w-4 h-4 mr-1" />
            {t('prev.mobile')}
          </Button>

          {/* Separator */}
          <div className="w-px h-4 bg-border mx-1" />

          {/* Editor button */}
          <Button
            variant={activeView === 'editor' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setActiveView('editor')}
            className="h-8"
          >
            <Code2 className="w-4 h-4 mr-1" />
            {t('prev.editor')}
          </Button>

          {/* Files button */}
          <Button
            variant={activeView === 'files' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setActiveView('files')}
            className="h-8"
          >
            <FolderOpen className="w-4 h-4 mr-1" />
            {t('prev.files')}
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant={showConsole ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setShowConsole(!showConsole)}
            className="h-8"
          >
            <Terminal className="w-4 h-4 mr-1" />
            {t('prev.console')}
          </Button>
          {hasCode && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                disabled={isGenerating}
                onClick={() => setShowReview(true)}
              >
                <ClipboardCheck className="w-4 h-4 mr-1" />
                {t('review.button')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                disabled={isGenerating}
                onClick={() => {
                  sendMessage('', { error: t('prev.fixBugPrompt') })
                }}
              >
                <Bug className="w-4 h-4 mr-1" />
                {t('prev.fixBug')}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden min-h-0">
        {activeView === 'preview' && hasCode ? (
          <SandpackPreview
            files={currentCode}
            device={previewDevice}
            showConsole={showConsole}
          />
        ) : activeView === 'editor' && hasCode ? (
          <CodeEditorPanel files={currentCode} />
        ) : activeView === 'files' && hasCode ? (
          <FilesPanel files={currentCode} />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <Monitor className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium mb-1">{t('prev.title')}</p>
              <p className="text-sm">{t('prev.emptyMessage')}</p>
            </div>
          </div>
        )}
      </div>

      {/* Version History */}
      <VersionHistory />

      {/* Review Panel Overlay */}
      {showReview && <ReviewPanel onClose={() => setShowReview(false)} />}
    </div>
  )
}
