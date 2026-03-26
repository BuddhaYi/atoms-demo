'use client'

import { useEffect, useRef, useState } from 'react'
import {
  SandpackProvider,
  SandpackCodeEditor,
  SandpackFileExplorer,
} from '@codesandbox/sandpack-react'
import { useWorkspaceStore } from '@/store/workspace-store'

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
  const streamingFileContent = useWorkspaceStore((s) => s.streamingFileContent)
  const activeEditorFile = useWorkspaceStore((s) => s.activeEditorFile)

  const sandpackFiles: Record<string, string> = {}
  for (const [key, value] of Object.entries(files)) {
    const normalizedKey = key.startsWith('/') ? key : `/${key}`
    sandpackFiles[normalizedKey] = value
  }

  if (!sandpackFiles['/App.js'] && !sandpackFiles['/App.tsx']) {
    sandpackFiles['/App.js'] = '// No code generated yet'
  }

  // If streaming, show the live typing overlay instead of Sandpack editor
  if (streamingFileContent) {
    return (
      <div className="h-full flex">
        {/* File list sidebar */}
        <div className="w-[200px] border-r border-border bg-muted/30 overflow-y-auto p-2 shrink-0">
          <div className="text-xs font-medium text-muted-foreground mb-2 px-2">Files</div>
          {Object.keys(sandpackFiles).sort().map((path) => (
            <div
              key={path}
              className={`text-xs px-2 py-1.5 rounded cursor-default truncate ${
                path === streamingFileContent.path
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground'
              }`}
            >
              {path}
            </div>
          ))}
        </div>
        {/* Live code streaming */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/20">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-medium text-muted-foreground">
              Writing {streamingFileContent.path}
            </span>
          </div>
          <LiveCodeView
            lines={streamingFileContent.lines}
            currentLine={streamingFileContent.currentLine}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="h-full sp-editor-fill">
      <style>{EDITOR_STYLES}</style>
      <SandpackProvider
        template="react"
        files={sandpackFiles}
        theme="auto"
        options={{
          activeFile: activeEditorFile || undefined,
        }}
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

function LiveCodeView({ lines, currentLine }: { lines: string[]; currentLine: number }) {
  const [visibleLines, setVisibleLines] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setVisibleLines(0)
    const total = lines.length
    let current = 0

    const timer = setInterval(() => {
      current += 3 // Show 3 lines per tick for speed
      if (current >= total) {
        current = total
        clearInterval(timer)
        // Clear streaming state when done
        useWorkspaceStore.getState().setStreamingFileContent(null)
      }
      setVisibleLines(current)
    }, 16) // ~60fps

    return () => clearInterval(timer)
  }, [lines])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [visibleLines])

  const displayLines = lines.slice(0, visibleLines)

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-auto bg-[#1e1e1e] font-mono text-[13px] leading-5"
    >
      <table className="w-full border-collapse">
        <tbody>
          {displayLines.map((line, i) => (
            <tr key={i} className="hover:bg-white/5">
              <td className="w-[50px] text-right pr-4 pl-2 text-[#858585] select-none shrink-0 align-top">
                {i + 1}
              </td>
              <td className="text-[#d4d4d4] whitespace-pre pr-4">
                {highlightLine(line)}
              </td>
            </tr>
          ))}
          {visibleLines < lines.length && (
            <tr>
              <td className="w-[50px] text-right pr-4 pl-2 text-[#858585]">
                {visibleLines + 1}
              </td>
              <td className="text-[#569cd6]">
                <span className="inline-block w-2 h-4 bg-[#569cd6] animate-pulse" />
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function highlightLine(line: string): string | React.ReactNode {
  // Simple syntax highlighting
  if (line.trimStart().startsWith('//') || line.trimStart().startsWith('*') || line.trimStart().startsWith('/*')) {
    return <span className="text-[#6a9955]">{line}</span>
  }
  if (line.trimStart().startsWith('import ') || line.trimStart().startsWith('export ')) {
    return <span className="text-[#c586c0]">{line}</span>
  }
  if (line.trimStart().startsWith('return ') || line.trimStart().startsWith('return(')) {
    return <span className="text-[#c586c0]">{line}</span>
  }
  return line
}
