import { Sandbox } from 'e2b'

export interface SandboxSession {
  id: string
  writeFile(path: string, content: string): Promise<void>
  readFile(path: string): Promise<string>
  listFiles(directory: string): Promise<string[]>
  runCommand(command: string): Promise<{ stdout: string; stderr: string; exitCode: number }>
  getPreviewUrl(port: number): string
  kill(): Promise<void>
  pause(): Promise<void>
}

export async function createSandboxSession(
  initialFiles?: Record<string, string>
): Promise<SandboxSession> {
  const apiKey = process.env.E2B_API_KEY
  if (!apiKey) {
    throw new Error('E2B_API_KEY is not configured. Set it in .env.local to enable sandbox execution.')
  }

  const sandbox = await Sandbox.create({
    timeoutMs: 300_000, // 5 minutes
    apiKey,
  })

  // Write initial files if provided
  if (initialFiles) {
    const entries = Object.entries(initialFiles).map(([path, content]) => ({
      path: path.startsWith('/') ? `/home/user${path}` : `/home/user/${path}`,
      data: content,
    }))
    if (entries.length > 0) {
      await sandbox.files.write(entries)
    }
  }

  return {
    id: sandbox.sandboxId,

    async writeFile(path: string, content: string) {
      const fullPath = path.startsWith('/home/') ? path : `/home/user${path.startsWith('/') ? path : `/${path}`}`
      await sandbox.files.write(fullPath, content)
    },

    async readFile(path: string): Promise<string> {
      const fullPath = path.startsWith('/home/') ? path : `/home/user${path.startsWith('/') ? path : `/${path}`}`
      return await sandbox.files.read(fullPath)
    },

    async listFiles(directory: string): Promise<string[]> {
      const fullPath = directory.startsWith('/home/') ? directory : `/home/user${directory.startsWith('/') ? directory : `/${directory}`}`
      try {
        const entries = await sandbox.files.list(fullPath)
        return entries.map((e) => e.name)
      } catch {
        return []
      }
    },

    async runCommand(command: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
      try {
        const result = await sandbox.commands.run(command, {
          cwd: '/home/user',
          timeoutMs: 60_000,
        })
        return {
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.exitCode,
        }
      } catch (err) {
        return {
          stdout: '',
          stderr: err instanceof Error ? err.message : 'Command failed',
          exitCode: 1,
        }
      }
    },

    getPreviewUrl(port: number): string {
      const host = sandbox.getHost(port)
      return `https://${host}`
    },

    async kill() {
      await sandbox.kill()
    },

    async pause() {
      await sandbox.pause()
    },
  }
}

export async function connectToSandbox(sandboxId: string): Promise<SandboxSession> {
  const apiKey = process.env.E2B_API_KEY
  if (!apiKey) {
    throw new Error('E2B_API_KEY is not configured')
  }

  const sandbox = await Sandbox.connect(sandboxId, { apiKey })

  return {
    id: sandbox.sandboxId,

    async writeFile(path: string, content: string) {
      const fullPath = path.startsWith('/home/') ? path : `/home/user${path.startsWith('/') ? path : `/${path}`}`
      await sandbox.files.write(fullPath, content)
    },

    async readFile(path: string): Promise<string> {
      const fullPath = path.startsWith('/home/') ? path : `/home/user${path.startsWith('/') ? path : `/${path}`}`
      return await sandbox.files.read(fullPath)
    },

    async listFiles(directory: string): Promise<string[]> {
      const fullPath = directory.startsWith('/home/') ? directory : `/home/user${directory.startsWith('/') ? directory : `/${directory}`}`
      try {
        const entries = await sandbox.files.list(fullPath)
        return entries.map((e) => e.name)
      } catch {
        return []
      }
    },

    async runCommand(command: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
      try {
        const result = await sandbox.commands.run(command, {
          cwd: '/home/user',
          timeoutMs: 60_000,
        })
        return {
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.exitCode,
        }
      } catch (err) {
        return {
          stdout: '',
          stderr: err instanceof Error ? err.message : 'Command failed',
          exitCode: 1,
        }
      }
    },

    getPreviewUrl(port: number): string {
      const host = sandbox.getHost(port)
      return `https://${host}`
    },

    async kill() {
      await sandbox.kill()
    },

    async pause() {
      await sandbox.pause()
    },
  }
}
