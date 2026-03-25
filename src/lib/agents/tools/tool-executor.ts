import type { ToolCall, ToolResult } from '@/types'
import type { SandboxSession } from '@/lib/sandbox/e2b-client'
import { executeBackendTool } from './backend-tools'

export interface ToolExecutor {
  execute(tool: ToolCall): Promise<ToolResult>
  getFiles(): Record<string, string>
}

/**
 * Create a tool executor. Uses E2B sandbox if a session is provided,
 * otherwise falls back to in-memory virtual filesystem.
 */
export function createToolExecutor(
  initialFiles: Record<string, string>,
  sandbox?: SandboxSession
): ToolExecutor {
  if (sandbox) {
    return createE2BExecutor(initialFiles, sandbox)
  }
  return createMemoryExecutor(initialFiles)
}

/**
 * E2B sandbox tool executor — real file system + command execution.
 */
function createE2BExecutor(
  initialFiles: Record<string, string>,
  sandbox: SandboxSession
): ToolExecutor {
  // Track written files so we can return them via getFiles()
  const trackedFiles = new Map<string, string>()
  for (const [key, value] of Object.entries(initialFiles)) {
    const normalizedKey = key.startsWith('/') ? key : `/${key}`
    trackedFiles.set(normalizedKey, value)
  }

  return {
    async execute(tool: ToolCall): Promise<ToolResult> {
      const { id, name, input } = tool

      try {
        switch (name) {
          case 'read_file': {
            const path = normalizeFilePath(input.path as string)
            try {
              const content = await sandbox.readFile(path)
              return { tool_call_id: id, name, output: content, is_error: false }
            } catch {
              return {
                tool_call_id: id,
                name,
                output: `Error: File not found: ${path}`,
                is_error: true,
              }
            }
          }

          case 'write_file': {
            const path = normalizeFilePath(input.path as string)
            const content = input.content as string
            await sandbox.writeFile(path, content)
            trackedFiles.set(path, content)
            return {
              tool_call_id: id,
              name,
              output: `Successfully wrote ${content.length} characters to ${path}`,
              is_error: false,
            }
          }

          case 'list_files': {
            const directory = input.directory
              ? normalizeFilePath(input.directory as string)
              : '/'
            const fileList = await sandbox.listFiles(directory)
            return {
              tool_call_id: id,
              name,
              output: fileList.length > 0 ? fileList.join('\n') : 'No files found.',
              is_error: false,
            }
          }

          case 'run_command': {
            const command = input.command as string
            const result = await sandbox.runCommand(command)
            const output = [
              result.stdout ? `stdout:\n${result.stdout}` : '',
              result.stderr ? `stderr:\n${result.stderr}` : '',
              `exit code: ${result.exitCode}`,
            ].filter(Boolean).join('\n')
            return {
              tool_call_id: id,
              name,
              output,
              is_error: result.exitCode !== 0,
            }
          }

          default: {
            // Try backend tools (provision_database, install_package)
            const backendResult = await executeBackendTool(tool, (cmd) => sandbox.runCommand(cmd))
            if (backendResult) return backendResult
            return { tool_call_id: id, name, output: `Unknown tool: ${name}`, is_error: true }
          }
        }
      } catch (err) {
        return {
          tool_call_id: id,
          name,
          output: `Tool execution error: ${err instanceof Error ? err.message : String(err)}`,
          is_error: true,
        }
      }
    },

    getFiles(): Record<string, string> {
      const result: Record<string, string> = {}
      for (const [key, value] of trackedFiles.entries()) {
        result[key] = value
      }
      return result
    },
  }
}

/**
 * In-memory virtual filesystem tool executor (fallback when E2B is not configured).
 */
export function createMemoryExecutor(
  initialFiles: Record<string, string>
): ToolExecutor {
  const files = new Map<string, string>()

  for (const [key, value] of Object.entries(initialFiles)) {
    const normalizedKey = key.startsWith('/') ? key : `/${key}`
    files.set(normalizedKey, value)
  }

  return {
    async execute(tool: ToolCall): Promise<ToolResult> {
      const { id, name, input } = tool

      try {
        switch (name) {
          case 'read_file': {
            const path = normalizeFilePath(input.path as string)
            const content = files.get(path)
            if (content === undefined) {
              return {
                tool_call_id: id,
                name,
                output: `Error: File not found: ${path}\nAvailable files: ${Array.from(files.keys()).join(', ')}`,
                is_error: true,
              }
            }
            return { tool_call_id: id, name, output: content, is_error: false }
          }

          case 'write_file': {
            const path = normalizeFilePath(input.path as string)
            const content = input.content as string
            files.set(path, content)
            return {
              tool_call_id: id,
              name,
              output: `Successfully wrote ${content.length} characters to ${path}`,
              is_error: false,
            }
          }

          case 'list_files': {
            const directory = input.directory
              ? normalizeFilePath(input.directory as string)
              : '/'
            const matchingFiles = Array.from(files.keys())
              .filter((f) => f.startsWith(directory))
              .sort()
            return {
              tool_call_id: id,
              name,
              output: matchingFiles.length > 0 ? matchingFiles.join('\n') : 'No files found.',
              is_error: false,
            }
          }

          case 'run_command': {
            const command = input.command as string
            return {
              tool_call_id: id,
              name,
              output: `[Sandbox not available] Command: ${command}\nNote: Set E2B_API_KEY to enable sandbox execution.`,
              is_error: false,
            }
          }

          default: {
            const backendResult = await executeBackendTool(tool)
            if (backendResult) return backendResult
            return { tool_call_id: id, name, output: `Unknown tool: ${name}`, is_error: true }
          }
        }
      } catch (err) {
        return {
          tool_call_id: id,
          name,
          output: `Tool execution error: ${err instanceof Error ? err.message : String(err)}`,
          is_error: true,
        }
      }
    },

    getFiles(): Record<string, string> {
      const result: Record<string, string> = {}
      for (const [key, value] of files.entries()) {
        result[key] = value
      }
      return result
    },
  }
}

function normalizeFilePath(path: string): string {
  return path.startsWith('/') ? path : `/${path}`
}
