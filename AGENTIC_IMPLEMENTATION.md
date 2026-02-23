# ProdInt — Agentic Implementation Plan
**Last updated: February 2026**

---

## What "Agentic" Actually Means

Right now ProdInt is a **reactive tool** — user types, LLM responds, user manually takes the output somewhere. Truly agentic means the AI can:
1. **Use tools** — read/write to external systems without human intervention
2. **Plan multi-step actions** — execute a chain of actions without confirmation at each step
3. **React to events** — act on triggers (webhooks, schedules), not just user messages
4. **Remember context** — maintain memory across sessions and across the entire product

The biggest single technical unlock is switching from **chat completions → tool calling** (Gemini supports function calling). That's what turns a chatbot into an agent — the LLM decides which actions to take, not the user.

---

## Implementation Tiers

### 🔴 Tier 1 — High Impact, Buildable Now

#### 1. Full End-to-End Feature Creation
**Vision:** "Create a full Login with Google feature" → agent does everything

Steps the agent would execute autonomously:
1. Write the PRD
2. Break PRD into epics
3. Generate user stories for each epic
4. Create Jira Story → Tasks → Sub-tasks automatically (no "Push to Jira" click)
5. Create a Confluence page with the PRD

**What it needs:**
- Gemini function calling (tool use)
- Chain: `write_prd()` → `generate_stories()` → `create_jira_tickets()` → `create_confluence_page()`

---

#### 2. Bidirectional Jira Reading
Instead of only pushing TO Jira, the agent reads FROM Jira:

| User says | Agent does |
|---|---|
| "What's in my current sprint?" | Fetches + summarises open Jira tickets |
| "This ticket is vague — refine it" | Reads ticket, rewrites with proper ACs |
| "Write an RCA for this bug ticket" | Reads the ticket, generates the full RCA |
| "What's blocking the team?" | Reads in-progress/blocked tickets, suggests resolutions |

**What it needs:**
- Jira READ API routes (auth already exists — just add GET endpoints)
- Tool: `get_sprint_tickets(projectKey, sprintId)`
- Tool: `get_ticket(ticketId)`

---

#### 3. Confluence Integration
- Agent writes PRD → auto-creates a Confluence page in the correct space/folder
- Agent reads existing Confluence pages for context when writing new PRDs

**What it needs:**
- Atlassian Confluence REST API (same OAuth/API token as Jira)
- Store Confluence space key in user's integration config
- Tools: `create_confluence_page()`, `read_confluence_page()`

---

### 🟡 Tier 2 — Game-Changing, Medium Complexity

#### 4. Long-Term Product Memory
Right now every chat starts cold. The agent has no memory of what your product is.

**Solution:**
- `ProductContext` table in DB: stores product name, description, target users, tech stack, existing features
- User defines this once in Settings
- Every PRD/story the agent writes automatically pulls this context — no re-telling
- Agent can update the memory as the product evolves ("we've launched X, now Y is in scope")

**Schema addition:**
```prisma
model ProductContext {
  id          String   @id @default(cuid())
  userId      String   @unique
  productName String
  description String   @db.Text
  personas    Json     // Array of { name, role, goals }
  techStack   String?
  updatedAt   DateTime @updatedAt
  user        User     @relation(fields: [userId], references: [id])
}
```

---

#### 5. Multi-Agent Pipeline
Chain agents together so one triggers the next:

```
Research Agent
    ↓
PRD Agent
    ↓
User Story Agent
    ↓
Jira Agent (creates tickets)
    ↓
Slack notification to team
```

User describes the feature once. Each agent hands its output to the next.

**What it needs:**
- BullMQ job queue (Phase 5 from enterprise data strategy)
- Each agent is a separate job worker
- Output of one job becomes input to the next

---

#### 6. Triggered / Reactive Actions (Webhooks)
Agent acts on events, not just user input:

| Trigger | Agent Action |
|---|---|
| Jira ticket stuck for 5+ days | Auto-draft an RCA in ProdInt |
| New ticket created without ACs | Agent adds acceptance criteria automatically |
| Sprint ends | Agent generates sprint retrospective doc |
| New bug filed | Agent suggests which user story is broken |
| PR merged with `feat:` prefix | Agent updates the PRD to reflect the shipped feature |

**What it needs:**
- Webhook receiver endpoints (`/api/webhooks/jira`, `/api/webhooks/github`)
- BullMQ queue to process webhook events asynchronously
- Jira Automation or GitHub Actions to send webhooks to ProdInt

---

### 🟢 Tier 3 — Future Differentiation

#### 7. Meeting → Tickets Pipeline
- User uploads a meeting transcript or Loom recording
- Agent extracts: action items, decisions, feature requests, open questions
- Each action item becomes a Jira ticket with assignee + due date
- Feature requests become draft user stories

**What it needs:**
- Whisper API (OpenAI) or AssemblyAI for transcription
- LLM pass over transcript to extract structured data
- Mapping extracted items → Jira ticket format

---

#### 8. Competitor / Market Research Agent
- Agent searches the web for competitive context before writing a PRD
- "Write a PRD for collaborative editing — make it better than Notion's"
- Agent researches Notion, Confluence, Coda → incorporates findings into PRD

**What it needs:**
- Tavily API or Perplexity API for real-time web search
- Tool: `search_web(query)` → returns structured results
- Agent decides when web search is needed based on the prompt

---

#### 9. Acceptance Criteria Validator (Autonomous QA)
After generating user stories, a *second* agent reviews them before you see the output:
- Are all ACs testable as written?
- Are there missing edge cases?
- Are they consistent with the PRD goals?
- Do they follow Given/When/Then format?

**What it needs:**
- Second LLM call with a "validator" system prompt
- Returns structured feedback: `{ passed: bool, issues: string[], suggestions: string[] }`
- Runs automatically as part of the user story generation pipeline

---

#### 10. Slack / Teams as a First-Class Interface
PM types in Slack:
> `@ProdInt create user stories for dark mode support`

Agent responds in-thread with stories + Jira links. No need to open ProdInt UI.

**What it needs:**
- Slack Bolt SDK (`@slack/bolt`)
- Slack App with slash commands or @mentions
- Same agent pipeline, different input/output surface

---

## Technical Requirements Summary

| Feature | Key Technology |
|---|---|
| Multi-step agent | Gemini function calling / tool use |
| Bidirectional Jira | Jira REST API (GET endpoints) |
| Confluence | Atlassian Confluence REST API v2 |
| Product memory | `ProductContext` DB table |
| Triggered actions | Webhooks + BullMQ background jobs |
| Web research | Tavily API or Perplexity API |
| Meeting transcripts | Whisper API (OpenAI) or AssemblyAI |
| Slack bot | Slack Bolt SDK |
| Multi-agent pipeline | BullMQ job workers (chained queues) |

---

## Implementation Order (Recommended)

```
Phase A (now):
  └── Bidirectional Jira reading
  └── Full end-to-end feature creation (tool calling)

Phase B (next):
  └── Product memory / context store
  └── Confluence integration
  └── AC validator

Phase C (growth):
  └── Triggered/reactive webhooks
  └── Multi-agent pipeline with BullMQ
  └── Web research agent

Phase D (scale):
  └── Meeting → tickets pipeline
  └── Slack/Teams interface
```

---

## Current Agentic Status (as of Feb 2026)

| Feature | Status |
|---|---|
| PRD generation (chat) | ✅ Live |
| User story generation (chat) | ✅ Live |
| RCA generation (chat) | ✅ Live |
| Jira ticket creation (push-to-Jira) | ✅ Live |
| Jira connection management | ✅ Live |
| Bidirectional Jira reading | ❌ Not built |
| Confluence integration | ❌ Not built |
| Product memory | ❌ Not built |
| Multi-step autonomous execution | ❌ Not built |
| Tool calling / function use | ❌ Not built |
| Triggered/webhook actions | ❌ Not built |
| Slack interface | ❌ Not built |
