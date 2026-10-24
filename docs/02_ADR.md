# 02 — Architecture Decision Records (ADR)

## ADR-001: Next.js 16 App Router with React 19 & Hybrid Server/Client Rendering
- **Status**: Accepted
- **Context**: `llmdojo.dev` is built on Next.js App Router with React Server Components (RSC) for fast, SEO-friendly curriculum/interview rendering and rich interactive client islands (`"use client"`) for its 57+ interactive AI labs, Neural Network Playground, and spaced-repetition state.
- **Decision**: Use the latest stable Next.js 16 (App Router) and React 19 with TypeScript. Curriculum pages, module/lesson overviews, glossary, and interview guides render on the server, hydrating interactive client components seamlessly.
- **Consequences**: Zero-bundle-cost static prose and tables, instant route transitions, and full compatibility with the original application's component hierarchy and CSS design tokens.

---

## ADR-002: Auth.js / NextAuth v5 with Invite-Only Admission, RBAC & Session Versioning
- **Status**: Accepted
- **Context**: While the original site uses Supabase Auth, our target architecture requires self-hosted Auth.js / NextAuth v5 backed by Prisma, invite-only registration with single-use/expiring invitation codes, role-based access control (`LEARNER`, `INSTRUCTOR`, `ADMIN`), immediate session/user revocation, audit logging, and no demo accounts.
- **Decision**:
  1. Use `next-auth` v5 (`Auth.js`) with JWT session strategy and a `Credentials` provider (`email` + `bcrypt` password hash), plus optional GitHub/Google OAuth gated by existing user account or active invitation token.
  2. Enforce invite-only admission on `/register` and `/invite/[token]`: a valid, unrevoked, unexpired (`expiresAt > now`), unconsumed (`usedCount < maxUses`) invitation code is required to create an account.
  3. Store only `tokenHash` (`SHA-256` hex) of invitation tokens in the database; return the raw token (`llmdojo_inv_<48-hex>`) only once upon creation so a database read leak cannot expose active invite links.
  4. Embed `userId`, `role`, `status`, and `sessionVersion` in the signed JWT and re-verify against Prisma when refreshing/validating sessions so revoking a user (`status = REVOKED` or incrementing `sessionVersion`) immediately invalidates active sessions.
- **Consequences**: Production-grade security, zero reliance on external SaaS auth providers, atomic single-use invitation consumption, and instant administrative revocation.

---

## ADR-003: Dual SQLite (Local Development) and PostgreSQL (Production) Prisma 7 Architecture
- **Status**: Accepted
- **Context**: Local development and automated testing require zero-dependency SQLite (`file:./dev.db`), whereas production deployments require PostgreSQL with connection pooling.
- **Decision**:
  - Maintain `prisma/schema.prisma` (configured for `sqlite` local development) and `prisma/schema.postgres.prisma` (configured for `postgresql` production) with identical models and relations.
  - Use `@prisma/adapter-better-sqlite3` when `DATABASE_URL` begins with `file:` and `@prisma/adapter-pg` when `DATABASE_URL` begins with `postgres://` or `postgresql://` inside `src/lib/prisma.ts`.
  - Provide npm scripts (`db:generate`, `db:migrate`, `db:push`, `db:seed`, `db:generate:postgres`, `db:migrate:postgres`) for both environments.
- **Consequences**: Developers and CI can run the full stack locally with SQLite out of the box, while production deployments connect directly to PostgreSQL without code changes.

---

## ADR-004: CLI-Only Admin Bootstrap (`npm run bootstrap:admin`) & Zero Demo Accounts
- **Status**: Accepted
- **Context**: Production applications must never ship hardcoded demo accounts in seed scripts or expose unauthenticated HTTP bootstrap endpoints that could be raced by an attacker on first deploy.
- **Decision**:
  - `prisma/seed.ts` seeds only curriculum metadata, glossary terms, interview questions, and company guides—never user accounts.
  - Provide `scripts/bootstrap-admin.ts` invoked via `npm run bootstrap:admin` (accepting `--email`, `--password`, `--name`, or `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` environment variables) to create or promote the initial `ADMIN` account and write a `USER_BOOTSTRAP_ADMIN` entry to `AuditLog`.
  - Do not expose any HTTP endpoint for admin bootstrapping.
- **Consequences**: Eliminates default-credential vulnerabilities and unauthenticated bootstrap race conditions in production.

---

## ADR-005: Lossless Curriculum & Interactive Lab Engine
- **Status**: Accepted
- **Context**: `llmdojo.dev` contains 411 unique SSR routes (7 modules, 41 lessons, 296 topics, 58 company guides, 492 interview questions, 83 glossary terms) and 57 specialized interactive client labs (`TokenizerLab`, `BpeStepper`, `EmbeddingExplorer`, `CosineLab`, `AttentionExplorer`, `AttentionMathLab`, `AttentionCost`, `SamplingPlayground`, `GenerationRuns`, `TokenReplay`, `PositionSimilarity`, `PrefillDecodeChart`, `KvCacheLab`, `BrowserGPT2`, `FactCheckLab`, `GoodputLab`, `NetLab`, `BatchStepChart`, `CostByBatch`, `PrefixCacheBill`, `DecodeEstimate`, `CapstonePlanner`, `ChatTemplateLab`, `ConstrainedSampler`, `ContextPacker`, `RegressionRunner`, `DefencePlanner`, `EvalCriteriaLab`, `RefScoringLab`, `JudgeLab`, `CompareLab`, `ErrorAnalysisLab`, `RagLab`, `TermRetrievalLab`, `HybridLab`, `ChunkingLab`, `RagEvalLab`, `BranchingTree`, `AgentLab`, `WorkflowLab`, `ContextRunLab`, `RecoveryLab`, `RetryBudget`, `AgentEvalLab`, `AutonomyLab`, `RoutingLab`, `FallbackLab`, `BudgetLab`, `IncidentLab`, `GuardrailLab`, `FineTuneLab`, `GradientLab`, `TokenPipeline`, `RunningExample`, `SearchLab`, `Diagram`, `Predict`, `QuickCheck`).
- **Decision**:
  - Extract the complete structured AST and metadata for all 7 modules, 41 lessons, 296 topics, 492 interview questions, 58 companies, and 83 glossary terms from our captured `.rsc.txt` Flight streams and data chunks into versioned TypeScript/JSON data modules and Prisma seed records.
  - Reconstruct the complete interactive lab suite and measured benchmark datasets (`js-tiktoken`, `@xenova/transformers` browser GPT-2 worker, neural network playground engine, RAG/Agent/Inference simulators) with 100% functional and visual fidelity.
- **Consequences**: Every single module, lesson, topic, diagram, interactive slider, quick check, interview question, company guide, and glossary term works identically to `https://llmdojo.dev/`.

---

## ADR-006: Dual LocalStorage + Prisma Cloud Sync for Progress & Leitner Spaced Repetition
- **Status**: Accepted
- **Context**: `llmdojo.dev` stores topic visit history in `localStorage["progress:v1"]` and Leitner spaced-repetition state (`box` 1–4 with `[0, 1, 3, 7]` day intervals) in `localStorage["review:v1"]`, while syncing both objects to the user's account when signed in.
- **Decision**:
  - Preserve the exact `progress:v1` and `review:v1` external store contracts (`useSyncExternalStore` with custom window events `progress-change` and `review-change`) so all UI components (`TrackVisit`, `ContinueCard`, `ModuleProgress`, `LessonProgress`, `TopicVisitedDot`, `QuickCheck`, `LessonReview`, `ProgressDashboard`, `ReviewSession`, `AccountPanel`) react instantaneously.
  - Implement `/api/user/state` (`GET`, `PUT`, `DELETE`) backed by Prisma `UserLearningState` so authenticated users automatically merge and persist their progress and review queues across devices.
- **Consequences**: Instant optimistic UI updates with reliable server-side persistence and JSON export/reset support.
