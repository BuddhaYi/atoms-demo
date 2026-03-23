import type { AgentName, ContentType, StreamEvent } from '@/types'
import { AGENT_NAMES } from './registry'

const AGENT_TAG_REGEX = /\[([A-Z]+)\]/
const FILES_START = ':::files'
const FILES_END = ':::'
const FEATURE_LIST_START = ':::feature_list'
const ARCHITECTURE_START = ':::architecture'
const REVIEW_START = ':::review'
const PROMPT_OPTIONS_START = ':::prompt_options'
const BLOCK_END = ':::'

type BlockType = 'files' | 'feature_list' | 'architecture' | 'review' | 'prompt_options' | null

interface ParserState {
  currentAgent: AgentName | null
  buffer: string
  inBlock: BlockType
  blockContent: string
}

export function createStreamParser() {
  const state: ParserState = {
    currentAgent: null,
    buffer: '',
    inBlock: null,
    blockContent: '',
  }

  return {
    parse(chunk: string): StreamEvent[] {
      const events: StreamEvent[] = []
      state.buffer += chunk

      while (state.buffer.length > 0) {
        if (state.inBlock === null) {
          // Check for agent tag
          const agentMatch = state.buffer.match(AGENT_TAG_REGEX)
          if (agentMatch && state.buffer.indexOf(agentMatch[0]) === 0) {
            const agentName = agentMatch[1].toLowerCase() as AgentName
            if (AGENT_NAMES.includes(agentName)) {
              if (state.currentAgent) {
                events.push({ type: 'agent_end', agent: state.currentAgent })
              }
              state.currentAgent = agentName
              events.push({ type: 'agent_start', agent: agentName, message: '' })
              state.buffer = state.buffer.slice(agentMatch[0].length).trimStart()
              continue
            }
          }

          // Check for block starts
          if (state.buffer.startsWith(FILES_START)) {
            state.inBlock = 'files'
            state.blockContent = ''
            state.buffer = state.buffer.slice(FILES_START.length).trimStart()
            continue
          }
          if (state.buffer.startsWith(FEATURE_LIST_START)) {
            state.inBlock = 'feature_list'
            state.blockContent = ''
            state.buffer = state.buffer.slice(FEATURE_LIST_START.length).trimStart()
            continue
          }
          if (state.buffer.startsWith(ARCHITECTURE_START)) {
            state.inBlock = 'architecture'
            state.blockContent = ''
            state.buffer = state.buffer.slice(ARCHITECTURE_START.length).trimStart()
            continue
          }
          if (state.buffer.startsWith(REVIEW_START)) {
            state.inBlock = 'review'
            state.blockContent = ''
            state.buffer = state.buffer.slice(REVIEW_START.length).trimStart()
            continue
          }
          if (state.buffer.startsWith(PROMPT_OPTIONS_START)) {
            state.inBlock = 'prompt_options'
            state.blockContent = ''
            state.buffer = state.buffer.slice(PROMPT_OPTIONS_START.length).trimStart()
            continue
          }

          // Regular text - process lines first for agent tag detection
          const newlineIdx = state.buffer.indexOf('\n')
          if (newlineIdx >= 0) {
            const line = state.buffer.slice(0, newlineIdx + 1)
            state.buffer = state.buffer.slice(newlineIdx + 1)

            const trimmed = line.trim()
            if (trimmed && state.currentAgent) {
              // Check if this line starts with an agent tag
              const lineAgentMatch = trimmed.match(AGENT_TAG_REGEX)
              if (lineAgentMatch && trimmed.indexOf(lineAgentMatch[0]) === 0) {
                state.buffer = trimmed + '\n' + state.buffer
                continue
              }
              events.push({
                type: 'agent_message',
                agent: state.currentAgent,
                content: trimmed,
                content_type: 'text',
              })
            }
          } else {
            // No newline yet — emit partial text for real-time streaming
            // But only if it doesn't look like a potential agent tag or block start
            const trimmed = state.buffer.trim()
            if (
              trimmed &&
              state.currentAgent &&
              !trimmed.startsWith('[') &&
              !trimmed.startsWith(':::')
            ) {
              events.push({
                type: 'agent_message',
                agent: state.currentAgent,
                content: trimmed,
                content_type: 'text',
              })
              state.buffer = ''
            }
            break
          }
        } else if (state.inBlock === 'files') {
          // Files block: accumulate until closing ::: (need complete JSON)
          const newlineIdx = state.buffer.indexOf('\n')
          if (newlineIdx >= 0) {
            const line = state.buffer.slice(0, newlineIdx)
            state.buffer = state.buffer.slice(newlineIdx + 1)

            const trimmed = line.trim()
            if (trimmed === BLOCK_END && state.blockContent.length > 0) {
              state.inBlock = null
              const content = state.blockContent.trim()
              state.blockContent = ''

              try {
                const files = JSON.parse(content)
                events.push({ type: 'code_complete', files })
              } catch {
                const jsonMatch = content.match(/\{[\s\S]*\}/)
                if (jsonMatch) {
                  try {
                    const files = JSON.parse(jsonMatch[0])
                    events.push({ type: 'code_complete', files })
                  } catch {
                    events.push({ type: 'error', message: 'Failed to parse generated code' })
                  }
                }
              }
            } else {
              state.blockContent += line + '\n'
            }
          } else {
            break
          }
        } else {
          // feature_list, architecture, review blocks: stream lines progressively
          const newlineIdx = state.buffer.indexOf('\n')
          if (newlineIdx >= 0) {
            const line = state.buffer.slice(0, newlineIdx)
            state.buffer = state.buffer.slice(newlineIdx + 1)

            const trimmed = line.trim()
            if (trimmed === BLOCK_END && state.blockContent.length > 0) {
              // Block complete
              state.inBlock = null
              state.blockContent = ''
              // Final content already streamed line-by-line, no need to emit again
            } else {
              state.blockContent += line + '\n'
              // Emit each line progressively for real-time display
              if (trimmed && state.currentAgent) {
                const contentType: ContentType = state.inBlock === 'feature_list'
                  ? 'feature_list'
                  : state.inBlock === 'review'
                  ? 'review'
                  : state.inBlock === 'prompt_options'
                  ? 'prompt_options'
                  : 'architecture'
                events.push({
                  type: 'agent_message',
                  agent: state.currentAgent,
                  content: trimmed,
                  content_type: contentType,
                })
              }
            }
          } else {
            break
          }
        }
      }

      return events
    },

    flush(): StreamEvent[] {
      const events: StreamEvent[] = []

      // Handle any remaining block content
      if (state.inBlock === 'files' && state.blockContent.trim()) {
        try {
          const files = JSON.parse(state.blockContent.trim())
          events.push({ type: 'code_complete', files })
        } catch {
          const jsonMatch = state.blockContent.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            try {
              const files = JSON.parse(jsonMatch[0])
              events.push({ type: 'code_complete', files })
            } catch {
              // ignore
            }
          }
        }
      }

      // Emit any remaining buffer text
      if (state.buffer.trim() && state.currentAgent) {
        events.push({
          type: 'agent_message',
          agent: state.currentAgent,
          content: state.buffer.trim(),
          content_type: 'text',
        })
      }

      if (state.currentAgent) {
        events.push({ type: 'agent_end', agent: state.currentAgent })
      }

      events.push({ type: 'done' })
      return events
    },
  }
}
