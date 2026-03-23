'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient, type ApiProject } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Sparkles, Plus, Trash2, FolderOpen } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import Link from 'next/link'

export default function DashboardPage() {
  const [projects, setProjects] = useState<ApiProject[]>([])
  const router = useRouter()
  const { t, locale, setLocale } = useTranslation()

  useEffect(() => {
    apiClient.getProjects().then(setProjects)
  }, [])

  const handleDelete = async (id: string) => {
    await apiClient.deleteProject(id)
    const updated = await apiClient.getProjects()
    setProjects(updated)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-border">
        <Link href="/" className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary" />
          <span className="text-xl font-bold tracking-tight">Atoms</span>
          <span className="text-sm text-muted-foreground">Demo</span>
        </Link>
        <div className="flex items-center gap-2">
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
          <Link href="/">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              {t('dash.newProject')}
            </Button>
          </Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">{t('dash.yourProjects')}</h1>

        {projects.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-2xl">
            <FolderOpen className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-lg font-medium text-muted-foreground mb-1">{t('dash.noProjects')}</p>
            <p className="text-sm text-muted-foreground mb-4">{t('dash.createFirst')}</p>
            <Link href="/">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                {t('dash.startBuilding')}
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <div
                key={project.id}
                className="bg-card border border-border rounded-xl p-4 hover:shadow-md transition-shadow group"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-sm truncate flex-1">
                    {project.title}
                  </h3>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(project.id)
                    }}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {project.description && (
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                    {project.description}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {new Date(project.createdAt).toLocaleDateString()}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/workspace/${project.id}`)}
                    className="h-7 text-xs"
                  >
                    {t('dash.open')}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
