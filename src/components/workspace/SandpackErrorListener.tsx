'use client'

import { useEffect, useRef } from 'react'
import { useSandpackClient } from '@codesandbox/sandpack-react'

interface SandpackErrorListenerProps {
  onError: (errors: string[]) => void
}

/**
 * Headless component that listens for runtime errors from Sandpack iframe.
 * Must be rendered inside a SandpackProvider.
 */
export function SandpackErrorListener({ onError }: SandpackErrorListenerProps) {
  const { listen } = useSandpackClient()
  const errorsRef = useRef<Set<string>>(new Set())
  const reportedRef = useRef<string>('')

  useEffect(() => {
    // Reset collected errors when files change (new compilation)
    errorsRef.current = new Set()
    reportedRef.current = ''
  }, [])

  useEffect(() => {
    const unsub = listen((msg) => {
      // Handle console errors
      if (msg.type === 'console' && 'log' in msg) {
        for (const entry of msg.log) {
          if (entry.method === 'error' && entry.data?.length > 0) {
            const errorText = entry.data.join(' ')
            errorsRef.current.add(errorText)
          }
        }
      }

      // Handle show-error actions (compilation/runtime errors)
      if (msg.type === 'action' && 'action' in msg && msg.action === 'show-error') {
        const errorMsg = ('message' in msg && msg.message) || ('title' in msg && msg.title) || 'Unknown error'
        errorsRef.current.add(String(errorMsg))
      }

      // On successful compilation, clear errors
      if (msg.type === 'success') {
        errorsRef.current = new Set()
      }

      // Report errors after done event (bundling complete)
      if (msg.type === 'done') {
        const errors = Array.from(errorsRef.current)
        const fingerprint = errors.sort().join('|||')

        // Only report if errors changed from last report
        if (fingerprint !== reportedRef.current) {
          reportedRef.current = fingerprint
          onError(errors)
        }
      }
    })

    return unsub
  }, [listen, onError])

  return null
}
