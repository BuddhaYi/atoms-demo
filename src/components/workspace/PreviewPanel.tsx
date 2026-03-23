'use client'

import { Monitor, Smartphone, Terminal, Bug } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useWorkspaceStore } from '@/store/workspace-store'
import { useChat } from '@/hooks/useChat'
import { SandpackPreview } from './SandpackPreview'
import { VersionHistory } from './VersionHistory'

export function PreviewPanel() {
  const {
    currentCode,
    previewDevice,
    showConsole,
    setPreviewDevice,
    setShowConsole,
    isGenerating,
  } = useWorkspaceStore()
  const { sendMessage } = useChat()

  const hasCode = Object.keys(currentCode).length > 0

  return (
    <div className="flex flex-col h-full bg-muted/30">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-background">
        <div className="flex items-center gap-1">
          <Button
            variant={previewDevice === 'desktop' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setPreviewDevice('desktop')}
            className="h-8"
          >
            <Monitor className="w-4 h-4 mr-1" />
            Desktop
          </Button>
          <Button
            variant={previewDevice === 'mobile' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setPreviewDevice('mobile')}
            className="h-8"
          >
            <Smartphone className="w-4 h-4 mr-1" />
            Mobile
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
            Console
          </Button>
          {hasCode && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
              disabled={isGenerating}
              onClick={() => {
                sendMessage('', { error: 'Please review and fix any issues in the code' })
              }}
            >
              <Bug className="w-4 h-4 mr-1" />
              Fix Bug
            </Button>
          )}
        </div>
      </div>

      {/* Preview */}
      <div className="flex-1 overflow-hidden">
        {hasCode ? (
          <SandpackPreview
            files={currentCode}
            device={previewDevice}
            showConsole={showConsole}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <Monitor className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium mb-1">Preview</p>
              <p className="text-sm">Your app will appear here once generated</p>
            </div>
          </div>
        )}
      </div>

      {/* Version History */}
      <VersionHistory />
    </div>
  )
}
