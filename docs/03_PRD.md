# 03 — Product Requirements Document (PRD)

## 1. Product Vision & Overview
**LLM Dojo** (`llmdojo.dev` replica) is an interactive AI engineering workbook, curriculum, neural network playground, and technical interview preparation platform. Instead of passive video lectures, learners manipulate live controls—tokenizers, attention matrices, KV-cache memory calculators, decoding samplers, RAG chunking/hybrid retrieval pipelines, agent tool-use loops, and production routing/guardrail simulators—on every page.

In addition to 100% functional and content parity with `https://llmdojo.dev/`, this production edition adds enterprise **invite-only registration**, **single-use/expiring invitation codes**, **role-based access control (`LEARNER`, `INSTRUCTOR`, `ADMIN`)**, **user and invitation revocation**, and **immutable security audit logging**.

---

## 2. Target Personas
1. **AI Engineer / Learner (`LEARNER`)**: Software or ML engineer mastering LLM internals, inference optimization, prompting, evals, RAG, agents, and production systems, or preparing for AI engineering interviews at OpenAI, Anthropic, Google, Meta, etc.
2. **Instructor / Cohort Lead (`INSTRUCTOR`)**: Generates single-use or multi-use expiring invitation codes for cohort members and reviews topic feedback submissions.
3. **Platform Administrator (`ADMIN`)**: Bootstrapped via CLI (`npm run bootstrap:admin`); manages users, roles, invitations, revocations, topic feedback, and security audit logs via `/admin`.

---

## 3. Core Functional Requirements

### FR-1: Interactive AI Engineering Curriculum (7 Modules, 41 Lessons, 296 Topics)
- **FR-1.1**: Render all 7 modules (`model-foundations`, `inference-optimization`, `prompt-context-engineering`, `evaluation-experimentation`, `retrieval-knowledge-systems`, `agents-harness-engineering`, `production-ai-systems`), 41 lessons, and 296 topics with exact hierarchy, reading time estimates, learning objectives, and prose/code/tables.
- **FR-1.2**: Provide collapsible left-hand topic navigation (`Rail`) on desktop (`lg:`), sticky `On this page` table of contents on `xl:`, prev/next topic footer cards, and keyboard `←`/`→` navigation (`ArrowKeys`).
- **FR-1.3**: Render all 57 interactive client labs and SVG diagrams (`Diagram`, `Predict`, `QuickCheck`, `TokenizerLab`, `BpeStepper`, `EmbeddingExplorer`, `CosineLab`, `AttentionExplorer`, `AttentionMathLab`, `AttentionCost`, `SamplingPlayground`, `GenerationRuns`, `TokenReplay`, `PositionSimilarity`, `PrefillDecodeChart`, `KvCacheLab`, `BrowserGPT2`, `FactCheckLab`, `GoodputLab`, `NetLab`, `BatchStepChart`, `CostByBatch`, `PrefixCacheBill`, `DecodeEstimate`, `CapstonePlanner`, `ChatTemplateLab`, `ConstrainedSampler`, `ContextPacker`, `RegressionRunner`, `DefencePlanner`, `EvalCriteriaLab`, `RefScoringLab`, `JudgeLab`, `CompareLab`, `ErrorAnalysisLab`, `RagLab`, `TermRetrievalLab`, `HybridLab`, `ChunkingLab`, `RagEvalLab`, `BranchingTree`, `AgentLab`, `WorkflowLab`, `ContextRunLab`, `RecoveryLab`, `RetryBudget`, `AgentEvalLab`, `AutonomyLab`, `RoutingLab`, `FallbackLab`, `BudgetLab`, `IncidentLab`, `GuardrailLab`, `FineTuneLab`, `GradientLab`, `TokenPipeline`, `RunningExample`, `SearchLab`).
- **FR-1.4**: Render inline glossary term tooltips (`Term`) with dotted underlines that display definitions on hover/focus.
- **FR-1.5**: Provide inline `TopicFeedback` ("Report a mistake or suggest a fix") on every topic page (`mistake`, `unclear`, `idea` + comment), persisted to Prisma `TopicFeedback`.

### FR-2: Content Access Control & Auth Gate
- **FR-2.1**: Module 1, Lesson 1 (`model-foundations/text-to-tokens` and its 8 topics) is unlocked for anonymous visitors so they can experience the interactive workbook before signing in.
- **FR-2.2**: Remaining lessons and topics display `LockBadge` ("Free · sign in to unlock"), `LockIcon`, `SignInBanner`, and `SignInPrompt` for unauthenticated visitors, while unlocking 100% of content upon sign-in.
- **FR-2.3**: Configurable via `NEXT_PUBLIC_AUTH_GATE` (`on` by default; `off` unlocks all pages without sign-in if desired).

### FR-3: Neural Network Playground (`/playground`)
- **FR-3.1**: Interactive backpropagation neural network running in the browser across 4 synthetic 2D classification datasets (`Circle`, `XOR`, `Clusters`, `Spiral`).
- **FR-3.2**: Configurable input features ($x_1, x_2, x_1^2, x_2^2, x_1 x_2, \sin(x_1), \sin(x_2)$), 0–4 hidden layers with 1–8 neurons per layer, activation functions (`Tanh`, `ReLU`, `Sigmoid`, `Linear`), learning rates (`0.001`–`1`), regularization (`None`, `L1`, `L2`) with rate, noise, train/test ratio, and batch size.
- **FR-3.3**: Live `Play`/`Pause`, single-epoch `Step`, `Reset`, epoch counter, train/test loss curves, per-neuron feature heatmaps, and `180×180` output decision boundary canvas.

### FR-4: AI Engineering Interview Prep (`/interview` & `/interview/companies`)
- **FR-4.1**: Searchable, filterable bank of **492 interview questions** across **47 topics** and **8 sections**, tagged by difficulty (`Junior`: 78, `Mid`: 224, `Senior`: 190).
- **FR-4.2**: Individual answer reveal (`<details>`) plus bulk `Show all answers` / `Hide all answers` toggle, and deep-link redirects from `/interview/q/[slug]` (`342` slugs) to `/interview?q=[slug]#[slug]`.
- **FR-4.3**: Directory of **58 company interview guides** (`/interview/companies` and `/interview/companies/[slug]`) across `AI Labs` (4), `Big Tech` (39), and `AI Startups` (15), featuring interview loop breakdowns, evaluation criteria, preparation tips, **262 candidate-reported questions**, and matched bank questions.

### FR-5: AI Engineering Glossary (`/glossary`)
- **FR-5.1**: Searchable A–W glossary of **83 AI engineering terms**, each with a clear definition, category badge, and deep links to the exact curriculum lessons/topics where the concept is taught.

### FR-6: Learning Progress & Spaced Repetition Review (`/progress` & `/account`)
- **FR-6.1**: Track visited topics (`visited` map + `last` topic slug) and display completion percentages on `/`, `/curriculum`, `/[module]`, `/[module]/[lesson]`, `/progress`, and `/account`.
- **FR-6.2**: Leitner 4-box spaced repetition (`[0, 1, 3, 7]` days) populated automatically when learners answer `QuickCheck` questions.
- **FR-6.3**: Dedicated `ReviewSession` UI (`/progress#review`) for practicing due or upcoming quick-check flashcards, plus per-lesson `LessonReview` cards.
- **FR-6.4**: Bidirectional sync with Prisma `UserLearningState` when signed in, plus `Download my progress` (`llm-dojo-progress.json`) and `Reset progress…` on `/account`.

### FR-7: Global Command Palette Search (`⌘K` / `/`)
- **FR-7.1**: Modal `<dialog>` triggered via header `Search` button, `⌘K` / `Ctrl+K`, or `/` shortcut.
- **FR-7.2**: Searches all 997 indexed items (`Module`, `Lesson`, `Topic`, `Section`, `Question`, `Term`) with instant ranked results, suggestion chips (`KV cache`, `temperature`, `BPE`, `attention head`, `hallucination`, `cosine similarity`), and full keyboard navigation (`↑`, `↓`, `↵`, `Esc`).

### FR-8: Invite-Only Registration, RBAC, Revocation & Audit Logging
- **FR-8.1**: Invite-only account registration (`/register` and `/invite/[token]`) requiring a valid invitation token (`PENDING`, unexpired, `usedCount < maxUses`, optional email match).
- **FR-8.2**: Roles (`LEARNER`, `INSTRUCTOR`, `ADMIN`) with route and API enforcement.
- **FR-8.3**: Admin Console (`/admin`) allowing `ADMIN` (and `INSTRUCTOR` for invites) to:
  - Create single-use or multi-use expiring invitation codes with optional email binding and role assignment, copying the one-time raw invite link.
  - View and revoke active invitations (`INVITATION_REVOKE`).
  - View users, change roles (`USER_ROLE_CHANGE`), suspend/revoke users (`USER_REVOKE`, incrementing `sessionVersion`), or reactivate users (`USER_ACTIVATE`).
  - Inspect the immutable security `AuditLog` with action/actor/target filters.
  - Review learner `TopicFeedback` submissions.
- **FR-8.4**: CLI-only initial admin bootstrap (`npm run bootstrap:admin`) with zero demo user accounts and no HTTP bootstrap endpoint.
