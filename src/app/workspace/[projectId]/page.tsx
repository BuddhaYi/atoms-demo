'use client'

import { useEffect, useCallback, useState } from 'react'
import { useWorkspaceStore } from '@/store/workspace-store'
import { useChat } from '@/hooks/useChat'
import { ChatPanel } from '@/components/workspace/ChatPanel'
import { PreviewPanel } from '@/components/workspace/PreviewPanel'
import { TopBar } from '@/components/workspace/TopBar'
import { apiClient } from '@/lib/api-client'
import { useParams } from 'next/navigation'

export default function WorkspacePage() {
  const params = useParams()
  const projectId = params.projectId as string
  const { setProjectId, setProjectTitle, reset, messages, versions } = useWorkspaceStore()
  const { sendMessage } = useChat()
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null)

  // Step 1: Initialize workspace — load from API
  useEffect(() => {
    reset()
    setProjectId(projectId)

    const loadData = async () => {
      const [project, savedMessages, savedVersions] = await Promise.all([
        apiClient.getProject(projectId),
        apiClient.getMessages(projectId),
        apiClient.getVersions(projectId),
      ])

      setProjectTitle(project ? project.title : 'New Project')

      if (savedMessages.length > 0) {
        useWorkspaceStore.setState({ messages: savedMessages })
      }
      if (savedVersions.length > 0) {
        const latest = savedVersions[savedVersions.length - 1]
        useWorkspaceStore.setState({
          versions: savedVersions,
          currentVersionNumber: latest.version_number,
          currentCode: latest.files,
        })
      }

      // Queue auto-send if new project
      if (savedMessages.length === 0) {
        const storageKey = `project_${projectId}_prompt`
        const initialPrompt = sessionStorage.getItem(storageKey)
        if (initialPrompt) {
          sessionStorage.removeItem(storageKey)
          setPendingPrompt(initialPrompt)
        }
      }
    }

    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  // Step 2: Auto-send queued prompt (separate effect, fires after state settles)
  useEffect(() => {
    if (pendingPrompt) {
      setPendingPrompt(null)
      sendMessage(pendingPrompt)
    }
  }, [pendingPrompt, sendMessage])

  // Auto-save messages to server
  useEffect(() => {
    if (messages.length > 0) {
      apiClient.saveMessages(projectId, messages)
    }
  }, [projectId, messages])

  // Auto-save versions to server
  useEffect(() => {
    if (versions.length > 0) {
      apiClient.saveVersions(projectId, versions)
    }
  }, [projectId, versions])

  const handleExport = useCallback(async () => {
    const { currentCode } = useWorkspaceStore.getState()
    if (Object.keys(currentCode).length === 0) return

    const JSZip = (await import('jszip')).default
    const zip = new JSZip()

    // Add generated files
    for (const [filename, content] of Object.entries(currentCode)) {
      const cleanName = filename.startsWith('/') ? filename.slice(1) : filename
      zip.file(`src/${cleanName}`, content)
    }

    // Add package.json
    zip.file(
      'package.json',
      JSON.stringify(
        {
          name: 'atoms-demo-export',
          version: '1.0.0',
          private: true,
          dependencies: {
            react: '^18.3.0',
            'react-dom': '^18.3.0',
            recharts: '^2.15.0',
            'lucide-react': '^0.460.0',
            'date-fns': '^4.1.0',
            'react-scripts': '5.0.1',
          },
          scripts: {
            start: 'react-scripts start',
            build: 'react-scripts build',
          },
        },
        null,
        2
      )
    )

    // Add README
    zip.file(
      'README.md',
      `# Exported from Atoms Demo\n\n## Setup\n\n\`\`\`bash\nnpm install\nnpm start\n\`\`\`\n\nGenerated with [Atoms Demo](https://atoms-demo.vercel.app)\n`
    )

    const blob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'atoms-demo-export.zip'
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  return (
    <div className="h-screen flex flex-col">
      <TopBar onExport={handleExport} />
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
        {/* Chat Panel - left 40% on desktop, full width on mobile */}
        <div className="h-1/2 md:h-auto md:w-[40%] md:min-w-[320px] border-b md:border-b-0 md:border-r border-border flex flex-col min-h-0">
          <ChatPanel />
        </div>
        {/* Preview Panel - right 60% on desktop, full width on mobile */}
        <div className="h-1/2 md:h-auto flex-1 flex flex-col min-h-0">
          <PreviewPanel />
        </div>
      </div>
    </div>
  )
}
