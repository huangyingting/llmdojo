# 08 — Feature Parity Matrix (`llmdojo.dev` vs. Local Production Replica)

| Feature Category | Feature / Capability | `llmdojo.dev` (Original) | Local Replica (`/home/azadmin/llmdojo`) | Parity Status |
|---|---|---|---|---|
| **Curriculum** | 7 Modules (`model-foundations` through `production-ai-systems`) | 7 Modules | 7 Modules | 100% Parity |
| **Curriculum** | 41 Lessons with reading times & objectives | 41 Lessons | 41 Lessons | 100% Parity |
| **Curriculum** | 296 Topics with prose, code, tables, and callouts | 296 Topics | 296 Topics | 100% Parity |
| **Curriculum** | Collapsible Left `Rail` + Right `On this page` TOC | Yes | Yes | 100% Parity |
| **Curriculum** | Keyboard `←` / `→` topic navigation (`ArrowKeys`) | Yes | Yes | 100% Parity |
| **Interactive Labs** | `TokenizerLab` (real `js-tiktoken` `o200k_base`, `cl100k_base`, `r50k_base`, chars, bytes) | Yes | Yes | 100% Parity |
| **Interactive Labs** | `BpeStepper`, `EmbeddingExplorer`, `CosineLab`, `AttentionExplorer`, `AttentionMathLab`, `AttentionCost` | Yes | Yes | 100% Parity |
| **Interactive Labs** | `SamplingPlayground`, `GenerationRuns`, `TokenReplay`, `PositionSimilarity`, `BrowserGPT2`, `FactCheckLab` | Yes | Yes | 100% Parity |
| **Interactive Labs** | `PrefillDecodeChart`, `KvCacheLab`, `GoodputLab`, `BatchStepChart`, `CostByBatch`, `PrefixCacheBill`, `DecodeEstimate`, `CapstonePlanner` | Yes | Yes | 100% Parity |
| **Interactive Labs** | `ChatTemplateLab`, `ConstrainedSampler`, `ContextPacker`, `RegressionRunner`, `DefencePlanner` | Yes | Yes | 100% Parity |
| **Interactive Labs** | `EvalCriteriaLab`, `RefScoringLab`, `JudgeLab`, `CompareLab`, `ErrorAnalysisLab` | Yes | Yes | 100% Parity |
| **Interactive Labs** | `RagLab`, `TermRetrievalLab`, `HybridLab`, `ChunkingLab`, `RagEvalLab` | Yes | Yes | 100% Parity |
| **Interactive Labs** | `BranchingTree`, `AgentLab`, `WorkflowLab`, `ContextRunLab`, `RecoveryLab`, `RetryBudget`, `AgentEvalLab`, `AutonomyLab` | Yes | Yes | 100% Parity |
| **Interactive Labs** | `RoutingLab`, `FallbackLab`, `BudgetLab`, `IncidentLab`, `GuardrailLab`, `FineTuneLab`, `GradientLab`, `TokenPipeline`, `RunningExample`, `SearchLab` | Yes | Yes | 100% Parity |
| **Interactive Labs** | `Diagram` (54 custom SVG diagrams), `Predict` (think-first reveal), `QuickCheck` (multiple choice) | Yes | Yes | 100% Parity |
| **Playground** | `/playground` Browser Neural Network Playground (`NetLab`) with Circle/XOR/Clusters/Spiral & live canvas | Yes | Yes | 100% Parity |
| **Interview Prep** | `/interview` 492 questions across 47 topics & 8 sections (`Junior`/`Mid`/`Senior` + search + reveal all) | 492 Questions | 492 Questions | 100% Parity |
| **Interview Prep** | `/interview/companies` & `/interview/companies/[slug]` (58 companies + 262 candidate-reported questions) | 58 Companies | 58 Companies | 100% Parity |
| **Interview Prep** | `/interview/q/[slug]` (492 standalone SSR/RSC question & model-answer pages + fuzzy slug resolver) | 492 Pages | 492 Pages | 100% Parity |
| **Glossary** | `/glossary` 83 AI terms A–W + "Where this is taught" links + inline `Term` tooltips | 83 Terms | 83 Terms | 100% Parity |
| **Search** | Global `⌘K` / `/` Command Palette searching 997 items (`/search-index.json`) | 997 Items | 997 Items | 100% Parity |
| **Progress & Review** | `progress:v1` + `review:v1` Leitner 4-box spaced repetition (`[0, 1, 3, 7]` days) + JSON export/reset | Yes | Yes | 100% Parity |
| **Theme & Responsive** | Dark (`#0a0a0b`) & Light (`#faf7f2`) themes with View Transitions API + Mobile `BottomNav` & `Menu` drawer | Yes | Yes | 100% Parity |
| **Feedback** | Inline `TopicFeedback` ("Report a mistake or suggest a fix") | Client post | Persisted in Prisma `TopicFeedback` + Admin review | Enhanced |
| **Auth & Security** | Authentication & Persistence | Supabase Auth + `user_state` | Auth.js v5 (NextAuth) + Prisma (SQLite dev / PostgreSQL prod) | Enhanced |
| **Enterprise Governance** | Invite-Only Registration (`/register`, `/invite/[token]`) with SHA-256 single-use/expiring codes | N/A | Implemented | Enterprise Extension |
| **Enterprise Governance** | Role-Based Access Control (`LEARNER`, `INSTRUCTOR`, `ADMIN`) & `sessionVersion` Instant Revocation | N/A | Implemented | Enterprise Extension |
| **Enterprise Governance** | CLI-Only Admin Bootstrap (`npm run bootstrap:admin`), Zero Demo Accounts, Immutable `AuditLog` | N/A | Implemented | Enterprise Extension |
