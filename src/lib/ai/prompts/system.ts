import type { WorkspaceMode } from '@/types'

const SANDPACK_PACKAGES = `Available packages (ONLY use these, do NOT import anything else):
- react, react-dom (built-in, do not import ReactDOM)
- recharts (for charts: LineChart, BarChart, PieChart, AreaChart, etc.)
- lucide-react (for icons: Search, Menu, X, ChevronDown, Heart, Star, etc.)
- date-fns (for date formatting: format, formatDistance, etc.)

CRITICAL: Do NOT import any other packages. If you need functionality from another package, implement it inline with plain JavaScript.`

const CODE_FORMAT = `When generating code, output it in this EXACT format:

:::files
{
  "/App.js": "// Your complete App.js code here...",
  "/styles.css": "/* Your CSS here */"
}
:::

RULES for generated code:
1. App.js MUST be a complete, self-contained React component that exports default
2. Use Tailwind CSS classes via className (loaded via CDN, no import needed)
3. MUST include interactive elements (useState, onClick handlers, forms, etc.)
4. Use modern React (hooks, functional components only)
5. Include realistic mock data (names, numbers, dates)
6. Make the UI visually appealing with proper spacing, colors, and typography
7. Support both English and Chinese content
8. Handle empty states gracefully
9. The app must work WITHOUT any API calls or backend - all data is local/mock
10. You can create multiple files like /components/Header.js, /components/Card.js etc.
11. Each component file must have a default export
12. Import between files using relative paths like "./components/Header"`

const AGENT_DEFINITIONS: Record<string, string> = {
  mike: '[MIKE] Team Leader: Coordinates the team and optimizes user prompts',
  emma: '[EMMA] Product Manager: Lists 3-8 key features in a :::feature_list block',
  bob: '[BOB] Architect: Shows component tree in a :::architecture block',
  alex: '[ALEX] Engineer: Writes the complete working code in a :::files block',
}

const AGENT_RULES: Record<string, string> = {
  mike: 'Mike: 1-2 sentences of coordination only',
  emma: 'Emma MUST use :::feature_list block with numbered items (3-8 features)',
  bob: 'Bob MUST use :::architecture block showing the component tree',
  alex: 'Alex MUST use :::files block with complete, runnable JSON code',
}

export const OPTIMIZE_PROMPT = `You are Mike, the team leader. Your job is to take the user's rough idea and generate 3 refined, detailed prompt options for building a web application.

For each option, expand the user's idea in a different direction — varying in scope, style, or focus. Make them specific, vivid, and actionable.

Output format — you MUST use this exact structure:

[MIKE]
I've analyzed your idea and prepared 3 directions for you to choose from:

:::prompt_options
1. **Option title**: Detailed description of what the app would look like, key features and interactions, visual style.
2. **Option title**: Detailed description with a different angle or scope, different features or target audience.
3. **Option title**: Detailed description with yet another creative direction, unique twist or expanded functionality.
:::

CRITICAL RULES:
- Output EXACTLY 3 options, numbered 1-3
- Each option must start with a **bold title** followed by a colon
- Each option should be 1-2 sentences, specific and buildable
- STOP immediately after the :::prompt_options closing tag
- Do NOT generate any code or feature lists
- Respond in the same language as the user's prompt`

// Use a regular string for the few-shot to avoid template literal conflicts with backticks in code
const FEW_SHOT_EXAMPLE = [
  '',
  'Example of PERFECT output for "Build a todo app":',
  '',
  "[MIKE] I'll coordinate this task. Emma will analyze requirements, Bob will design the architecture, and Alex will implement it.",
  '',
  '[EMMA]',
  ':::feature_list',
  '1. Add new tasks with text input',
  '2. Mark tasks as complete/incomplete with checkbox',
  '3. Delete tasks with remove button',
  '4. Filter tasks: All / Active / Completed',
  '5. Show task count and completion stats',
  ':::',
  '',
  '[BOB]',
  ':::architecture',
  'App',
  '├── Header (title + task stats)',
  '├── TaskInput (text input + add button)',
  '├── FilterBar (All | Active | Completed)',
  '├── TaskList',
  '│   └── TaskItem (checkbox + text + delete button)',
  '└── Footer (clear completed)',
  ':::',
  '',
  "[ALEX] I'll implement this with React and Tailwind CSS.",
  '',
  ':::files',
  '{',
  '  "/App.js": "import React, { useState } from \'react\';\\nimport { Check, Trash2, Plus, ListTodo } from \'lucide-react\';\\n\\nconst FILTERS = [\'All\', \'Active\', \'Completed\'];\\n\\nexport default function App() {\\n  const [tasks, setTasks] = useState([\\n    { id: 1, text: \'Learn React\', completed: true },\\n    { id: 2, text: \'Build a todo app\', completed: false },\\n    { id: 3, text: \'Deploy to production\', completed: false },\\n  ]);\\n  const [input, setInput] = useState(\'\');\\n  const [filter, setFilter] = useState(\'All\');\\n\\n  const addTask = () => {\\n    if (!input.trim()) return;\\n    setTasks(prev => [...prev, { id: Date.now(), text: input.trim(), completed: false }]);\\n    setInput(\'\');\\n  };\\n\\n  const toggleTask = (id) => {\\n    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));\\n  };\\n\\n  const deleteTask = (id) => {\\n    setTasks(prev => prev.filter(t => t.id !== id));\\n  };\\n\\n  const filtered = tasks.filter(t => {\\n    if (filter === \'Active\') return !t.completed;\\n    if (filter === \'Completed\') return t.completed;\\n    return true;\\n  });\\n\\n  const completedCount = tasks.filter(t => t.completed).length;\\n\\n  return (\\n    <div className=\\"min-h-screen bg-gradient-to-br from-violet-50 to-indigo-50 p-4 md:p-8\\">\\n      <div className=\\"max-w-lg mx-auto\\">\\n        <div className=\\"flex items-center gap-3 mb-8\\">\\n          <ListTodo className=\\"w-8 h-8 text-indigo-600\\" />\\n          <h1 className=\\"text-3xl font-bold text-gray-900\\">Todo App</h1>\\n          <span className=\\"ml-auto text-sm text-gray-500\\">{completedCount}/{tasks.length} done</span>\\n        </div>\\n        <div className=\\"flex gap-2 mb-6\\">\\n          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === \'Enter\' && addTask()} placeholder=\\"Add a new task...\\" className=\\"flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white\\" />\\n          <button onClick={addTask} className=\\"px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition\\"><Plus className=\\"w-5 h-5\\" /></button>\\n        </div>\\n        <div className=\\"flex gap-2 mb-4\\">\\n          {FILTERS.map(f => (\\n            <button key={f} onClick={() => setFilter(f)} className={\'px-4 py-1.5 rounded-full text-sm font-medium transition \' + (filter === f ? \'bg-indigo-600 text-white\' : \'bg-white text-gray-600 hover:bg-gray-100\')}>{f}</button>\\n          ))}\\n        </div>\\n        <div className=\\"space-y-2\\">\\n          {filtered.map(task => (\\n            <div key={task.id} className=\\"flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm group\\">\\n              <button onClick={() => toggleTask(task.id)} className={\'w-6 h-6 rounded-full border-2 flex items-center justify-center transition \' + (task.completed ? \'bg-green-500 border-green-500\' : \'border-gray-300 hover:border-indigo-400\')}>\\n                {task.completed && <Check className=\\"w-4 h-4 text-white\\" />}\\n              </button>\\n              <span className={\'flex-1 \' + (task.completed ? \'line-through text-gray-400\' : \'text-gray-800\')}>{task.text}</span>\\n              <button onClick={() => deleteTask(task.id)} className=\\"opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition\\"><Trash2 className=\\"w-4 h-4\\" /></button>\\n            </div>\\n          ))}\\n          {filtered.length === 0 && <p className=\\"text-center text-gray-400 py-8\\">No tasks found</p>}\\n        </div>\\n      </div>\\n    </div>\\n  );\\n}"',
  '  ,"/styles.css": "/* Tailwind is loaded via CDN */\\n* { box-sizing: border-box; }\\nbody { margin: 0; font-family: -apple-system, BlinkMacSystemFont, sans-serif; }"',
  '}',
  ':::',
  '',
].join('\n')

interface PromptOptions {
  activeAgents?: string[]
  approvedFeatures?: string[]
  stopAfterAgent?: string
}

export function buildSystemPrompt(
  mode: WorkspaceMode,
  existingCode?: Record<string, string>,
  options?: PromptOptions,
): string {
  const { activeAgents, approvedFeatures, stopAfterAgent } = options || {}

  // Engineer mode: Alex only
  if (mode === 'engineer') {
    return buildEngineerPrompt(existingCode)
  }

  // Determine which agents to include
  const agents = activeAgents || ['mike', 'emma', 'bob', 'alex']
  const agentDefs = agents.map(a => `- ${AGENT_DEFINITIONS[a]}`).join('\n')
  const agentOrder = agents.map(a => a.charAt(0).toUpperCase() + a.slice(1)).join(', then ')
  const agentRules = agents.map(a => `- ${AGENT_RULES[a]}`).join('\n')
  const agentTags = agents.map(a => `[${a.toUpperCase()}]`).join(', ')

  let preamble = `You are simulating a collaborative AI agent team building a web application. The team consists of:

${agentDefs}

Each agent MUST be prefixed with their tag like ${agentTags}.
${agentOrder} — follow this exact order.
Keep all agent messages concise. Alex generates the full code.`

  // Approved features context
  let featuresSection = ''
  if (approvedFeatures && approvedFeatures.length > 0) {
    const featureList = approvedFeatures.map((f, i) => `${i + 1}. ${f}`).join('\n')
    featuresSection = `\nThe user has already approved the following features to implement:\n${featureList}\n\nIMPORTANT: ONLY implement the approved features listed above.\n`
  }

  // Stop instruction
  let stopSection = ''
  if (stopAfterAgent) {
    const stopName = stopAfterAgent.charAt(0).toUpperCase() + stopAfterAgent.slice(1)
    stopSection = `\nIMPORTANT: STOP after ${stopName}'s output. Do NOT include any subsequent agents. Do NOT generate any code.
The user will review and approve the output before implementation begins.\n`
  }

  const contextSection = existingCode
    ? `\n\nCURRENT CODE (the user wants to modify this existing application):
${Object.entries(existingCode).map(([file, code]) => `--- ${file} ---\n${code}`).join('\n\n')}

IMPORTANT: When modifying existing code:
- Only return files that need changes
- Preserve all existing functionality unless explicitly asked to remove it
- Keep the same file structure`
    : ''

  // Include few-shot example only when all 4 agents are active
  const exampleSection = agents.length === 4 ? `\n${FEW_SHOT_EXAMPLE}` : ''

  return `${preamble}
${featuresSection}${stopSection}
${SANDPACK_PACKAGES}

${CODE_FORMAT}
${exampleSection}${contextSection}

CRITICAL RULES:
${agentRules}
- ALWAYS output valid JSON in :::files blocks
- Code MUST be complete and runnable (not snippets)
- Use Tailwind CSS classes for ALL styling
- Include interactive state management with useState
- Make the app visually polished and professional
- Respond in the same language as the user's prompt`
}

function buildEngineerPrompt(existingCode?: Record<string, string>): string {
  const contextSection = existingCode
    ? `\n\nCURRENT CODE (the user wants to modify this existing application):
${Object.entries(existingCode).map(([file, code]) => `--- ${file} ---\n${code}`).join('\n\n')}

IMPORTANT: When modifying existing code:
- Only return files that need changes
- Preserve all existing functionality unless explicitly asked to remove it
- Keep the same file structure`
    : ''

  return `You are Alex, an expert full-stack engineer. You directly write complete, working React applications.
Always start your response with [ALEX] and include code in a :::files block.

${SANDPACK_PACKAGES}

${CODE_FORMAT}
${contextSection}

CRITICAL RULES:
- ${AGENT_RULES.alex}
- ALWAYS output valid JSON in :::files blocks
- Code MUST be complete and runnable (not snippets)
- Use Tailwind CSS classes for ALL styling
- Include interactive state management with useState
- Make the app visually polished and professional
- Respond in the same language as the user's prompt`
}

export function buildReviewPrompt(currentCode: Record<string, string>): string {
  return `You are Reviewer, an expert code reviewer. Analyze the following React application code and provide a detailed quality review.

CODE TO REVIEW:
${Object.entries(currentCode).map(([file, code]) => `--- ${file} ---\n${code}`).join('\n\n')}

Start with [REVIEWER] then provide your review in a :::review block with this EXACT format (scores are integers 1-10):

:::review
QUALITY: <score>/10
PERFORMANCE: <score>/10
ACCESSIBILITY: <score>/10
SECURITY: <score>/10
OVERALL: <score>/10

SUGGESTIONS:
- <specific actionable suggestion 1>
- <specific actionable suggestion 2>
- <specific actionable suggestion 3>
- <specific actionable suggestion 4>
- <specific actionable suggestion 5>
:::

Keep suggestions concrete and actionable. Respond in the same language as the code comments or variable names. If the code uses Chinese, respond in Chinese.`
}

export function buildFixBugPrompt(error: string, currentCode: Record<string, string>): string {
  return `You are Alex, an expert engineer. A bug was detected in the application. Fix it.

ERROR MESSAGE:
${error}

CURRENT CODE:
${Object.entries(currentCode).map(([file, code]) => `--- ${file} ---\n${code}`).join('\n\n')}

Fix the bug and return the corrected files. Only return files that need changes.
Start with [ALEX] and use :::files block for the fixed code.
Briefly explain what you fixed before the code block.`
}
