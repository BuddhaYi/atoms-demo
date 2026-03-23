'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useWorkspaceStore } from '@/store/workspace-store'
import { useTranslation } from '@/hooks/useTranslation'
import type { StreamEvent, ModelProvider } from '@/types'

interface ReviewScores {
  quality: number
  performance: number
  accessibility: number
  security: number
  overall: number
}

interface ReviewResult {
  scores: ReviewScores
  suggestions: string[]
}

function parseReviewContent(content: string): ReviewResult | null {
  const scorePattern = /(\w+):\s*(\d+)\/10/g
  const scores: Record<string, number> = {}
  let match: RegExpExecArray | null

  while ((match = scorePattern.exec(content)) !== null) {
    const key = match[1].toLowerCase()
    scores[key] = parseInt(match[2], 10)
  }

  const suggestionsMatch = content.match(/SUGGESTIONS:\n([\s\S]*?)$/)
  const suggestions = suggestionsMatch
    ? suggestionsMatch[1]
        .split('\n')
        .map((s) => s.replace(/^-\s*/, '').trim())
        .filter(Boolean)
    : []

  if (!scores.overall && !scores.quality) return null

  return {
    scores: {
      quality: scores.quality || 0,
      performance: scores.performance || 0,
      accessibility: scores.accessibility || 0,
      security: scores.security || 0,
      overall: scores.overall || 0,
    },
    suggestions,
  }
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  const color =
    score >= 8 ? 'bg-green-500' : score >= 6 ? 'bg-yellow-500' : 'bg-red-500'

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">{score}/10</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${score * 10}%` }}
        />
      </div>
    </div>
  )
}

interface ReviewPanelProps {
  onClose: () => void
}

export function ReviewPanel({ onClose }: ReviewPanelProps) {
  const { currentCode, model } = useWorkspaceStore()
  const { t } = useTranslation()
  const [isReviewing, setIsReviewing] = useState(false)
  const [result, setResult] = useState<ReviewResult | null>(null)
  const [reviewContent, setReviewContent] = useState('')
  const [error, setError] = useState<string | null>(null)

  const hasCode = Object.keys(currentCode).length > 0

  const runReview = async () => {
    if (!hasCode) return

    setIsReviewing(true)
    setResult(null)
    setReviewContent('')
    setError(null)

    try {
      const response = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: currentCode,
          model: model as ModelProvider,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (!data) continue

          try {
            const event: StreamEvent = JSON.parse(data)

            if (event.type === 'agent_message') {
              accumulated += event.content + '\n'
              setReviewContent(accumulated)

              const parsed = parseReviewContent(accumulated)
              if (parsed) {
                setResult(parsed)
              }
            } else if (event.type === 'error') {
              setError(event.message)
            }
          } catch {
            // skip
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Review failed')
    } finally {
      setIsReviewing(false)
    }
  }

  return (
    <div className="absolute inset-0 z-20 bg-background/95 backdrop-blur-sm flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-lg">✅</span>
          <h3 className="font-semibold">{t('review.title')}</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {!hasCode ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p>{t('review.noCode')}</p>
          </div>
        ) : !result && !isReviewing && !error ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center text-4xl">
              ✅
            </div>
            <p className="text-muted-foreground text-center">
              {t('review.title')}
            </p>
            <Button onClick={runReview} size="lg" className="rounded-xl">
              {t('review.button')}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Score Bars */}
            {result && (
              <>
                <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                  <ScoreBar label={t('review.quality')} score={result.scores.quality} />
                  <ScoreBar label={t('review.performance')} score={result.scores.performance} />
                  <ScoreBar label={t('review.accessibility')} score={result.scores.accessibility} />
                  <ScoreBar label={t('review.security')} score={result.scores.security} />
                </div>

                {/* Overall Score */}
                <div className="bg-card border border-border rounded-xl p-4 text-center">
                  <div className="text-sm text-muted-foreground mb-1">{t('review.overall')}</div>
                  <div className="text-4xl font-bold" style={{
                    color: result.scores.overall >= 8 ? '#22c55e' : result.scores.overall >= 6 ? '#eab308' : '#ef4444'
                  }}>
                    {result.scores.overall}/10
                  </div>
                </div>

                {/* Suggestions */}
                {result.suggestions.length > 0 && (
                  <div className="bg-card border border-border rounded-xl p-4">
                    <h4 className="font-semibold text-sm mb-3">{t('review.suggestions')}</h4>
                    <ul className="space-y-2">
                      {result.suggestions.map((suggestion, i) => (
                        <li key={i} className="flex gap-2 text-sm">
                          <span className="text-muted-foreground shrink-0">{i + 1}.</span>
                          <span>{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}

            {isReviewing && !result && (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center gap-3">
                  <span className="animate-spin text-2xl">⚙</span>
                  <span className="text-muted-foreground">{t('review.running')}</span>
                </div>
              </div>
            )}

            {error && (
              <div className="p-4 rounded-xl bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}

            {/* Re-run button */}
            {(result || error) && !isReviewing && (
              <div className="text-center">
                <Button onClick={runReview} variant="outline" size="sm">
                  {t('review.button')}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
