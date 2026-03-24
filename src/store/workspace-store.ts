import { create } from 'zustand'
import type {
  AgentName,
  ChatMessage,
  CodeVersion,
  ModelProvider,
  PreviewDevice,
  WorkspaceMode,
  ContentType,
} from '@/types'

interface WorkspaceState {
  // Project
  projectId: string | null
  projectTitle: string

  // Messages
  messages: ChatMessage[]

  // Code
  currentCode: Record<string, string>
  versions: CodeVersion[]
  currentVersionNumber: number

  // Agent state
  activeAgent: AgentName | null
  isGenerating: boolean

  // Prompt optimization
  pendingPromptOptions: string[] | null
  awaitingPromptSelection: boolean

  // Approval
  pendingFeatures: Array<{ text: string; approved: boolean }> | null
  awaitingApproval: boolean
  lastUserPrompt: string

  // QA
  qaErrors: string[]
  qaAttempts: number
  qaEnabled: boolean

  // Settings
  mode: WorkspaceMode
  model: ModelProvider
  previewDevice: PreviewDevice
  showConsole: boolean
  tokensUsed: number

  // Actions
  setProjectId: (id: string | null) => void
  setProjectTitle: (title: string) => void
  addMessage: (message: ChatMessage) => void
  updateLastAgentMessage: (content: string, contentType?: ContentType) => void
  setCurrentCode: (code: Record<string, string>) => void
  mergeCode: (files: Record<string, string>) => void
  addVersion: (version: CodeVersion) => void
  rollbackToVersion: (versionNumber: number) => void
  setActiveAgent: (agent: AgentName | null) => void
  setIsGenerating: (generating: boolean) => void
  setMode: (mode: WorkspaceMode) => void
  setModel: (model: ModelProvider) => void
  setPreviewDevice: (device: PreviewDevice) => void
  setShowConsole: (show: boolean) => void
  addTokens: (tokens: number) => void
  setPendingPromptOptions: (options: string[] | null) => void
  setAwaitingPromptSelection: (v: boolean) => void
  setPendingFeatures: (features: Array<{ text: string; approved: boolean }> | null) => void
  setAwaitingApproval: (v: boolean) => void
  setLastUserPrompt: (prompt: string) => void
  toggleFeatureApproval: (index: number) => void
  setQaErrors: (errors: string[]) => void
  incrementQaAttempts: () => void
  resetQa: () => void
  setQaEnabled: (v: boolean) => void
  reset: () => void
}

const initialState = {
  projectId: null as string | null,
  projectTitle: 'Untitled Project',
  messages: [] as ChatMessage[],
  currentCode: {} as Record<string, string>,
  versions: [] as CodeVersion[],
  currentVersionNumber: 0,
  activeAgent: null as AgentName | null,
  isGenerating: false,
  pendingPromptOptions: null as string[] | null,
  awaitingPromptSelection: false,
  pendingFeatures: null as Array<{ text: string; approved: boolean }> | null,
  awaitingApproval: false,
  lastUserPrompt: '',
  qaErrors: [] as string[],
  qaAttempts: 0,
  qaEnabled: true,
  mode: 'team' as WorkspaceMode,
  model: 'gemini' as ModelProvider,
  previewDevice: 'desktop' as PreviewDevice,
  showConsole: false,
  tokensUsed: 0,
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  ...initialState,

  setProjectId: (id) => set({ projectId: id }),
  setProjectTitle: (title) => set({ projectTitle: title }),

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  updateLastAgentMessage: (content, contentType) =>
    set((state) => {
      const messages = [...state.messages]
      const lastIdx = messages.length - 1
      if (lastIdx >= 0 && messages[lastIdx].role === 'agent') {
        messages[lastIdx] = {
          ...messages[lastIdx],
          content: messages[lastIdx].content + content,
          content_type: contentType || messages[lastIdx].content_type,
        }
      }
      return { messages }
    }),

  setCurrentCode: (code) => set({ currentCode: code }),

  mergeCode: (files) =>
    set((state) => ({
      currentCode: { ...state.currentCode, ...files },
    })),

  addVersion: (version) =>
    set((state) => ({
      versions: [...state.versions, version],
      currentVersionNumber: version.version_number,
    })),

  rollbackToVersion: (versionNumber) => {
    const version = get().versions.find((v) => v.version_number === versionNumber)
    if (version) {
      set({
        currentCode: version.files,
        currentVersionNumber: versionNumber,
      })
    }
  },

  setActiveAgent: (agent) => set({ activeAgent: agent }),
  setIsGenerating: (generating) => set({ isGenerating: generating }),
  setMode: (mode) => set({ mode }),
  setModel: (model) => set({ model }),
  setPreviewDevice: (device) => set({ previewDevice: device }),
  setShowConsole: (show) => set({ showConsole: show }),
  addTokens: (tokens) =>
    set((state) => ({ tokensUsed: state.tokensUsed + tokens })),
  setPendingPromptOptions: (options) => set({ pendingPromptOptions: options }),
  setAwaitingPromptSelection: (v) => set({ awaitingPromptSelection: v }),
  setPendingFeatures: (features) => set({ pendingFeatures: features }),
  setAwaitingApproval: (v) => set({ awaitingApproval: v }),
  setLastUserPrompt: (prompt) => set({ lastUserPrompt: prompt }),
  toggleFeatureApproval: (index) =>
    set((state) => {
      if (!state.pendingFeatures) return state
      return {
        pendingFeatures: state.pendingFeatures.map((f, i) =>
          i === index ? { ...f, approved: !f.approved } : f
        ),
      }
    }),
  setQaErrors: (errors) => set({ qaErrors: errors }),
  incrementQaAttempts: () =>
    set((state) => ({ qaAttempts: state.qaAttempts + 1 })),
  resetQa: () => set({ qaErrors: [], qaAttempts: 0 }),
  setQaEnabled: (v) => set({ qaEnabled: v }),
  reset: () => set(initialState),
}))
