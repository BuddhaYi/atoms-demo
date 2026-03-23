'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ArrowRight, Sparkles, FolderOpen } from 'lucide-react'
import { AGENTS } from '@/lib/agents/registry'
import { localDB } from '@/lib/local-storage'
import Link from 'next/link'

const CATEGORIES = [
  { label: 'AI Tool', emoji: '🤖', prompt: 'Build an AI-powered writing assistant with a text editor, tone selector, and generate/improve buttons' },
  { label: 'Internal Tool', emoji: '🔧', prompt: 'Build an internal employee directory with search, filtering by department, and profile cards' },
  { label: 'SaaS', emoji: '💼', prompt: 'Create a project management dashboard with task boards, team members, and progress tracking' },
  { label: 'Dashboard', emoji: '📊', prompt: 'Build an analytics dashboard with KPI cards, line charts, bar charts, and a data table' },
  { label: 'E-commerce', emoji: '🛒', prompt: 'Create an e-commerce product page with image gallery, size selector, reviews, and add to cart' },
  { label: 'Game', emoji: '🎮', prompt: 'Build a fun memory card matching game with score tracking and difficulty levels' },
  { label: 'Landing Page', emoji: '🚀', prompt: 'Design a modern SaaS landing page with hero section, features grid, pricing table, and testimonials' },
]

const agentList = Object.values(AGENTS)

export default function HomePage() {
  const [prompt, setPrompt] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const router = useRouter()

  const handleStart = async (inputPrompt?: string) => {
    const finalPrompt = inputPrompt || prompt
    if (!finalPrompt.trim()) return

    setIsCreating(true)
    const projectId = `p_${Date.now()}`

    // Save to localStorage for persistence
    localDB.createProject({
      id: projectId,
      title: finalPrompt.trim().slice(0, 50),
      description: finalPrompt.trim(),
      category: '',
      status: 'active',
    })

    sessionStorage.setItem(`project_${projectId}_prompt`, finalPrompt.trim())
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
        <Link href="/dashboard">
          <Button variant="ghost" size="sm">
            <FolderOpen className="w-4 h-4 mr-2" />
            Projects
          </Button>
        </Link>
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
              title={`${agent.displayName} - ${agent.role}`}
            >
              {agent.emoji}
            </div>
          ))}
        </div>

        <h1 className="text-4xl md:text-5xl font-bold text-center mb-4 tracking-tight">
          Turn Ideas into{' '}
          <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
            Working Apps
          </span>
        </h1>
        <p className="text-center text-muted-foreground text-lg mb-10">
          AI agents collaborate to build your app in minutes. No coding required.
        </p>

        {/* Input */}
        <div className="bg-card border border-border rounded-2xl shadow-lg p-4 mb-6">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Build an analytics dashboard with interactive charts and data tables..."
            className="min-h-[100px] text-base border-0 shadow-none resize-none focus-visible:ring-0 bg-transparent"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleStart()
              }
            }}
          />
          <div className="flex justify-end mt-2">
            <Button
              onClick={() => handleStart()}
              disabled={!prompt.trim() || isCreating}
              size="lg"
              className="rounded-xl"
            >
              {isCreating ? 'Creating...' : 'Start Building'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>

        {/* Category Chips */}
        <div className="mb-8">
          <p className="text-sm text-muted-foreground mb-3 text-center">
            What do you want to build?
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.label}
                onClick={() => {
                  setPrompt(cat.prompt)
                  handleStart(cat.prompt)
                }}
                disabled={isCreating}
                className="flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-card hover:bg-accent transition-colors text-sm"
              >
                <span>{cat.emoji}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Agent Team Section */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-center mb-8">Your AI Team</h2>
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
                  {agent.role}
                </div>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  {agent.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
