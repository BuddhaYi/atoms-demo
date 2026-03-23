# Atoms Demo

> Multi-AI Agent collaborative code generation platform, inspired by [Atoms.dev](https://atoms.dev)

Users describe what they want in natural language. A team of AI agents collaborates to analyze requirements, design architecture, and generate a fully runnable React application with live preview.

## Features

### Core
- **Multi-Agent Collaboration** — 4 specialized AI agents (Mike/Team Leader, Emma/PM, Bob/Architect, Alex/Engineer) work together, each producing distinct artifacts
- **Rich Artifact Cards** — Not just chat text: structured requirement lists, architecture tree diagrams, and code blocks with live preview
- **Live Code Preview** — Generated React apps run instantly in Sandpack with full interactivity
- **Iterative Modification** — Chat to refine: "change the button color to red" generates a new version with only modified files
- **Multi-Model Support** — Switch between Claude, Gemini, and GPT-4o mid-conversation

### Extended
- **Version History & Rollback** — Every generation creates a version; click to rollback
- **Fix Bug** — Captures Sandpack console errors, sends to AI for auto-repair
- **Engineer/Team Mode** — Solo mode (Alex only) or full team collaboration
- **Desktop/Mobile Preview** — Switch between desktop and iPhone-frame preview
- **Dark Mode** — System-aware theme with manual toggle
- **Code Export** — Download generated app as a zip with package.json and README
- **Responsive Layout** — Works on mobile (vertical stack) and desktop (side-by-side)
- **Bilingual** — Supports English and Chinese prompts; agents respond bilingually

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Next.js App                         │
├────────────────────────┬────────────────────────────────┤
│     Chat Panel (40%)   │      Preview Panel (60%)        │
│                        │                                 │
│  ┌──────────────────┐  │  ┌───────────────────────────┐  │
│  │  User Message     │  │  │  Sandpack Live Preview    │  │
│  ├──────────────────┤  │  │  (React + Tailwind CDN)   │  │
│  │ 👩 Emma: Req Card │  │  │                           │  │
│  ├──────────────────┤  │  │  Desktop / Mobile toggle   │  │
│  │ 🏗️ Bob: Arch Card │  │  │  Console + Fix Bug        │  │
│  ├──────────────────┤  │  │                           │  │
│  │ ⚡ Alex: Code     │  │  ├───────────────────────────┤  │
│  └──────────────────┘  │  │  Version History (v1 v2..) │  │
│  ┌──────────────────┐  │  └───────────────────────────┘  │
│  │  Chat Input       │  │                                 │
│  └──────────────────┘  │                                 │
├────────────────────────┴────────────────────────────────┤
│                    /api/chat (Edge Runtime)               │
│         SSE stream → [AGENT] markers + :::blocks:::      │
│              ↓                                           │
│     Model Router (Claude / Gemini / OpenAI)              │
└─────────────────────────────────────────────────────────┘
```

### Multi-Agent Strategy

A single LLM call generates output with structured markers. The frontend parses these in real-time:

```
[MIKE] Coordinating the team...
[EMMA]
:::feature_list
1. Feature A
2. Feature B
:::
[BOB]
:::architecture
App
├── Header
├── Main Content
└── Footer
:::
[ALEX]
:::files
{"App.js": "import React...", "styles.css": "..."}
:::
```

Each `[AGENT]` tag triggers an avatar animation. Each `:::block:::` renders as a rich card (not plain text). The `:::files:::` block updates the Sandpack preview in real-time.

**Why this matters**: This is NOT a GPT wrapper. Each agent produces a different type of artifact, creating a visible team collaboration experience.

### Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Preview engine | Sandpack | Reliable in-browser bundler with dependency support |
| Agent simulation | Single LLM + markers | More consistent than multiple API calls; cheaper and faster |
| Streaming | SSE on Edge Runtime | No Vercel timeout; real-time agent streaming |
| Iteration | Diff-based (modified files only) | Saves tokens; reduces errors |
| Persistence | localStorage (Supabase-ready) | Zero-config; instant; Supabase schema + RLS prepared |
| State | Zustand | Lightweight; supports external setState for streaming |
| Styling | Tailwind CSS v4 + shadcn/ui | Rapid UI development; consistent design system |
| Package whitelist | Hardcoded in prompt | Ensures Sandpack compatibility |

### File Structure

```
src/
├── app/
│   ├── page.tsx                    # Homepage with prompt input + categories
│   ├── dashboard/page.tsx          # Project list
│   ├── workspace/[projectId]/      # Main workspace page
│   ├── login/ & register/          # Auth pages (Supabase-ready)
│   └── api/chat/route.ts           # Edge Runtime SSE endpoint
├── components/
│   ├── workspace/
│   │   ├── ChatPanel.tsx           # Message list + agent cards
│   │   ├── ChatMessage.tsx         # Rich artifact rendering
│   │   ├── FeatureListCard.tsx     # Emma's requirement cards
│   │   ├── ArchitectureCard.tsx    # Bob's architecture tree
│   │   ├── AgentIndicator.tsx      # Pulse animation + typing dots
│   │   ├── PreviewPanel.tsx        # Sandpack wrapper + toolbar
│   │   ├── SandpackPreview.tsx     # Sandpack provider + config
│   │   ├── VersionHistory.tsx      # Version pills + rollback
│   │   └── TopBar.tsx              # Mode/model toggle + export
│   └── ui/                         # shadcn/ui components
├── lib/
│   ├── ai/
│   │   ├── model-router.ts        # Claude/Gemini/OpenAI streaming
│   │   └── prompts/system.ts      # Agent personas + few-shot examples
│   ├── agents/
│   │   ├── registry.ts            # Agent definitions + avatars
│   │   └── stream-parser.ts       # [AGENT] + :::block::: parser
│   ├── local-storage.ts           # localStorage persistence layer
│   └── supabase/                   # Supabase client (optional)
├── store/workspace-store.ts        # Zustand store
├── hooks/useChat.ts                # SSE consumption + agent state
└── types/index.ts                  # TypeScript definitions
```

## Tech Stack

- **Framework**: Next.js 16 (App Router) + TypeScript
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **State**: Zustand
- **Preview**: Sandpack (CodeSandbox)
- **AI**: Claude API + OpenAI API + Gemini (via grsai gateway)
- **Streaming**: Server-Sent Events (Edge Runtime)
- **Persistence**: localStorage (Supabase migration prepared)
- **Theme**: next-themes (dark/light mode)

## Getting Started

```bash
# Install dependencies
npm install

# Configure environment variables
cp .env.example .env.local
# Edit .env.local with your API keys

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes* | Gemini API key (via grsai gateway) |
| `GEMINI_BASE_URL` | No | Gateway URL (default: grsai.dakka.com.cn) |
| `GEMINI_MODEL` | No | Model name (default: gemini-3.1-pro) |
| `ANTHROPIC_API_KEY` | Yes* | Claude API key |
| `OPENAI_API_KEY` | Yes* | OpenAI API key |

\* At least one model must be configured

## Deploy

```bash
# Deploy to Vercel
npx vercel

# Set environment variables in Vercel dashboard
# Project Settings → Environment Variables
```

## What's Implemented vs. Planned

### Completed (P0 + P1)
- [x] Multi-agent collaboration with rich artifact cards
- [x] Live Sandpack preview with interactive apps
- [x] Iterative code modification via chat
- [x] 3 AI models: Claude, Gemini, GPT-4o
- [x] Engineer/Team mode switching
- [x] Version history + rollback
- [x] Fix Bug (auto-repair from console errors)
- [x] Desktop/Mobile preview toggle
- [x] Dark mode
- [x] Responsive layout
- [x] Code export (zip download)
- [x] Homepage with category suggestions
- [x] Auth pages (Supabase-ready)
- [x] localStorage persistence
- [x] Supabase schema + RLS migration prepared

### Future Enhancements (P2)
- [ ] Race Mode (dual-model comparison)
- [ ] @mention agent selector
- [ ] File tree (multi-file browsing)
- [ ] Token usage tracking
- [ ] Prompt enhancement (Iris agent)
- [ ] AI-generated project names
- [ ] Animation polish (page transitions, message fade-in)

## License

MIT
