'use client'

import {
  SandpackProvider,
  SandpackPreview as SandpackPreviewComponent,
  SandpackConsole,
} from '@codesandbox/sandpack-react'
import type { PreviewDevice } from '@/types'

interface SandpackPreviewProps {
  files: Record<string, string>
  device: PreviewDevice
  showConsole: boolean
  onConsoleError?: (error: string) => void
}

export function SandpackPreview({
  files,
  device,
  showConsole,
}: SandpackPreviewProps) {
  // Transform file keys to ensure they start with /
  const sandpackFiles: Record<string, string> = {}
  for (const [key, value] of Object.entries(files)) {
    const normalizedKey = key.startsWith('/') ? key : `/${key}`
    sandpackFiles[normalizedKey] = value
  }

  // Ensure we have at minimum an App.js
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

  return (
    <div className="h-full flex flex-col sandpack-container">
      {/* Hide stuck Sandpack loading overlay - content renders fine behind it */}
      <style>{`.sandpack-container .sp-overlay { display: none !important; }`}</style>
      <div
        className="flex-1 overflow-hidden"
        style={{
          maxWidth: device === 'mobile' ? '375px' : '100%',
          margin: device === 'mobile' ? '0 auto' : undefined,
          border: device === 'mobile' ? '8px solid #1f2937' : undefined,
          borderRadius: device === 'mobile' ? '32px' : undefined,
          padding: device === 'mobile' ? '0' : undefined,
        }}
      >
        <SandpackProvider
          template="react"
          files={sandpackFiles}
          customSetup={{
            dependencies: {
              recharts: '2.15.0',
              'lucide-react': '0.460.0',
              'date-fns': '4.1.0',
            },
          }}
          options={{
            externalResources: ['https://cdn.tailwindcss.com'],
          }}
          theme="auto"
        >
          <SandpackPreviewComponent
            style={{ height: '100%', minHeight: '400px' }}
            showOpenInCodeSandbox={false}
            showRefreshButton={true}
          />
          {showConsole && (
            <div className="h-40 border-t border-border">
              <SandpackConsole
                style={{ height: '100%' }}
                showHeader={true}
              />
            </div>
          )}
        </SandpackProvider>
      </div>
    </div>
  )
}
