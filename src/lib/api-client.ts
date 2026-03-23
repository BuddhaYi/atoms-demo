import type { ChatMessage, CodeVersion } from '@/types'

export interface ApiProject {
  id: string
  title: string
  description: string
  category: string
  status: string
  createdAt: string
  updatedAt: string
}

export const apiClient = {
  // Projects
  async getProjects(): Promise<ApiProject[]> {
    try {
      const res = await fetch('/api/projects')
      if (!res.ok) return []
      return res.json()
    } catch {
      return []
    }
  },

  async getProject(id: string): Promise<ApiProject | null> {
    try {
      const res = await fetch(`/api/projects/${id}`)
      if (!res.ok) return null
      return res.json()
    } catch {
      return null
    }
  },

  async createProject(data: {
    id?: string
    title: string
    description: string
    category: string
    status: string
  }): Promise<ApiProject | null> {
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) return null
      return res.json()
    } catch {
      return null
    }
  },

  async deleteProject(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' })
      return res.ok
    } catch {
      return false
    }
  },

  // Messages
  async getMessages(projectId: string): Promise<ChatMessage[]> {
    try {
      const res = await fetch(`/api/projects/${projectId}/messages`)
      if (!res.ok) return []
      const data = await res.json()
      // Map snake_case DB fields to camelCase frontend types
      return data.map((m: Record<string, unknown>) => ({
        id: m.id,
        project_id: m.projectId || projectId,
        role: m.role,
        agent_name: m.agentName,
        content: m.content,
        content_type: m.contentType || 'text',
        metadata: m.metadata || {},
        created_at: m.createdAt,
      }))
    } catch {
      return []
    }
  },

  async saveMessages(projectId: string, messages: ChatMessage[]): Promise<boolean> {
    try {
      const res = await fetch(`/api/projects/${projectId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
      })
      return res.ok
    } catch {
      return false
    }
  },

  // Versions
  async getVersions(projectId: string): Promise<CodeVersion[]> {
    try {
      const res = await fetch(`/api/projects/${projectId}/versions`)
      if (!res.ok) return []
      const data = await res.json()
      // Map snake_case DB fields to camelCase frontend types
      return data.map((v: Record<string, unknown>) => ({
        id: v.id,
        project_id: v.projectId || projectId,
        version_number: v.versionNumber,
        files: v.files || {},
        prompt: v.prompt || '',
        agent_name: v.agentName || '',
        model_used: v.modelUsed || '',
        tokens_used: v.tokensUsed || 0,
        created_at: v.createdAt,
      }))
    } catch {
      return []
    }
  },

  async saveVersions(projectId: string, versions: CodeVersion[]): Promise<boolean> {
    try {
      const res = await fetch(`/api/projects/${projectId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versions }),
      })
      return res.ok
    } catch {
      return false
    }
  },
}
