# LLM Dojo — AI Engineering Course, Interactive Labs & Interview Prep

A full-fidelity, production-ready web application replicating [llmdojo.dev](https://llmdojo.dev/) ("LLM Dojo: AI engineering course and interview prep"), built with **Next.js 16 (App Router)**, **React 19**, **Auth.js / NextAuth**, and **Prisma 7** (SQLite for local development and PostgreSQL for production), enhanced with **invite-only registration**, **single-use/expiring invitation codes**, **role-based access control (`USER`, `INSTRUCTOR`, `ADMIN`)**, **immediate account & session revocation**, **CLI-only initial admin bootstrap**, and **immutable audit logging**.

---

## Features & Parity Highlights

- **903 SSR/RSC Routes & Complete Curriculum**:
  - **7 Modules, 41 Lessons, 296 Topic Pages, 58 Company Guides, and 492 Standalone Interview Question Pages (`/interview/q/[slug]`)**:
    1. *Model Foundations* (`model-foundations` — 7 lessons, 54 topics)
    2. *Inference and Model Optimization* (`inference-optimization` — 6 lessons, 42 topics)
    3. *Prompt and Context Engineering* (`prompt-context-engineering` — 6 lessons, 43 topics)
    4. *Evaluation and Experimentation* (`evaluation-experimentation` — 5 lessons, 40 topics)
    5. *Retrieval and Knowledge Systems* (`retrieval-knowledge-systems` — 5 lessons, 35 topics)
    6. *Agents and Harness Engineering* (`agents-harness-engineering` — 6 lessons, 42 topics)
    7. *Production AI Systems* (`production-ai-systems` — 6 lessons, 40 topics)
- **All 103 Interactive Client Components, Labs & Simulators**:
  - Byte-Pair Encoding (`BpeDemo`), Real Tiktoken (`gpt2`, `cl100k_base`, `o200k_base`) & in-browser `transformers.js` (`TokenizerLab`), Embeddings & Cosine Similarity (`CosineDemo`, `EmbeddingSpace`, `SimilarityMatrix`), Self-Attention & Multi-Head Attention (`AttentionMatrix`, `MultiHeadView`, `PositionCompare`), Sampling (`TemperatureCompare`, `TopKPFilter`, `SampleReplay`), Context Windows & KV Cache (`KvCacheCalculator`, `PrefillDecodeSplit`, `LostInTheMiddle`), Inference & Quantization (`LatencyDistribution`, `StreamReplay`, `ThroughputVsLatency`, `GoodputLab`, `RooflinePlot`, `QuantizationCompare`, `BatchingSimulator`, `CostCalculator`, `PrefixCacheDemo`, `SemanticCacheDemo`), Prompting & Evals (`PromptDiffRunner`, `InjectionSandbox`, `SchemaValidator`, `JudgeBiasDemo`, `EvalMatrixLab`), RAG (`ChunkingLab`, `HybridRrfDemo`), and Agents (`AgentLoopSimulator`, `ToolSchemaBuilder`, `RouterFallbackSim`).
- **Scratch-Built Neural Network Playground (`/playground`)**:
  - Live HTML5 Canvas decision boundary, dataset selector (Circle, XOR, Spiral, Gaussian), feature toggles, hidden layer/neuron controls, learning rate, activation, regularization, and live training/test loss chart.
- **Interview Prep Hub (`/interview`), 58 Company Guides (`/interview/companies/[slug]`), & 492 Standalone Answer Pages (`/interview/q/[slug]`)**:
  - 492 curated AI/ML engineering interview questions filterable by difficulty (`junior`, `mid`, `senior`) and company, with self-grading (`Got it` / `Need review`) and dedicated SSR/RSC model-answer pages at `/interview/q/[slug]`.
- **83-Term Technical Glossary (`/glossary`) & Instant `⌘K` Search**:
  - 997-item instant search modal across all modules, lessons, topics, glossary terms, and interview questions.
- **Spaced-Repetition QuickCheck Review & Cross-Device State Sync (`/progress`, `/api/user/state`)**:
  - 4-box Leitner spaced repetition (1, 3, and 7 days) and topic completion tracking synced between `localStorage` and Prisma (`UserLearningState`).
- **Invite-Only Admission, RBAC, Immediate Revocation & Audit Logging (`/admin`, `/register`, `/invite/[token]`)**:
  - Single-use or bounded-multi-use invitation codes (`DOJO-XXXX-XXXX-XXXX`) with SHA-256 token hashing and expiration timestamps.
  - Roles (`USER`, `INSTRUCTOR`, `ADMIN`) with immediate session invalidation via `sessionVersion` verification on every authenticated request.
  - Zero demo user accounts and no HTTP bootstrap endpoint; the initial `ADMIN` is provisioned strictly via CLI (`npm run bootstrap:admin`).

---

## Architecture & Documentation Suite (`docs/`)

1. [`docs/01_EXPLORATION_COVERAGE_AND_SCENARIOS.md`](docs/01_EXPLORATION_COVERAGE_AND_SCENARIOS.md) — Playwright Exploration Coverage, Scenarios & Visual Evidence (`screenshots/`)
2. [`docs/02_ADR.md`](docs/02_ADR.md) — Architecture Decision Records (ADR-001 through ADR-007)
3. [`docs/03_PRD.md`](docs/03_PRD.md) — Product Requirements Document
4. [`docs/04_TECHNICAL_SPECIFICATION.md`](docs/04_TECHNICAL_SPECIFICATION.md) — Technical Specification & API Contracts
5. [`docs/05_ARCHITECTURE_AND_DATA_MODEL.md`](docs/05_ARCHITECTURE_AND_DATA_MODEL.md) — System Architecture & Dual-Database (SQLite + PostgreSQL) Data Model
6. [`docs/06_IMPLEMENTATION_PLAN_AND_BACKLOG.md`](docs/06_IMPLEMENTATION_PLAN_AND_BACKLOG.md) — Implementation Plan & Task Backlog
7. [`docs/07_ACCEPTANCE_CRITERIA.md`](docs/07_ACCEPTANCE_CRITERIA.md) — Testable Acceptance Criteria
8. [`docs/08_FEATURE_PARITY_MATRIX.md`](docs/08_FEATURE_PARITY_MATRIX.md) — Complete Feature Parity Matrix

---

## Quick Start (Local Development with SQLite)

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables
cp .env.example .env

# 3. Push or migrate the local SQLite schema
npm run db:push

# 4. Bootstrap the initial ADMIN account via CLI (no demo accounts exist by default)
npm run bootstrap:admin -- \
  --email "admin@yourdomain.com" \
  --password "YourStrongPassword123!" \
  --name "Dojo Admin"

# 5. Start the development server
npm run dev
```

Sign in at `http://localhost:3000/sign-in`, then open `http://localhost:3000/admin` to issue single-use/expiring invitation codes (`DOJO-XXXX-XXXX-XXXX`), manage roles (`USER`, `INSTRUCTOR`, `ADMIN`), revoke access, and inspect the immutable audit trail.

---

## Production Deployment (PostgreSQL & Docker)

Set `DATABASE_PROVIDER=postgresql` and `DATABASE_URL=postgresql://...` in your production environment, or launch with Docker Compose:

```bash
docker compose up --build -d
```

To bootstrap the initial administrator in production:

```bash
docker compose exec web npm run bootstrap:admin -- \
  --email "admin@yourdomain.com" \
  --password "YourProductionPassword!" \
  --name "Production Admin"
```

---

## Testing

```bash
# Run Vitest unit & integration tests
npm run test:unit

# Build production bundle and run Playwright E2E test suite
npm run build
npm run test:e2e
```
