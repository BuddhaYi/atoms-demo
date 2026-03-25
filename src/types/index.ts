// Agent types
export type AgentName = 'mike' | 'emma' | 'bob' | 'alex' | 'david' | 'iris' | 'sarah' | 'reviewer' | 'qa'

export interface Agent {
  name: AgentName
  displayName: string
  role: string
  emoji: string
  color: string
  description: string
}

// Project types
export type ProjectCategory =
  | 'ai_tool' | 'saas' | 'dashboard' | 'ecommerce'
  | 'game' | 'landing_page' | 'internal_tool' | 'other'

export interface Project {
  id: string
  user_id: string
  title: string
  description: string
  category: ProjectCategory
  status: 'draft' | 'published'
  is_public: boolean
  current_version_id: string | null
  created_at: string
  updated_at: string
}

// Code version
export interface CodeVersion {
  id: string
  project_id: string
  version_number: number
  files: Record<string, string>
  prompt: string
  agent_name: AgentName
  model_used: ModelProvider
  tokens_used: number
  created_at: string
}

// Chat message
export type ContentType = 'text' | 'feature_list' | 'architecture' | 'code' | 'data_insight' | 'review' | 'prompt_options' | 'tool_call' | 'tool_result' | 'thinking'

export interface ChatMessage {
  id: string
  project_id: string
  role: 'user' | 'agent' | 'system'
  agent_name?: AgentName
  content: string
  content_type: ContentType
  metadata: ChatMessageMetadata
  created_at: string
}

export interface ChatMessageMetadata {
  thinking?: boolean
  code_generated?: boolean
  version_id?: string
  files?: Record<string, string>
  features?: string[]
  architecture?: string
  tool?: ToolCall
  tool_name?: string
  is_error?: boolean
}

// Workspace state
export type WorkspaceMode = 'engineer' | 'team' | 'agent'
export type ModelProvider = 'claude' | 'openai' | 'gemini' | 'deepseek'
export type PreviewDevice = 'desktop' | 'mobile'

// Tool types for Agent mode
export type ToolName = 'read_file' | 'write_file' | 'list_files' | 'run_command' | 'provision_database' | 'install_package'

export interface ToolCall {
  id: string
  name: ToolName
  input: Record<string, unknown>
}

export interface ToolResult {
  tool_call_id: string
  name: ToolName
  output: string
  is_error: boolean
}

export interface AgentStep {
  id: string
  type: 'tool_call' | 'tool_result' | 'thinking' | 'text'
  agent: AgentName
  content: string
  metadata?: Record<string, unknown>
  timestamp: string
}

// Stream events from SSE
export type StreamEvent =
  | { type: 'agent_start'; agent: AgentName; message: string }
  | { type: 'agent_message'; agent: AgentName; content: string; content_type: ContentType }
  | { type: 'agent_end'; agent: AgentName }
  | { type: 'code_complete'; files: Record<string, string> }
  | { type: 'tool_call'; agent: AgentName; tool: ToolCall }
  | { type: 'tool_result'; agent: AgentName; result: ToolResult }
  | { type: 'thinking'; agent: AgentName; content: string }
  | { type: 'iteration'; current: number; max: number }
  | { type: 'error'; message: string }
  | { type: 'done'; tokens_used?: number }

// API response
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}
