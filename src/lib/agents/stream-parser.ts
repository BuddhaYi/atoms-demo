import type { AgentName, ContentType, StreamEvent } from '@/types'
import { AGENT_NAMES } from './registry'

const AGENT_TAG_REGEX = /\[([A-Z]+)\]/
const FILES_START = ':::files'
const FILES_END = ':::'
const FEATURE_LIST_START = ':::feature_list'
const ARCHITECTURE_START = ':::architecture'
const BLOCK_END = ':::'

type BlockType = 'files' | 'feature_list' | 'architecture' | null

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

      // Process buffer line by line for block detection,
      // but also handle streaming text within a line
      while (state.buffer.length > 0) {
        // Check for block boundaries first
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

          // Regular text - emit as agent message
          const newlineIdx = state.buffer.indexOf('\n')
          if (newlineIdx >= 0) {
            const line = state.buffer.slice(0, newlineIdx + 1)
            state.buffer = state.buffer.slice(newlineIdx + 1)

            // Skip empty lines or lines that are just whitespace
            const trimmed = line.trim()
            if (trimmed && state.currentAgent) {
              // Check if this line starts with an agent tag
              const lineAgentMatch = trimmed.match(AGENT_TAG_REGEX)
              if (lineAgentMatch && trimmed.indexOf(lineAgentMatch[0]) === 0) {
                // Put it back and let the loop handle it
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
            // No newline yet, wait for more data
            break
          }
        } else {
          // We're inside a block, accumulate until we find the closing :::
          const newlineIdx = state.buffer.indexOf('\n')
          if (newlineIdx >= 0) {
            const line = state.buffer.slice(0, newlineIdx)
            state.buffer = state.buffer.slice(newlineIdx + 1)

            const trimmed = line.trim()
            if (trimmed === BLOCK_END && state.blockContent.length > 0) {
              // End of block
              const blockType = state.inBlock
              const content = state.blockContent.trim()
              state.inBlock = null
              state.blockContent = ''

              if (blockType === 'files' && state.currentAgent) {
                try {
                  const files = JSON.parse(content)
                  events.push({ type: 'code_complete', files })
                } catch {
                  // Try to extract JSON from the content
                  const jsonMatch = content.match(/\{[\s\S]*\}/)
                  if (jsonMatch) {
                    try {
                      const files = JSON.parse(jsonMatch[0])
                      events.push({ type: 'code_complete', files })
                    } catch {
                      events.push({
                        type: 'error',
                        message: 'Failed to parse generated code',
                      })
                    }
                  }
                }
              } else if (blockType === 'feature_list' && state.currentAgent) {
                events.push({
                  type: 'agent_message',
                  agent: state.currentAgent,
                  content,
                  content_type: 'feature_list',
                })
              } else if (blockType === 'architecture' && state.currentAgent) {
                events.push({
                  type: 'agent_message',
                  agent: state.currentAgent,
                  content,
                  content_type: 'architecture',
                })
              }
            } else {
              state.blockContent += line + '\n'
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

      if (state.currentAgent) {
        events.push({ type: 'agent_end', agent: state.currentAgent })
      }

      events.push({ type: 'done' })
      return events
    },
  }
}
