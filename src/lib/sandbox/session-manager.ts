import type { SandboxSession } from './e2b-client'
import { createSandboxSession, connectToSandbox } from './e2b-client'

interface SessionEntry {
  session: SandboxSession
  lastUsed: number
}

const SESSION_TIMEOUT_MS = 10 * 60 * 1000 // 10 minutes
const sessions = new Map<string, SessionEntry>()

/**
 * Get or create a sandbox session for a project.
 * Sessions are cached and reused within the timeout window.
 */
export async function getOrCreateSession(
  projectId: string,
  initialFiles?: Record<string, string>
): Promise<SandboxSession> {
  const entry = sessions.get(projectId)

  if (entry) {
    entry.lastUsed = Date.now()
    return entry.session
  }

  const session = await createSandboxSession(initialFiles)
  sessions.set(projectId, {
    session,
    lastUsed: Date.now(),
  })

  return session
}

/**
 * Reconnect to an existing sandbox session by its sandbox ID.
 */
export async function reconnectSession(
  projectId: string,
  sandboxId: string
): Promise<SandboxSession> {
  const session = await connectToSandbox(sandboxId)
  sessions.set(projectId, {
    session,
    lastUsed: Date.now(),
  })
  return session
}

/**
 * Clean up sessions that have been idle for too long.
 * Call this periodically or on server shutdown.
 */
export async function cleanupSessions(): Promise<void> {
  const now = Date.now()
  const toRemove: string[] = []

  for (const [projectId, entry] of sessions.entries()) {
    if (now - entry.lastUsed > SESSION_TIMEOUT_MS) {
      toRemove.push(projectId)
    }
  }

  for (const projectId of toRemove) {
    const entry = sessions.get(projectId)
    if (entry) {
      try {
        await entry.session.pause()
      } catch {
        // Session may already be dead
      }
      sessions.delete(projectId)
    }
  }
}

/**
 * Check if E2B is configured (API key is set).
 */
export function isE2BConfigured(): boolean {
  return !!process.env.E2B_API_KEY
}

/**
 * Get the sandbox session for a project if one exists.
 */
export function getSession(projectId: string): SandboxSession | null {
  const entry = sessions.get(projectId)
  if (entry) {
    entry.lastUsed = Date.now()
    return entry.session
  }
  return null
}
