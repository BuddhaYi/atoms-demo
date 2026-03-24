'use client'

import { useCallback } from 'react'
import {
  SandpackProvider,
  SandpackPreview as SandpackPreviewComponent,
  SandpackConsole,
} from '@codesandbox/sandpack-react'
import type { PreviewDevice } from '@/types'
import { useWorkspaceStore } from '@/store/workspace-store'
import { SandpackErrorListener } from './SandpackErrorListener'

/* Force Sandpack internals to fill parent via absolute positioning */
const SANDPACK_STYLES = `
.sp-preview-fill .sp-overlay { display: none !important; }
.sp-preview-fill,
.sp-preview-fill .sp-wrapper,
.sp-preview-fill .sp-layout,
.sp-preview-fill .sp-preview,
.sp-preview-fill .sp-preview-container {
  position: absolute !important;
  inset: 0 !important;
  height: 100% !important;
  width: 100% !important;
}
.sp-preview-fill .sp-layout {
  border: none !important;
  border-radius: 0 !important;
  background: transparent !important;
}
.sp-preview-fill .sp-preview-iframe {
  height: 100% !important;
  width: 100% !important;
}
.sp-preview-fill .sp-preview-actions {
  position: absolute !important;
  bottom: 8px !important;
  right: 8px !important;
  z-index: 10 !important;
}
/* Make provider wrapper participate in flex layout */
.sp-unified > .sp-wrapper {
  flex: 1 !important;
  display: flex !important;
  flex-direction: column !important;
  min-height: 0 !important;
}
.sp-unified > .sp-wrapper > .sp-stack {
  flex: 1 !important;
  display: flex !important;
  flex-direction: column !important;
  min-height: 0 !important;
}
`

interface SandpackPreviewProps {
  files: Record<string, string>
  device: PreviewDevice
  showConsole: boolean
}

export function SandpackPreview({
  files,
  device,
  showConsole,
}: SandpackPreviewProps) {
  const sandpackFiles: Record<string, string> = {}
  for (const [key, value] of Object.entries(files)) {
    const normalizedKey = key.startsWith('/') ? key : `/${key}`
    sandpackFiles[normalizedKey] = value
  }

  if (!sandpackFiles['/App.js'] && !sandpackFiles['/App.tsx']) {
    sandpackFiles['/App.js'] = `export default function App() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Ready to Build</h1>
        <p className="text-gray-500">Describe what you want and the agents will build it</p>
      </div>
    </div>
  )
}`
  }

  const handleErrors = useCallback((errors: string[]) => {
    useWorkspaceStore.getState().setQaErrors(errors)
  }, [])

  const providerProps = {
    template: 'react' as const,
    files: sandpackFiles,
    customSetup: {
      dependencies: {
        recharts: '2.15.0',
        'lucide-react': '0.460.0',
        'date-fns': '4.1.0',
      },
    },
    options: {
      externalResources: ['https://cdn.tailwindcss.com'],
    },
    theme: 'auto' as const,
  }

  return (
    <div className="h-full flex flex-col min-h-0 sp-unified">
      <style>{SANDPACK_STYLES}</style>

      <SandpackProvider {...providerProps}>
        <SandpackErrorListener onError={handleErrors} />
        {/* Preview - fills available space */}
        <div
          className="flex-1 min-h-0 relative"
          style={{
            maxWidth: device === 'mobile' ? '375px' : undefined,
            margin: device === 'mobile' ? '0 auto' : undefined,
            border: device === 'mobile' ? '8px solid #1f2937' : undefined,
            borderRadius: device === 'mobile' ? '32px' : undefined,
            overflow: 'hidden',
            width: device === 'mobile' ? '375px' : '100%',
          }}
        >
          <div className="absolute inset-0 sp-preview-fill">
            <SandpackPreviewComponent
              showOpenInCodeSandbox={false}
              showRefreshButton={true}
            />
          </div>
        </div>

        {/* Console - fixed height panel at bottom, SAME provider as preview */}
        {showConsole && (
          <div className="h-48 min-h-[192px] border-t border-border shrink-0">
            <SandpackConsole
              style={{ height: '100%' }}
              showHeader={true}
            />
          </div>
        )}
      </SandpackProvider>
    </div>
  )
}
