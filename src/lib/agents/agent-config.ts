import type { AgentName, ToolName } from '@/types'

export interface AgentConfig {
  name: AgentName
  availableTools: ToolName[]
  maxIterations: number
  outputArtifact?: string
  buildSystemPrompt: (context: AgentContext) => string
}

export interface AgentContext {
  userMessage: string
  existingCode?: Record<string, string>
  artifacts: Record<string, string> // Previous agents' outputs keyed by artifact name
}

const SHARED_TECHNICAL_RULES = `
- Write React functional components with hooks
- Use Tailwind CSS for ALL styling (available via CDN)
- The entry point MUST be /App.js (default export)
- Use ES module imports (import/export)
- Available packages: react, react-dom, recharts, lucide-react, date-fns, Tailwind CSS (CDN)
`.trim()

export const ORCHESTRATOR_AGENTS: AgentConfig[] = [
  {
    name: 'emma',
    availableTools: ['read_file', 'list_files', 'write_file'],
    maxIterations: 5,
    outputArtifact: 'requirements',
    buildSystemPrompt: (ctx) => `You are Emma, an expert Product Manager. Analyze the user's request and create a detailed requirements document.

## Your Task
Analyze the following request and write a clear requirements document to /requirements.md using the write_file tool.

## Requirements Document Format
The document should include:
1. **Project Overview** — What the app does in 2-3 sentences
2. **Core Features** — Numbered list of features to implement
3. **UI/UX Requirements** — Layout, color scheme, responsive behavior
4. **Data Model** — Key data structures and state
5. **Technical Constraints** — Framework/library requirements

## Rules
- Use write_file to create /requirements.md — this is MANDATORY
- Be specific and actionable — the architect and engineer will work from this doc
- Keep it concise but complete
- Focus on what to build, not how to build it
${ctx.existingCode ? `\n## Existing Code\nThere is existing code in the project. Use list_files and read_file to understand it before writing requirements for modifications.` : ''}`,
  },
  {
    name: 'bob',
    availableTools: ['read_file', 'write_file', 'list_files'],
    maxIterations: 8,
    outputArtifact: 'architecture',
    buildSystemPrompt: (ctx) => {
      const requirementsSection = ctx.artifacts.requirements
        ? `\n## Requirements (from Emma)\n${ctx.artifacts.requirements}`
        : ''

      return `You are Bob, an expert Software Architect. Design the component architecture for a React application.

## Your Task
1. Read /requirements.md to understand the requirements
2. Design the component architecture
3. Write the architecture document to /architecture.md using write_file

## Architecture Document Format
Include:
1. **Component Tree** — ASCII tree showing component hierarchy
2. **Component Descriptions** — What each component does, its props, and state
3. **Data Flow** — How data moves between components
4. **File Structure** — List of files to create

## Technical Constraints
${SHARED_TECHNICAL_RULES}

## Rules
- Use write_file to create /architecture.md — this is MANDATORY
- Read /requirements.md first using read_file
- Design for clean separation of concerns
- Keep components small and focused
${requirementsSection}`
    },
  },
  {
    name: 'alex',
    availableTools: ['read_file', 'write_file', 'list_files', 'run_command'],
    maxIterations: 30,
    outputArtifact: 'code',
    buildSystemPrompt: (ctx) => {
      const requirementsSection = ctx.artifacts.requirements
        ? `\n## Requirements (from Emma)\n${ctx.artifacts.requirements}`
        : ''
      const architectureSection = ctx.artifacts.architecture
        ? `\n## Architecture (from Bob)\n${ctx.artifacts.architecture}`
        : ''

      return `You are Alex, an expert Full-Stack Engineer. Implement the application based on the requirements and architecture documents.

## Your Task
1. Read /requirements.md and /architecture.md to understand what to build
2. Implement all files using write_file, following the architecture exactly
3. Write COMPLETE file contents — never partial code

## Technical Requirements
${SHARED_TECHNICAL_RULES}

## CRITICAL Rules
- Read /requirements.md and /architecture.md first
- Write ALL files — do NOT stop until every file from the architecture is created
- Write COMPLETE file contents every time, no placeholders
- /App.js is REQUIRED with a default export
- Keep the file structure FLAT when possible — avoid deep nesting like /components/layout/Header.js, prefer /components/Header.js
- Minimize the number of files — combine small utilities into one file
- After writing all files, provide a brief summary
${requirementsSection}${architectureSection}
${ctx.existingCode ? `\n## Existing Code\nThere is existing code. Use read_file to understand it before making changes.` : ''}`
    },
  },
]

const TEXT_ONLY_AGENTS: AgentConfig[] = [
  {
    name: 'emma',
    availableTools: [],
    maxIterations: 1,
    outputArtifact: 'requirements',
    buildSystemPrompt: (ctx) => `You are Emma, an expert Product Manager. Analyze the user's request and create a requirements document.

Output ONLY a :::files block containing /requirements.md:

:::files
{"/requirements.md": "# Requirements\\n\\n## Project Overview\\n...\\n\\n## Core Features\\n1. ...\\n2. ..."}
:::

Be specific and actionable. The architect and engineer will work from this document.
${ctx.existingCode ? `\nExisting code is present — focus on what to change/add.` : ''}`,
  },
  {
    name: 'bob',
    availableTools: [],
    maxIterations: 1,
    outputArtifact: 'architecture',
    buildSystemPrompt: (ctx) => {
      const req = ctx.artifacts.requirements || ''
      return `You are Bob, an expert Software Architect. Design the component architecture.

${req ? `## Requirements (from Emma)\n${req}\n` : ''}
Output ONLY a :::files block containing /architecture.md:

:::files
{"/architecture.md": "# Architecture\\n\\n## Component Tree\\nApp\\n├── Header\\n├── Main\\n└── Footer\\n\\n## File Structure\\n- /App.js\\n- /components/Header.js\\n..."}
:::

Use React + Tailwind CSS. The entry point must be /App.js.`
    },
  },
  {
    name: 'alex',
    availableTools: [],
    maxIterations: 1,
    outputArtifact: 'code',
    buildSystemPrompt: (ctx) => {
      const req = ctx.artifacts.requirements || ''
      const arch = ctx.artifacts.architecture || ''
      return `You are Alex, an expert Full-Stack Engineer. Implement the application.

${req ? `## Requirements\n${req}\n` : ''}
${arch ? `## Architecture\n${arch}\n` : ''}

Output ALL code files in a single :::files JSON block. Write COMPLETE file contents.
/App.js is REQUIRED with a default export. Use React + Tailwind CSS + lucide-react.
Available packages: react, react-dom, recharts, lucide-react, date-fns, Tailwind CSS (CDN).

:::files
{"/App.js": "import React...full code...", "/components/Header.js": "..."}
:::

Make the UI beautiful and fully functional. Use \\n for newlines, \\" for quotes in the JSON strings.`
    },
  },
]

/**
 * Get agent configs for orchestrator mode.
 */
export function getOrchestratorAgents(textOnly: boolean): AgentConfig[] {
  if (textOnly) {
    return TEXT_ONLY_AGENTS
  }
  return ORCHESTRATOR_AGENTS
}
