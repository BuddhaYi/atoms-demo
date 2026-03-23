import type { Agent, AgentName } from '@/types'

export const AGENTS: Record<AgentName, Agent> = {
  mike: {
    name: 'mike',
    displayName: 'Mike',
    role: 'Team Leader',
    emoji: '👨‍💼',
    color: '#FF6B35',
    description: 'Coordinates tasks and delegates to the right agent',
  },
  emma: {
    name: 'emma',
    displayName: 'Emma',
    role: 'Product Manager',
    emoji: '👩‍💻',
    color: '#F7C948',
    description: 'Analyzes requirements and creates product specs',
  },
  bob: {
    name: 'bob',
    displayName: 'Bob',
    role: 'Architect',
    emoji: '🏗️',
    color: '#E84855',
    description: 'Designs system architecture and component structure',
  },
  alex: {
    name: 'alex',
    displayName: 'Alex',
    role: 'Engineer',
    emoji: '⚡',
    color: '#4ECDC4',
    description: 'Full-stack developer, writes production code',
  },
  david: {
    name: 'david',
    displayName: 'David',
    role: 'Data Analyst',
    emoji: '📊',
    color: '#45B7D1',
    description: 'Handles data processing and visualization',
  },
  iris: {
    name: 'iris',
    displayName: 'Iris',
    role: 'Deep Researcher',
    emoji: '🔍',
    color: '#96CEB4',
    description: 'Gathers information and research insights',
  },
  sarah: {
    name: 'sarah',
    displayName: 'Sarah',
    role: 'SEO Specialist',
    emoji: '📈',
    color: '#DDA0DD',
    description: 'Optimizes for search engines and content strategy',
  },
  reviewer: {
    name: 'reviewer',
    displayName: 'Reviewer',
    role: 'Code Reviewer',
    emoji: '✅',
    color: '#00D084',
    description: 'Reviews code quality, performance, and best practices',
  },
}

export const AGENT_NAMES = Object.keys(AGENTS) as AgentName[]

export function getAgent(name: AgentName): Agent {
  return AGENTS[name]
}
