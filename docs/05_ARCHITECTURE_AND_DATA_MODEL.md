# 05 — Architecture & Data Model

## 1. System Architecture

```
+-----------------------------------------------------------------------------------+
|                                Browser Client                                     |
|                                                                                   |
|  +-----------------------+  +------------------------+  +----------------------+  |
|  |  Curriculum & Topic   |  |  57 Interactive Labs   |  |  Progress & Review   |  |
|  |  Reader (Rail, TOC,   |  |  (TokenizerLab, BPE,   |  |  External Stores     |  |
|  |  Term Tooltips,       |  |   Attention, KV Cache, |  |  (progress:v1,       |  |
|  |  ArrowKeys, Search)   |  |   NetLab Playground)   |  |   review:v1 Leitner) |  |
|  +-----------+-----------+  +------------+-----------+  +----------+-----------+  |
|              |                           |                         |              |
+--------------+---------------------------+-------------------------+--------------+
               | RSC / HTML                | Measured Datasets       | REST / JSON
               v                           v                         v
+-----------------------------------------------------------------------------------+
|                        Next.js 16 App Router Server                               |
|                                                                                   |
|  +-----------------------+  +------------------------+  +----------------------+  |
|  |  Course / Interview / |  |  Auth.js v5 (NextAuth) |  |  API Route Handlers  |  |
|  |  Glossary Server      |  |  JWT + SessionVersion  |  |  /api/auth/register  |  |
|  |  Render Engine        |  |  RBAC Middleware       |  |  /api/user/state     |  |
|  |  (411 SSR Routes)     |  |  (LEARNER/INSTRUCTOR/  |  |  /api/feedback       |  |
|  |                       |  |   ADMIN)               |  |  /api/admin/*        |  |
|  +-----------+-----------+  +------------+-----------+  +----------+-----------+  |
|              |                           |                         |              |
+--------------+---------------------------+-------------------------+--------------+
                                           |
                                           v
+-----------------------------------------------------------------------------------+
|                    Prisma 7 ORM Dual-Database Persistence Layer                   |
|        Local Dev / Test: SQLite (@prisma/adapter-better-sqlite3)                  |
|        Production:       PostgreSQL (@prisma/adapter-pg)                          |
|                                                                                   |
|  [User]  [Invitation]  [UserLearningState]  [TopicFeedback]  [AuditLog]           |
+-----------------------------------------------------------------------------------+
```

---

## 2. Prisma Data Model (`prisma/schema.prisma` & `prisma/schema.postgres.prisma`)

### 2.1 Core Models

1. **`User`**
   - `id` (`String @id @default(cuid())`)
   - `email` (`String @unique`)
   - `name` (`String?`)
   - `passwordHash` (`String`)
   - `avatarUrl` (`String?`)
   - `role` (`String @default("LEARNER")`) — `"LEARNER" | "INSTRUCTOR" | "ADMIN"`
   - `status` (`String @default("ACTIVE")`) — `"ACTIVE" | "SUSPENDED" | "REVOKED"`
   - `sessionVersion` (`Int @default(1)`) — Incremented on revocation/suspension to invalidate active JWTs immediately
   - `lastLoginAt` (`DateTime?`)
   - `revokedAt` (`DateTime?`)
   - `revokedReason` (`String?`)
   - `createdAt` (`DateTime @default(now())`)
   - `updatedAt` (`DateTime @updatedAt`)
   - Relations: `learningState` (`UserLearningState?`), `createdInvites` (`Invitation[]`), `acceptedInvites` (`Invitation[]`), `auditLogsActed` (`AuditLog[]`), `auditLogsTargeted` (`AuditLog[]`), `feedbacks` (`TopicFeedback[]`)

2. **`Invitation`**
   - `id` (`String @id @default(cuid())`)
   - `codePrefix` (`String`) — First 12 chars of token for safe display in Admin UI
   - `tokenHash` (`String @unique`) — SHA-256 hex digest of raw token
   - `email` (`String?`) — Optional restricted recipient email
   - `role` (`String @default("LEARNER")`) — Role granted upon acceptance
   - `status` (`String @default("PENDING")`) — `"PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED"`
   - `maxUses` (`Int @default(1)`)
   - `usedCount` (`Int @default(0)`)
   - `note` (`String?`)
   - `expiresAt` (`DateTime`)
   - `acceptedAt` (`DateTime?`)
   - `revokedAt` (`DateTime?`)
   - `createdById` (`String`)
   - `acceptedById` (`String?`)
   - `createdAt` (`DateTime @default(now())`)
   - `updatedAt` (`DateTime @updatedAt`)

3. **`UserLearningState`**
   - `id` (`String @id @default(cuid())`)
   - `userId` (`String @unique`)
   - `progressJson` (`String @default("{\"visited\":{},\"last\":null}")`) — JSON representation of `progress:v1`
   - `reviewJson` (`String @default("{}")`) — JSON representation of `review:v1` Leitner spaced-repetition items
   - `updatedAt` (`DateTime @updatedAt`)

4. **`TopicFeedback`**
   - `id` (`String @id @default(cuid())`)
   - `topicPath` (`String`)
   - `kind` (`String`) — `"mistake" | "unclear" | "idea"`
   - `message` (`String`)
   - `status` (`String @default("OPEN")`) — `"OPEN" | "RESOLVED"`
   - `userId` (`String?`)
   - `createdAt` (`DateTime @default(now())`)

5. **`AuditLog`**
   - `id` (`String @id @default(cuid())`)
   - `action` (`String`) — e.g., `USER_BOOTSTRAP_ADMIN`, `INVITATION_CREATE`, `INVITATION_REVOKE`, `INVITATION_ACCEPT`, `USER_REGISTER_WITH_INVITE`, `USER_LOGIN_SUCCESS`, `USER_LOGIN_FAILED`, `USER_ROLE_CHANGE`, `USER_REVOKE`, `USER_ACTIVATE`, `USER_PROGRESS_RESET`, `TOPIC_FEEDBACK_SUBMIT`
   - `actorId` (`String?`)
   - `targetUserId` (`String?`)
   - `invitationId` (`String?`)
   - `entityType` (`String`)
   - `entityId` (`String?`)
   - `ipAddress` (`String?`)
   - `userAgent` (`String?`)
   - `metadataJson` (`String?`)
   - `createdAt` (`DateTime @default(now())`)

---

## 3. State Synchronization Protocol (`ProgressSync`)

1. **Client Store Layer**:
   - `progress:v1` in `localStorage` holds `{ visited: Record<topicPath, timestampMs>, last: string | null }`.
   - `review:v1` in `localStorage` holds `Record<`${topicPath}::${question}`, ReviewItem>` where `ReviewItem` has `{ topicPath, question, firstTry, at, box: 0|1|2|3|4, due: number | null, explanation?: string, moduleTitle?: string, lessonTitle?: string, topicTitle?: string }`.
2. **Cloud Merge on Sign-In (`ProgressSync`)**:
   - On session mount, `ProgressSync` calls `GET /api/user/state`.
   - Merges remote `visited` timestamps with local `visited` timestamps (`Math.min(localTs, remoteTs)` so earliest visit is preserved) and merges `review` items (`remoteItem.at > localItem.at ? remoteItem : localItem`).
   - Subscribes to `progress-change` and `review-change` events, debouncing `PUT /api/user/state` by `400ms` so every topic visit and quick-check answer persists to Prisma automatically.
