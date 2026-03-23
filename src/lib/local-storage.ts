import type { ChatMessage, CodeVersion } from '@/types'

const PROJECTS_KEY = 'atoms_projects'
const MESSAGES_PREFIX = 'atoms_messages_'
const VERSIONS_PREFIX = 'atoms_versions_'

export interface LocalProject {
  id: string
  title: string
  description: string
  category: string
  status: 'active' | 'archived'
  created_at: string
  updated_at: string
}

function getItem<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function setItem(key: string, value: unknown): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage full or unavailable
  }
}

export const localDB = {
  // Projects
  getProjects(): LocalProject[] {
    return getItem<LocalProject[]>(PROJECTS_KEY, [])
  },

  getProject(id: string): LocalProject | null {
    const projects = this.getProjects()
    return projects.find(p => p.id === id) || null
  },

  createProject(project: Omit<LocalProject, 'created_at' | 'updated_at'>): LocalProject {
    const now = new Date().toISOString()
    const newProject: LocalProject = {
      ...project,
      created_at: now,
      updated_at: now,
    }
    const projects = this.getProjects()
    setItem(PROJECTS_KEY, [...projects, newProject])
    return newProject
  },

  updateProject(id: string, updates: Partial<LocalProject>): LocalProject | null {
    const projects = this.getProjects()
    const idx = projects.findIndex(p => p.id === id)
    if (idx === -1) return null

    const updated: LocalProject = {
      ...projects[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    }
    const newProjects = [...projects]
    newProjects[idx] = updated
    setItem(PROJECTS_KEY, newProjects)
    return updated
  },

  deleteProject(id: string): void {
    const projects = this.getProjects().filter(p => p.id !== id)
    setItem(PROJECTS_KEY, projects)
    if (typeof window !== 'undefined') {
      localStorage.removeItem(MESSAGES_PREFIX + id)
      localStorage.removeItem(VERSIONS_PREFIX + id)
    }
  },

  // Messages
  getMessages(projectId: string): ChatMessage[] {
    return getItem<ChatMessage[]>(MESSAGES_PREFIX + projectId, [])
  },

  saveMessages(projectId: string, messages: ChatMessage[]): void {
    setItem(MESSAGES_PREFIX + projectId, messages)
  },

  // Versions
  getVersions(projectId: string): CodeVersion[] {
    return getItem<CodeVersion[]>(VERSIONS_PREFIX + projectId, [])
  },

  saveVersions(projectId: string, versions: CodeVersion[]): void {
    setItem(VERSIONS_PREFIX + projectId, versions)
  },
}
