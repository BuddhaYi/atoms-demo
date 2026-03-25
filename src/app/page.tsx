'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ArrowRight, Sparkles, FolderOpen, LogOut, Zap, Users, Bot } from 'lucide-react'
import { AGENTS } from '@/lib/agents/registry'
import { apiClient } from '@/lib/api-client'
import { useAuth } from '@/hooks/useAuth'
import { useTranslation } from '@/hooks/useTranslation'
import type { TranslationKey } from '@/i18n'
import type { WorkspaceMode, ModelProvider } from '@/types'
import Link from 'next/link'

const CATEGORY_KEYS = [
  { key: 'aiTool', emoji: '🤖' },
  { key: 'internalTool', emoji: '🔧' },
  { key: 'saas', emoji: '💼' },
  { key: 'dashboard', emoji: '📊' },
  { key: 'ecommerce', emoji: '🛒' },
  { key: 'game', emoji: '🎮' },
  { key: 'landingPage', emoji: '🚀' },
] as const

const agentList = Object.values(AGENTS)

export default function HomePage() {
  const [prompt, setPrompt] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [mode, setMode] = useState<WorkspaceMode>('team')
  const [model, setModel] = useState<ModelProvider>('gemini')
  const router = useRouter()
  const { user, signOut } = useAuth()
  const { t, locale, setLocale } = useTranslation()

  const handleStart = async (inputPrompt?: string) => {
    const finalPrompt = inputPrompt || prompt
    if (!finalPrompt.trim()) return

    setIsCreating(true)
    const projectId = `p_${Date.now()}`

    await apiClient.createProject({
      id: projectId,
      title: finalPrompt.trim().slice(0, 50),
      description: finalPrompt.trim(),
      category: '',
      status: 'active',
    })

    sessionStorage.setItem(`project_${projectId}_prompt`, finalPrompt.trim())
    sessionStorage.setItem(`project_${projectId}_mode`, mode)
    sessionStorage.setItem(`project_${projectId}_model`, model)
    router.push(`/workspace/${projectId}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary" />
          <span className="text-xl font-bold tracking-tight">Atoms</span>
          <span className="text-sm text-muted-foreground">Demo</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-muted rounded-lg p-0.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocale('en')}
              className={`h-7 text-xs ${
                locale === 'en'
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 hover:bg-amber-500/25'
                  : ''
              }`}
            >
              EN
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocale('zh')}
              className={`h-7 text-xs ${
                locale === 'zh'
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 hover:bg-amber-500/25'
                  : ''
              }`}
            >
              中文
            </Button>
          </div>
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <FolderOpen className="w-4 h-4 mr-2" />
              {t('home.projects')}
            </Button>
          </Link>
          {user && (
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => { await signOut(); router.push('/login') }}
            >
              <LogOut className="w-4 h-4 mr-1" />
              {user.displayName || user.email.split('@')[0]}
            </Button>
          )}
        </div>
      </nav>

      {/* Hero */}
      <main className="max-w-3xl mx-auto px-4 pt-16 pb-20">
        {/* Agent Avatars */}
        <div className="flex justify-center gap-2 mb-8">
          {agentList.map((agent) => (
            <div
              key={agent.name}
              className="w-12 h-12 rounded-full flex items-center justify-center text-xl transition-transform hover:scale-110 cursor-default"
              style={{ backgroundColor: agent.color + '20' }}
              title={`${agent.displayName} - ${t(`agent.role.${agent.name}` as TranslationKey)}`}
            >
              {agent.emoji}
            </div>
          ))}
        </div>

        <h1 className="text-4xl md:text-5xl font-bold text-center mb-4 tracking-tight">
          {t('home.title.prefix')}{' '}
          <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
            {t('home.title.highlight')}
          </span>
        </h1>
        <p className="text-center text-muted-foreground text-lg mb-10">
          {t('home.subtitle')}
        </p>

        {/* Input */}
        <div className="bg-card border border-border rounded-2xl shadow-lg p-4 mb-6">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={t('home.placeholder')}
            className="min-h-[100px] text-base border-0 shadow-none resize-none focus-visible:ring-0 bg-transparent"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleStart()
              }
            }}
          />
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2">
              {/* Mode toggle */}
              <div className="flex items-center bg-muted rounded-lg p-0.5">
                {([
                  { key: 'engineer' as const, icon: Zap, label: t('top.engineer') },
                  { key: 'team' as const, icon: Users, label: t('top.team') },
                  { key: 'agent' as const, icon: Bot, label: 'Agent' },
                ] as const).map(({ key, icon: Icon, label }) => (
                  <Button
                    key={key}
                    variant="ghost"
                    size="sm"
                    onClick={() => setMode(key)}
                    className={`h-7 text-xs ${
                      mode === key
                        ? key === 'agent'
                          ? 'bg-violet-500/15 text-violet-700 dark:text-violet-400 hover:bg-violet-500/25'
                          : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 hover:bg-amber-500/25'
                        : ''
                    }`}
                  >
                    <Icon className="w-3 h-3 mr-1" />
                    {label}
                  </Button>
                ))}
              </div>

              {/* Model toggle */}
              <div className="flex items-center bg-muted rounded-lg p-0.5">
                {([
                  { key: 'claude' as const, label: 'Claude' },
                  { key: 'gemini' as const, label: 'Gemini' },
                  { key: 'openai' as const, label: 'GPT-4o' },
                ] as const).map(({ key, label }) => (
                  <Button
                    key={key}
                    variant="ghost"
                    size="sm"
                    onClick={() => setModel(key)}
                    className={`h-7 text-xs ${
                      model === key
                        ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 hover:bg-amber-500/25'
                        : ''
                    }`}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            <Button
              onClick={() => handleStart()}
              disabled={!prompt.trim() || isCreating}
              size="lg"
              className="rounded-xl"
            >
              {isCreating ? t('home.creating') : t('home.startBuilding')}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>

        {/* Category Chips */}
        <div className="mb-8">
          <p className="text-sm text-muted-foreground mb-3 text-center">
            {t('home.whatToBuild')}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {CATEGORY_KEYS.map((cat) => {
              const label = t(`cat.${cat.key}` as TranslationKey)
              const catPrompt = t(`cat.${cat.key}.prompt` as TranslationKey)
              return (
                <button
                  key={cat.key}
                  onClick={() => {
                    setPrompt(catPrompt)
                    handleStart(catPrompt)
                  }}
                  disabled={isCreating}
                  className="flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-card hover:bg-accent transition-colors text-sm"
                >
                  <span>{cat.emoji}</span>
                  <span>{label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Agent Team Section */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-center mb-8">{t('home.yourAiTeam')}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {agentList.slice(0, 4).map((agent) => (
              <div
                key={agent.name}
                className="bg-card border border-border rounded-xl p-4 text-center hover:shadow-md transition-shadow"
              >
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-2xl mx-auto mb-3"
                  style={{ backgroundColor: agent.color + '15' }}
                >
                  {agent.emoji}
                </div>
                <div className="font-semibold text-sm">{agent.displayName}</div>
                <div className="text-xs" style={{ color: agent.color }}>
                  {t(`agent.role.${agent.name}` as TranslationKey)}
                </div>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  {t(`agent.desc.${agent.name}` as TranslationKey)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
