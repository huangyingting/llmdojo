# 04 — Technical Specification

## 1. Technology Stack
- **Framework**: Next.js 16 (App Router, TypeScript, React 19)
- **Authentication**: Auth.js / NextAuth v5 (`next-auth@beta`) with JWT session strategy, Prisma user validation, and `sessionVersion` revocation checking
- **ORM & Databases**:
  - Prisma 7 (`prisma`, `@prisma/client`)
  - Local Dev / Test: SQLite via `@prisma/adapter-better-sqlite3` (`prisma/schema.prisma`)
  - Production: PostgreSQL via `@prisma/adapter-pg` (`prisma/schema.postgres.prisma`)
- **Styling & Design System**: Tailwind CSS v4 + original `llmdojo.dev` custom CSS properties (`--background`, `--surface`, `--surface-2`, `--border`, `--foreground`, `--muted`, `--accent`, `--ink-*`), View Transitions API theme toggle, and Geist Sans / Geist Mono / Newsreader typography
- **Interactive Lab Runtime**:
  - `js-tiktoken` for real BPE tokenization (`o200k_base`, `cl100k_base`, `r50k_base`)
  - Custom deterministic simulation & plotting engines for all 57 interactive curriculum labs and the browser Neural Network Playground (`NetLab`)
- **Testing**: Vitest (unit & integration tests) + Playwright (end-to-end browser verification across desktop/mobile, auth/invite flows, curriculum labs, playground, interview prep, glossary, and admin console)

---

## 2. Application Routes

### 2.1 Public & Learner Routes
| Path | Rendering | Access | Description |
|---|---|---|---|
| `/` | SSR + Client Islands | Public | Hero, `ContinueCard`, live `TokenizerLab`, 7-module grid, feature highlights |
| `/curriculum` | SSR + Client Islands | Public | Complete 7-module, 41-lesson, 296-topic syllabus with progress indicators |
| `/playground` | SSR + Client Islands | Public | Interactive browser Neural Network Playground (`NetLab`) |
| `/interview` | SSR + Client Islands | Public (2 free/topic, full when signed in) | 492 interview questions with search, difficulty, and topic filters |
| `/interview/companies` | SSR + Client Islands | Public | 58 company interview preparation guides |
| `/interview/companies/[slug]` | SSR + Client Islands | Public (2 free, full when signed in) | Company-specific interview loop, tips, candidate-reported & bank questions |
| `/interview/q/[slug]` | Server Redirect | Public | Redirects (`307`) to `/interview?q=[slug]#[slug]` |
| `/glossary` | SSR + Client Islands | Public | 83 AI engineering terms grouped A–W with instant filter |
| `/progress` | SSR + Client Islands | Public | Learning dashboard (`ProgressDashboard`) & Leitner review (`ReviewSession`) |
| `/account` | SSR + Client Islands | Authenticated | Profile summary, learning stats, theme choice, JSON export/reset, admin link (if `ADMIN`/`INSTRUCTOR`) |
| `/[module]` | SSR + Client Islands | Public | Module overview for each of the 7 modules |
| `/[module]/[lesson]` | SSR + Client Islands | Public (lock badge if gated) | Lesson overview for each of the 41 lessons |
| `/[module]/[lesson]/[topic]` | SSR + Client Islands | Module 1 Lesson 1 public; rest unlocked on sign-in | Topic learning page for each of the 296 topics |

### 2.2 Authentication, Invite & Admin Routes
| Path | Rendering | Access | Description |
|---|---|---|---|
| `/sign-in` | SSR + Client | Public | Email/password sign-in + link to invite-only registration (`/register`) |
| `/register` | SSR + Client | Public (requires invite code) | Invite-only registration form accepting invitation code, name, email, and password |
| `/invite/[token]` | SSR + Client | Public | Pre-validated invitation landing page showing invite status, role, expiry, and registration form |
| `/admin` | SSR + Client | `ADMIN` / `INSTRUCTOR` | Enterprise governance console: Invitations, Users & RBAC, Topic Feedback, and Security Audit Logs |

---

## 3. API Specification

### 3.1 `POST /api/auth/register`
Consumes a valid invitation token and creates a new user account atomically inside a Prisma transaction.
- **Request Body**:
  ```json
  {
    "inviteToken": "llmdojo_inv_...",
    "email": "engineer@example.com",
    "name": "Ada Lovelace",
    "password": "StrongPassword123!"
  }
  ```
- **Validation & Security Rules**:
  1. Hash `inviteToken` with `SHA-256` and look up `Invitation` by `tokenHash`.
  2. Reject with `400`/`403` if invitation does not exist, `status !== "PENDING"`, `revokedAt !== null`, `expiresAt <= now`, or `usedCount >= maxUses`.
  3. If `invitation.email` is set, verify case-insensitive match with `email`.
  4. Verify `email` is not already registered (`409 Conflict`).
  5. Enforce password minimum length (`>= 8` characters).
  6. Hash password with `bcryptjs` (`12` rounds), create `User` with `role = invitation.role` and `status = "ACTIVE"`, increment `invitation.usedCount`, mark `status = "ACCEPTED"` and `acceptedById = user.id` when `usedCount >= maxUses`, and write `USER_REGISTER_WITH_INVITE` + `INVITATION_ACCEPT` to `AuditLog`.

### 3.2 `GET /api/invitations/validate?token=...`
Validates an invitation token without consuming it (used by `/invite/[token]` and `/register`).
- **Response (`200 OK`)**:
  ```json
  {
    "valid": true,
    "email": "engineer@example.com",
    "role": "LEARNER",
    "expiresAt": "2025-11-01T00:00:00.000Z"
  }
  ```

### 3.3 `GET / PUT / DELETE /api/user/state`
Synchronizes learner `progress` (`visited` topics & `last` topic) and `review` (Leitner spaced-repetition map) with Prisma `UserLearningState`.
- **`GET /api/user/state`**: Returns `{ progress, review, updatedAt }` for the authenticated user.
- **`PUT /api/user/state`**: Upserts `{ progress, review }` JSON for the authenticated user.
- **`DELETE /api/user/state`**: Resets `progress` and `review` for the authenticated user and records `USER_PROGRESS_RESET` in `AuditLog`.

### 3.4 `POST /api/feedback`
Records inline topic feedback from `TopicFeedback` ("Report a mistake or suggest a fix").
- **Request Body**: `{ "topic": "model-foundations/text-to-tokens/why-text-needs-tokenization", "kind": "mistake" | "unclear" | "idea", "message": "..." }`
- **Behavior**: Stores record in `TopicFeedback` (attaching `userId` if signed in) and writes `TOPIC_FEEDBACK_SUBMIT` to `AuditLog`.

### 3.5 Admin Endpoints (`/api/admin/*`)
All admin endpoints verify an active session with `status === "ACTIVE"` and matching `sessionVersion`.
- **`GET /api/admin/invitations`** (`ADMIN`, `INSTRUCTOR`): Lists invitations with creator/acceptor info and status.
- **`POST /api/admin/invitations`** (`ADMIN`, `INSTRUCTOR`): Creates a new invitation (`email?`, `role`, `expiresInHours`, `maxUses`, `note?`). Note: `INSTRUCTOR` can only issue `LEARNER` invitations; `ADMIN` can issue any role. Returns the one-time raw `token` and `inviteUrl`. Writes `INVITATION_CREATE` to `AuditLog`.
- **`PATCH /api/admin/invitations/[id]`** (`ADMIN`, `INSTRUCTOR`): Revokes a pending invitation (`status = "REVOKED"`, `revokedAt = now`). Writes `INVITATION_REVOKE` to `AuditLog`.
- **`GET /api/admin/users`** (`ADMIN`): Lists all users with role, status, sessionVersion, learning stats, and invitation provenance.
- **`PATCH /api/admin/users/[id]`** (`ADMIN`): Updates user `role` (`LEARNER`/`INSTRUCTOR`/`ADMIN`) or `status` (`ACTIVE`/`SUSPENDED`/`REVOKED`). When revoking or suspending, increments `sessionVersion` so active JWTs are immediately invalidated. Prevents self-revocation or demoting the last active `ADMIN`. Writes `USER_ROLE_CHANGE` / `USER_REVOKE` / `USER_ACTIVATE` to `AuditLog`.
- **`GET /api/admin/audit-logs`** (`ADMIN`): Returns paginated, filterable `AuditLog` entries.

### 3.6 `GET /api/health`
Healthcheck endpoint verifying database connectivity and curriculum index availability (`200 OK`).
