# 07 — Acceptance Criteria

## AC-1: Curriculum & Topic Fidelity (7 Modules, 41 Lessons, 296 Topics)
- **Given** a learner visits `/curriculum` or any of the 7 module routes (`/model-foundations`, `/inference-optimization`, `/prompt-context-engineering`, `/evaluation-experimentation`, `/retrieval-knowledge-systems`, `/agents-harness-engineering`, `/production-ai-systems`),
- **When** the page renders,
- **Then** all 7 modules, 41 lessons, and 296 topics are listed with accurate lesson numbers, topic counts, minute estimates, and reactive completion indicators.
- **And** navigating to any of the 296 `/[module]/[lesson]/[topic]` routes renders the complete topic prose, diagrams, interactive labs, inline glossary tooltips, `QuickCheck` questions, `On this page` TOC, collapsible left `Rail`, prev/next topic cards, and `TopicFeedback` widget.

## AC-2: Interactive Labs & Neural Network Playground
- **Given** a user visits `/` or `/model-foundations/text-to-tokens/why-text-needs-tokenization`,
- **When** they type into `TokenizerLab` or switch encodings (`o200k_base`, `cl100k_base`, `r50k_base`, `Characters`, `UTF-8 bytes`),
- **Then** token chips, token IDs, token counts, and characters-per-token metrics update live.
- **Given** a user visits `/playground`,
- **When** they select a dataset (`Circle`, `XOR`, `Clusters`, `Spiral`), toggle features, adjust hidden layers/neurons, and click `Play` or `Step`,
- **Then** the neural network trains in real time, updating the epoch counter, train/test loss values, loss sparkline, hidden neuron canvases, and decision boundary canvas.

## AC-3: Interview Question Bank & Company Guides
- **Given** a user visits `/interview`,
- **When** they filter by level (`Junior`, `Mid`, `Senior`), topic, or search query,
- **Then** matching questions from the 492-question bank are shown, and clicking a question or `Show all answers` reveals the detailed engineering answer.
- **Given** a user visits `/interview/companies` and `/interview/companies/[slug]` (for all 58 companies),
- **Then** the company guide displays the interview stages, what they test, preparation tips, candidate-reported questions, and matched bank questions.
- **Given** a user requests `/interview/q/[slug]`,
- **Then** the application responds with a `307` redirect to `/interview?q=[slug]#[slug]`.

## AC-4: Glossary & Global `⌘K` Search
- **Given** a user visits `/glossary`,
- **When** they search or click an A–W letter pill,
- **Then** the 83 glossary terms filter immediately and include working "Where this is taught" links.
- **Given** a user presses `⌘K` (or clicks `Search` in the header),
- **When** they type a query or click a suggestion pill,
- **Then** ranked results across all 997 search index items appear and can be navigated with `↑`/`↓`/`↵`/`Esc`.

## AC-5: Progress Tracking & Leitner Spaced Repetition
- **Given** a learner visits topics and answers `QuickCheck` questions,
- **When** they visit `/progress`, `/progress#review`, or `/account`,
- **Then** visited topic counts, per-module completion bars, quick-check counts, due review counts, and mastered counts reflect their activity, persisted to both `localStorage` and `/api/user/state` (when signed in).

## AC-6: Invite-Only Registration, RBAC, Revocation, CLI Bootstrap & Audit Logging
- **Given** a fresh database,
- **Then** there are **zero demo user accounts** in the database and **no HTTP bootstrap endpoint** exists.
- **When** the operator runs `npm run bootstrap:admin -- --email admin@example.com --password ... --name "Admin"`,
- **Then** the initial `ADMIN` user is created and a `USER_BOOTSTRAP_ADMIN` audit log entry is recorded.
- **When** an uninvited visitor attempts to register at `/register` without a valid token (or with an expired, revoked, or already-consumed single-use token),
- **Then** registration is rejected with a clear error message.
- **When** an `ADMIN` or `INSTRUCTOR` creates an invitation in `/admin` and a new user registers via `/invite/[token]` or `/register`,
- **Then** the user account is created with the invited role, `usedCount` increments (`status = ACCEPTED` when `usedCount === maxUses`), and `USER_REGISTER_WITH_INVITE` + `INVITATION_ACCEPT` are logged in `AuditLog`.
- **When** an `ADMIN` revokes a user in `/admin`,
- **Then** `user.status` becomes `REVOKED`, `user.sessionVersion` increments, `USER_REVOKE` is logged in `AuditLog`, and any existing session for that user is immediately invalidated.
