'use client'

import { ArrowLeft, Download, Moon, Sun, Zap, Users, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useWorkspaceStore } from '@/store/workspace-store'
import { useTheme } from 'next-themes'
import { useTranslation } from '@/hooks/useTranslation'
import Link from 'next/link'

interface TopBarProps {
  onExport?: () => void
}

export function TopBar({ onExport }: TopBarProps) {
  const {
    projectTitle,
    mode,
    setMode,
    model,
    setModel,
    currentVersionNumber,
    tokensUsed,
  } = useWorkspaceStore()
  const { theme, setTheme } = useTheme()
  const { t, locale, setLocale } = useTranslation()

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-background">
      <div className="flex items-center gap-3">
        <Link href="/">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-lg">
            <span className="font-semibold text-lg tracking-tight">Atoms</span>
            <span className="text-muted-foreground text-sm ml-1">Demo</span>
          </span>
          <span className="text-muted-foreground">/</span>
          <span className="font-medium text-sm">{projectTitle}</span>
          {currentVersionNumber > 0 && (
            <Badge variant="outline" className="text-xs">
              v{currentVersionNumber}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Mode toggle */}
        <div className="flex items-center bg-muted rounded-lg p-0.5">
          <Button
            variant={mode === 'engineer' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setMode('engineer')}
            className="h-7 text-xs"
          >
            <Zap className="w-3 h-3 mr-1" />
            {t('top.engineer')}
          </Button>
          <Button
            variant={mode === 'team' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setMode('team')}
            className="h-7 text-xs"
          >
            <Users className="w-3 h-3 mr-1" />
            {t('top.team')}
          </Button>
        </div>

        {/* Model toggle */}
        <div className="flex items-center bg-muted rounded-lg p-0.5">
          <Button
            variant={model === 'claude' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setModel('claude')}
            className="h-7 text-xs"
          >
            Claude
          </Button>
          <Button
            variant={model === 'gemini' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setModel('gemini')}
            className="h-7 text-xs"
          >
            Gemini
          </Button>
          <Button
            variant={model === 'openai' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setModel('openai')}
            className="h-7 text-xs"
          >
            GPT-4o
          </Button>
        </div>

        {tokensUsed > 0 && (
          <Badge variant="outline" className="text-xs text-muted-foreground">
            {tokensUsed.toLocaleString()} {t('top.tokens')}
          </Badge>
        )}

        {/* Language toggle */}
        <div className="flex items-center bg-muted rounded-lg p-0.5">
          <Button
            variant={locale === 'en' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setLocale('en')}
            className="h-7 text-xs"
          >
            EN
          </Button>
          <Button
            variant={locale === 'zh' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setLocale('zh')}
            className="h-7 text-xs"
          >
            中文
          </Button>
        </div>

        {/* Dark mode toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          <Sun className="w-4 h-4 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute w-4 h-4 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
        </Button>

        {/* Export */}
        {onExport && (
          <Button variant="outline" size="sm" onClick={onExport} className="h-8">
            <Download className="w-4 h-4 mr-1" />
            {t('top.export')}
          </Button>
        )}
      </div>
    </div>
  )
}
