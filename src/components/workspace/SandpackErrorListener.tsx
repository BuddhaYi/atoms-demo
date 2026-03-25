'use client'

import { useEffect, useRef, useCallback } from 'react'
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
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const reportErrors = useCallback(() => {
    const errors = Array.from(errorsRef.current)
    const fingerprint = errors.sort().join('|||')

    if (fingerprint !== reportedRef.current) {
      reportedRef.current = fingerprint
      onError(errors)
    }
  }, [onError])

  useEffect(() => {
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

        // Debounced report — show-error may come before or after done
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(reportErrors, 1000)
      }

      // On successful compilation, clear errors
      if (msg.type === 'success') {
        errorsRef.current = new Set()
        if (debounceRef.current) clearTimeout(debounceRef.current)
      }

      // Report errors after done event
      if (msg.type === 'done') {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        // Small delay to catch late show-error events
        debounceRef.current = setTimeout(reportErrors, 500)
      }
    })

    return () => {
      unsub()
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [listen, reportErrors])

  return null
}
