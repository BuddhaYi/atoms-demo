import type { ToolName } from '@/types'

interface ToolSchema {
  name: ToolName
  description: string
  parameters: Record<string, unknown>
}

const TOOL_SCHEMAS: ToolSchema[] = [
  {
    name: 'read_file',
    description: 'Read the contents of a file from the project filesystem.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'The file path to read, e.g. "/App.js" or "/styles.css"',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'write_file',
    description: 'Write content to a file in the project filesystem. Creates the file if it does not exist, or overwrites it if it does.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'The file path to write to, e.g. "/App.js"',
        },
        content: {
          type: 'string',
          description: 'The complete file content to write',
        },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'list_files',
    description: 'List all files in the project filesystem.',
    parameters: {
      type: 'object',
      properties: {
        directory: {
          type: 'string',
          description: 'Optional directory prefix to filter files. Defaults to "/" (all files).',
        },
      },
    },
  },
  {
    name: 'run_command',
    description: 'Run a shell command in the project sandbox. Use for npm install, running tests, building, etc.',
    parameters: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'The shell command to execute, e.g. "npm install recharts" or "npm run build"',
        },
      },
      required: ['command'],
    },
  },
]

/** Claude tool_use format (with optional backend tools) */
export function getClaudeTools(includeBackend = false) {
  const tools = TOOL_SCHEMAS.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.parameters,
  }))
  if (includeBackend) {
    const { getClaudeBackendTools } = require('./backend-tools')
    tools.push(...getClaudeBackendTools())
  }
  return tools
}

/** OpenAI / Gemini function calling format (with optional backend tools) */
export function getOpenAITools(includeBackend = false) {
  const tools = TOOL_SCHEMAS.map((t) => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }))
  if (includeBackend) {
    const { getOpenAIBackendTools } = require('./backend-tools')
    tools.push(...getOpenAIBackendTools())
  }
  return tools
}

export function getToolNames(): ToolName[] {
  return TOOL_SCHEMAS.map((t) => t.name)
}
