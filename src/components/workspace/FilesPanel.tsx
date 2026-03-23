'use client'

import { FileCode, Download, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/hooks/useTranslation'

interface FilesPanelProps {
  files: Record<string, string>
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(filename: string): string {
  if (filename.endsWith('.js') || filename.endsWith('.jsx')) return 'JS'
  if (filename.endsWith('.ts') || filename.endsWith('.tsx')) return 'TS'
  if (filename.endsWith('.css')) return 'CSS'
  if (filename.endsWith('.json')) return 'JSON'
  if (filename.endsWith('.html')) return 'HTML'
  return 'FILE'
}

export function FilesPanel({ files }: FilesPanelProps) {
  const { t } = useTranslation()
  const [copiedFile, setCopiedFile] = useState<string | null>(null)

  const entries = Object.entries(files).map(([name, content]) => ({
    name: name.startsWith('/') ? name : `/${name}`,
    content,
    size: new Blob([content]).size,
  }))

  const totalSize = entries.reduce((sum, f) => sum + f.size, 0)

  const handleCopy = async (name: string, content: string) => {
    await navigator.clipboard.writeText(content)
    setCopiedFile(name)
    setTimeout(() => setCopiedFile(null), 2000)
  }

  const handleDownloadAll = () => {
    const allContent = entries
      .map((f) => `// === ${f.name} ===\n${f.content}`)
      .join('\n\n')
    const blob = new Blob([allContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'project-files.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="text-sm text-muted-foreground">
          {entries.length} {t('files.fileCount')} &middot; {formatBytes(totalSize)}
        </div>
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleDownloadAll}>
          <Download className="w-3 h-3 mr-1" />
          {t('files.downloadAll')}
        </Button>
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full">
          <thead>
            <tr className="text-xs text-muted-foreground border-b border-border">
              <th className="text-left px-4 py-2 font-medium">{t('files.name')}</th>
              <th className="text-right px-4 py-2 font-medium">{t('files.size')}</th>
              <th className="text-right px-4 py-2 font-medium w-20"></th>
            </tr>
          </thead>
          <tbody>
            {entries.map((file) => (
              <tr
                key={file.name}
                className="border-b border-border/50 hover:bg-muted/50 transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                      <span className="text-[10px] font-bold text-muted-foreground">
                        {getFileIcon(file.name)}
                      </span>
                    </div>
                    <div>
                      <div className="text-sm font-medium">{file.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {file.content.split('\n').length} {t('files.lines')}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-sm text-muted-foreground">
                  {formatBytes(file.size)}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => handleCopy(file.name, file.content)}
                  >
                    {copiedFile === file.name ? (
                      <Check className="w-3.5 h-3.5 text-green-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
