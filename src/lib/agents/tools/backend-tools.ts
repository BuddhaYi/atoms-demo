import type { ToolCall, ToolResult, ToolName } from '@/types'
import { provisionDatabase } from '@/lib/sandbox/database-provisioner'

export type BackendToolName = 'provision_database' | 'install_package'

interface BackendToolSchema {
  name: BackendToolName
  description: string
  parameters: Record<string, unknown>
}

export const BACKEND_TOOL_SCHEMAS: BackendToolSchema[] = [
  {
    name: 'provision_database',
    description: 'Provision a new PostgreSQL database for the project. Returns a connection string.',
    parameters: {
      type: 'object',
      properties: {
        project_name: {
          type: 'string',
          description: 'Name for the database project',
        },
      },
      required: ['project_name'],
    },
  },
  {
    name: 'install_package',
    description: 'Install an npm package in the sandbox. Equivalent to running "npm install <package>".',
    parameters: {
      type: 'object',
      properties: {
        package_name: {
          type: 'string',
          description: 'The npm package name to install, e.g. "express" or "prisma@latest"',
        },
      },
      required: ['package_name'],
    },
  },
]

/** Claude format for backend tools */
export function getClaudeBackendTools() {
  return BACKEND_TOOL_SCHEMAS.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.parameters,
  }))
}

/** OpenAI/Gemini format for backend tools */
export function getOpenAIBackendTools() {
  return BACKEND_TOOL_SCHEMAS.map((t) => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }))
}

/**
 * Execute a backend tool. Returns null if the tool is not a backend tool.
 */
export async function executeBackendTool(
  tool: ToolCall,
  runCommand?: (cmd: string) => Promise<{ stdout: string; stderr: string; exitCode: number }>
): Promise<ToolResult | null> {
  const { id, name, input } = tool

  switch (name as string) {
    case 'provision_database': {
      try {
        const projectName = (input.project_name as string) || 'atoms-project'
        const result = await provisionDatabase(projectName)
        return {
          tool_call_id: id,
          name: name as ToolName,
          output: [
            `Database provisioned successfully!`,
            `Provider: ${result.provider}`,
            `Host: ${result.host}`,
            `Database: ${result.database}`,
            `Connection string: ${result.connectionString}`,
            '',
            'Set this as DATABASE_URL in your .env file.',
          ].join('\n'),
          is_error: false,
        }
      } catch (err) {
        return {
          tool_call_id: id,
          name: name as ToolName,
          output: `Database provisioning failed: ${err instanceof Error ? err.message : String(err)}`,
          is_error: true,
        }
      }
    }

    case 'install_package': {
      const packageName = input.package_name as string
      if (!packageName) {
        return {
          tool_call_id: id,
          name: name as ToolName,
          output: 'Error: package_name is required',
          is_error: true,
        }
      }
      if (runCommand) {
        const result = await runCommand(`npm install ${packageName}`)
        return {
          tool_call_id: id,
          name: name as ToolName,
          output: result.exitCode === 0
            ? `Successfully installed ${packageName}\n${result.stdout}`
            : `Failed to install ${packageName}\n${result.stderr}`,
          is_error: result.exitCode !== 0,
        }
      }
      return {
        tool_call_id: id,
        name: name as ToolName,
        output: `[Sandbox required] Would install: ${packageName}`,
        is_error: false,
      }
    }

    default:
      return null // Not a backend tool
  }
}
