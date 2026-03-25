'use client'

interface SandboxPreviewProps {
  url: string
}

/**
 * Preview component that renders an E2B sandbox URL in an iframe.
 * Used in Agent mode when E2B is configured.
 */
export function SandboxPreview({ url }: SandboxPreviewProps) {
  return (
    <div className="h-full w-full relative">
      <iframe
        src={url}
        className="absolute inset-0 w-full h-full border-0"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
        title="Sandbox Preview"
      />
    </div>
  )
}
