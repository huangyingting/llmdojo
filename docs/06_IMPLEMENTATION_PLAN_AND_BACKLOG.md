# 06 — Implementation Plan & Task Backlog

## 1. Phased Implementation Plan

### Phase 1: Exploration & Documentation (Completed)
- Capture all 411 SSR routes, 997 search index items, 37 client/dataset chunks, and 35 Playwright screenshots across desktop/tablet/mobile and dark/light themes.
- Author complete documentation suite (`docs/01` through `docs/08`).

### Phase 2: Project Foundation, Dual-DB Prisma & CLI Admin Bootstrap
- Initialize Next.js 16 + React 19 + TypeScript + Tailwind v4 project in `/home/azadmin/llmdojo`.
- Configure `.gitignore` to strictly exclude `.cred`, `.env`, `*.db`, `/node_modules`, and `/.next`.
- Set up `prisma/schema.prisma` (SQLite) and `prisma/schema.postgres.prisma` (PostgreSQL), run initial migration (`prisma/migrations/`), and build `src/lib/prisma.ts`.
- Implement `scripts/bootstrap-admin.ts` (`npm run bootstrap:admin`) with zero demo user accounts and no HTTP bootstrap endpoint.

### Phase 3: Auth.js v5, Invite-Only Registration, RBAC, Revocation & Audit Logging
- Implement `src/lib/auth.ts`, `src/lib/invitations.ts`, and `src/lib/audit.ts`.
- Build `/api/auth/[...nextauth]`, `/api/auth/register`, `/api/invitations/validate`, `/api/user/state`, `/api/feedback`, `/api/health`, and `/api/admin/{invitations,users,audit-logs}`.
- Build `/sign-in`, `/register`, `/invite/[token]`, `/account`, and `/admin` UI pages matching the LLM Dojo design language.

### Phase 4: LLM Dojo Curriculum, Interactive Labs, Playground, Interview Bank & Glossary
- Extract and wire the lossless content and interactive labs for all 7 modules, 41 lessons, 296 topics, 492 interview questions, 58 company guides, 83 glossary terms, and `/search-index.json`.
- Build the global layout (`Header`, `SearchButton`, `SearchDialog`, `ThemeToggle`, `AccountButton`, `BottomNav`, `ProgressSync`, `Footer`).
- Implement all 57 interactive labs (`TokenizerLab`, `BpeStepper`, `EmbeddingExplorer`, `CosineLab`, `AttentionExplorer`, `SamplingPlayground`, `KvCacheLab`, `BrowserGPT2`, `GoodputLab`, `NetLab`, etc.), `Diagram`, `Predict`, `QuickCheck`, `TrackVisit`, `ArrowKeys`, and `TopicFeedback`.
- Build `/`, `/curriculum`, `/[module]`, `/[module]/[lesson]`, `/[module]/[lesson]/[topic]`, `/playground`, `/interview`, `/interview/companies`, `/interview/companies/[slug]`, `/interview/q/[slug]`, `/glossary`, and `/progress`.

### Phase 5: Verification, Testing & Production Readiness
- Write and run Vitest unit and integration tests for invitation lifecycle, single-use/expiration/revocation enforcement, RBAC, audit logging, Leitner spaced-repetition math, and search ranking.
- Run comprehensive Playwright E2E tests verifying every workflow across desktop and mobile viewports.
- Run production build (`npm run build`) and verify zero errors.

---

## 2. Prioritized Task Backlog

| ID | Epic | Task | Priority | Status |
|---|---|---|---|---|
| `BL-01` | Exploration | Playwright exploration across 35 screenshots & 411 routes | P0 | Done |
| `BL-02` | Documentation | Complete `docs/01`–`docs/08` engineering documentation | P0 | Done |
| `BL-03` | Database | Prisma 7 SQLite + PostgreSQL schemas, migrations, and client adapter | P0 | Pending |
| `BL-04` | Security | CLI-only admin bootstrap (`npm run bootstrap:admin`) + `.cred` gitignore protection | P0 | Pending |
| `BL-05` | Auth & Invite | Auth.js v5 Credentials + SHA-256 single-use/expiring invitation registration | P0 | Pending |
| `BL-06` | RBAC & Audit | Role enforcement (`LEARNER`/`INSTRUCTOR`/`ADMIN`), `sessionVersion` revocation & `AuditLog` | P0 | Pending |
| `BL-07` | Admin Console | `/admin` console for invitations, user role/status management, feedback & audit logs | P0 | Pending |
| `BL-08` | Shell & Search | Header, `⌘K` `SearchDialog` (997 items), `ThemeToggle` (light/dark/system), `BottomNav` | P0 | Pending |
| `BL-09` | Curriculum | All 7 modules, 41 lessons, 296 topics with `Rail`, TOC, `ArrowKeys`, and `TrackVisit` | P0 | Pending |
| `BL-10` | Interactive Labs | All 57 interactive labs, `Diagram`, `Predict`, `QuickCheck`, and `TopicFeedback` | P0 | Pending |
| `BL-11` | Playground | `/playground` browser Neural Network Playground (`NetLab`) with 4 datasets & live canvas | P0 | Pending |
| `BL-12` | Interview Prep | `/interview` (492 questions), `/interview/companies` (58 guides), `/interview/q/[slug]` | P0 | Pending |
| `BL-13` | Glossary | `/glossary` 83 AI engineering terms A–W + inline `Term` tooltips | P0 | Pending |
| `BL-14` | Progress/Review | `/progress` dashboard, Leitner 4-box `ReviewSession`, and `/api/user/state` cloud sync | P0 | Pending |
| `BL-15` | QA & E2E | Vitest unit/integration suite + Playwright E2E test suite + production build | P0 | Pending |
