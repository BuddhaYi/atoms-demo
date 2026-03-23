'use client'

import {
  SandpackProvider,
  SandpackCodeEditor,
  SandpackFileExplorer,
} from '@codesandbox/sandpack-react'

const EDITOR_STYLES = `
.sp-editor-fill,
.sp-editor-fill > .sp-wrapper {
  height: 100% !important;
}
.sp-editor-fill .sp-layout {
  height: 100% !important;
  border: none !important;
  border-radius: 0 !important;
  background: transparent !important;
}
.sp-editor-fill .sp-file-explorer {
  min-width: 180px !important;
  max-width: 220px !important;
  height: 100% !important;
  overflow-y: auto !important;
  border-right: 1px solid var(--sp-colors-surface2) !important;
}
.sp-editor-fill .sp-code-editor {
  flex: 1 !important;
  height: 100% !important;
  overflow: auto !important;
}
`

interface CodeEditorPanelProps {
  files: Record<string, string>
}

export function CodeEditorPanel({ files }: CodeEditorPanelProps) {
  const sandpackFiles: Record<string, string> = {}
  for (const [key, value] of Object.entries(files)) {
    const normalizedKey = key.startsWith('/') ? key : `/${key}`
    sandpackFiles[normalizedKey] = value
  }

  if (!sandpackFiles['/App.js'] && !sandpackFiles['/App.tsx']) {
    sandpackFiles['/App.js'] = '// No code generated yet'
  }

  return (
    <div className="h-full sp-editor-fill">
      <style>{EDITOR_STYLES}</style>
      <SandpackProvider
        template="react"
        files={sandpackFiles}
        theme="auto"
      >
        <div className="flex h-full">
          <SandpackFileExplorer />
          <SandpackCodeEditor
            readOnly
            showLineNumbers
            showTabs
            style={{ flex: 1, height: '100%' }}
          />
        </div>
      </SandpackProvider>
    </div>
  )
}
