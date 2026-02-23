# Enterprise Data & Infrastructure Strategy
**ProdInt — Internal Reference Document**
*Last updated: February 2026*

---

## Current State (as of Feb 2026)

The product is running on a **flat-file JSON database** stored on the local filesystem:

```
data/
  users.json     ← user accounts, hashed passwords, profile, Gemini API key, Jira config
  chats.json     ← all chat sessions (messages, PRDs, user stories, RCA docs)
  templates.json ← PRD templates per user
```

**Known limitations of current setup:**
- No concurrency control — simultaneous writes can corrupt JSON files
- Full file loaded into memory on every read — degrades as data grows
- No transactions or rollback capability
- No search beyond full array scans (`.find()`, `.filter()`)
- Data lives on local filesystem — no backups, no replication
- Single machine — no horizontal scaling possible

---

## Target Architecture (Atlassian Scale)

### Phase 1 — Replace JSON with PostgreSQL (Do This First)
**Tech:** Prisma ORM + Neon (managed serverless Postgres)

- Drop-in replacement for the current `lib/db.ts` functions
- Keeps existing TypeScript types, just swaps the storage layer
- Neon gives branching (test DB per feature branch), serverless scaling, and a generous free tier
- Prisma gives type-safe queries, migrations, and connection pooling out of the box

**Schema design:**
- `users` table — id, email, password_hash, name, company, designation, gemini_api_key, jira_config (jsonb), created_at
- `organizations` table — for future multi-tenancy
- `chats` table — id, user_id, org_id, type (prd/jira/rca), title, template_id, created_at, updated_at
- `messages` table — id, chat_id, role, content, attachments (jsonb), timestamp
- `templates` table — id, user_id, name, content, is_default, created_at

**Why Postgres over alternatives:**
- MongoDB: Data is relational (users → orgs → chats → messages). Document DB creates application-layer joins — worst of both worlds at scale.
- DynamoDB: Rigid query patterns. B2B products have unpredictable query needs (reports, billing, analytics). Postgres gives flexibility.
- Atlassian, GitHub, Shopify, Linear, Notion all run on Postgres.

**Estimated effort:** 1–2 days to migrate fully.

---

### Phase 2 — Auth: Replace JSON sessions with WorkOS
**Tech:** WorkOS

Do not use NextAuth, Clerk, or Auth.js for a B2B enterprise product. Enterprise customers will demand:
- **SAML SSO** — Okta, Azure AD, Google Workspace integration
- **SCIM provisioning** — auto-create/deprovision users from their corporate IdP
- **Audit logs** — per-org, who did what and when (SOC2 requirement)

WorkOS is purpose-built for this. Used by Linear, Vercel, Retool, Descript.

Current auth implementation (`lib/auth.ts`) uses a simple cookie session. This needs to be replaced with WorkOS sessions before any enterprise pilot.

**Estimated effort:** 3–5 days.

---

### Phase 3 — Multi-Tenancy
**Pattern:** Schema-per-tenant in Postgres

Three patterns exist:

| Pattern | Isolation | Complexity | Recommended for |
|---|---|---|---|
| Row-level (`WHERE org_id = X`) | Low — data leakage risk | Low | Early MVP only |
| **Schema-per-tenant** ✅ | High — each org's data is isolated | Medium | Launch → 10k orgs |
| DB-per-tenant | Highest — full isolation | High | Enterprise/regulated customers |

**Implementation:**
- Each org gets its own Postgres schema: `org_<id>.users`, `org_<id>.chats`, etc.
- Middleware resolves the tenant from subdomain or JWT claim and sets the Postgres `search_path`
- Allows data isolation without the operational overhead of separate databases
- Move to DB-per-tenant only for enterprise contracts that require it (HIPAA, FedRAMP)

**What this enables:**
- `acme.prodint.com` → `org_acme` schema
- `stripe.prodint.com` → `org_stripe` schema
- Org admins can manage their users via SCIM
- Each org's data is cryptographically isolated

**Estimated effort:** 1–2 weeks.

---

### Phase 4 — Caching & Sessions: Redis
**Tech:** Upstash Redis (serverless, zero ops)

Use cases:
- **Session storage** — replace cookie-based sessions with Redis-backed sessions
- **API rate limiting** — per org, per user, per AI call type
- **Gemini response caching** — same prompt + same template → cache result to reduce AI costs
- **Real-time features** — pub/sub for future collaborative PRD editing
- **Job queues** — see Phase 5

**Estimated effort:** 2–3 days.

---

### Phase 5 — Background Jobs: BullMQ
**Tech:** BullMQ + Redis (same Redis instance as Phase 4)

At enterprise scale, AI generation cannot be synchronous in API routes. When 10,000 orgs are concurrently generating PRDs, user stories, and pushing to Jira:

- **PRD generation jobs** → queued, processed by workers
- **Jira ticket batch creation** → async with status polling
- **Email notifications** (PRD ready, RCA shared, etc.)
- **Usage metering** → async write to ClickHouse for billing

Pattern: User triggers generation → API returns job ID immediately → frontend polls job status → worker processes and stores result → frontend fetches completed document.

**Estimated effort:** 1 week.

---

### Phase 6 — Analytics: ClickHouse
**Tech:** ClickHouse Cloud (or ClickHouse on AWS)

Do NOT put analytics in Postgres. Separate OLAP (analytics) from OLTP (transactions) on day one.

Use cases:
- Track every AI call, token used, latency
- User engagement: PRDs created, user stories generated, Jira tickets pushed
- Power admin dashboard and customer-facing usage pages
- Drive billing (usage-based pricing per seat/AI call)
- Identify power users and at-risk accounts (churn prevention)

ClickHouse is what Cloudflare and Atlassian use for event data — handles billions of rows with sub-second query times.

**Estimated effort:** 1 week to instrument + build initial dashboard.

---

### Phase 7 — Full-Text Search
**Phase 7a:** Postgres FTS (`tsvector`, `tsquery`) — handles millions of PRDs/chats, free, already in Postgres.

**Phase 7b:** Elasticsearch / OpenSearch — migrate when search latency becomes noticeable at 50M+ documents. Supports semantic search, faceting, relevance ranking.

---

## Infrastructure (Target)

```
User Request
     │
     ▼
Cloudflare (CDN + WAF + DDoS protection)
     │
     ▼
AWS Application Load Balancer
     │
     ▼
Next.js App on ECS Fargate (auto-scaling, containerized)
     │
     ├──► Aurora PostgreSQL (Multi-AZ, read replicas per region)
     ├──► ElastiCache Redis (sessions, queues, cache)
     ├──► S3 (DOCX file storage, PRD attachments)
     ├──► ClickHouse Cloud (analytics events)
     └──► SQS / BullMQ Workers (async AI jobs)
```

**For early stage:** Vercel + Neon + Upstash Redis gets 80% of this with zero DevOps overhead. Migrate to AWS when you have the engineering team to run it (typically Series A).

---

## Migration Roadmap (Phased)

| Phase | What | Tech | Effort | Priority |
|---|---|---|---|---|
| 1 | JSON → Relational DB | Prisma + Neon (Postgres) | 1–2 days | 🔴 Do now |
| 2 | Session auth → Enterprise SSO | WorkOS | 3–5 days | 🔴 Before first enterprise pilot |
| 3 | Add multi-tenancy | Postgres schema-per-tenant | 1–2 weeks | 🟡 Before public launch |
| 4 | Caching + rate limiting | Upstash Redis | 2–3 days | 🟡 Before launch |
| 5 | Async AI jobs | BullMQ + Redis | 1 week | 🟡 Before launch |
| 6 | Usage analytics + billing | ClickHouse | 1 week | 🟠 Post-launch |
| 7a | Search | Postgres FTS | 1 day | 🟠 Post-launch |
| 7b | Advanced search | Elasticsearch | 2 weeks | 🟢 At scale |

---

## Key Decisions Already Made

- **Framework:** Next.js (App Router) — good choice, supports both SSR and API routes in one codebase
- **AI:** Google Gemini via `@google/generative-ai` — can swap models without changing interface
- **Integrations:** Jira (Atlassian API) — more to come (Confluence, Linear, Notion, Slack)
- **Document generation:** DOCX via `docx` npm package — keep this, it's solid
- **Language:** TypeScript throughout — non-negotiable for enterprise codebase maintainability

---

## Notes on AI Cost Management at Scale

At 1M users generating PRDs and user stories:
- Cache identical or near-identical prompts (Redis, 24hr TTL)
- Set hard token limits per org tier (free: 2k tokens/call, pro: 8k, enterprise: 32k)
- Use cheaper/faster Gemini Flash for follow-up conversations, reserve Pro for initial generation
- Implement usage dashboards so customers can see their AI consumption (reduces support tickets)
- Bill per seat + AI credits model (like Atlassian Intelligence)

---

*This document is gitignored and for internal planning only. Do not commit to any branch.*
