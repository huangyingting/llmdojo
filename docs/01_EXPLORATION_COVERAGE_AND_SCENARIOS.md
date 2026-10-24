# 01 — Exploration Coverage, Scenarios & Observed Behavior (`https://llmdojo.dev/`)

## 1. Executive Summary

Using Playwright with authenticated session cookies from `.cred` (`powlowskijoshuah@gmail.com` / `Joshuah Powlowski`), we systematically explored `https://llmdojo.dev/` across desktop (`1440×900`), tablet (`768×1024`), and mobile (`390×844`) viewports, in both dark and light themes, and under both authenticated and unauthenticated states.

We captured:
- **35 high-resolution Playwright screenshots** in `/screenshots/` (`01-home-desktop.png` through `35-report-mistake-popover.png`).
- **753 sitemap URLs** (`411` canonical SSR routes + `342` interview question deep-link redirects).
- **997 search index entries** (`/search-index.json`): `7` Modules, `41` Lessons, `296` Topics, `78` Sections, `492` Interview Questions, and `83` Glossary Terms.
- **100% of curriculum content, interactive lab configurations, benchmark datasets, interview questions, company guides, and glossary terms**.

---

## 2. Route & Content Inventory

| Route Pattern | Count | Auth Behavior | Description |
|---|---:|---|---|
| `/` | 1 | Public (personalized `ContinueCard` when signed in) | Landing page with hero, interactive `TokenizerLab` ("Try a control right here"), 7-module overview, feature cards, and CTA |
| `/curriculum` | 1 | Public (progress rings/bars synced) | Full 7-module, 41-lesson, 296-topic syllabus with per-module and per-lesson completion tracking |
| `/[moduleSlug]` | 7 | Public | Module overview with module badge, description, total lessons/topics/minutes, progress bar, and numbered lesson list |
| `/[moduleSlug]/[lessonSlug]` | 41 | Lesson 1 of Module 1 free; remaining lessons show `LockBadge` / `SignInBanner` if unauthenticated | Lesson overview with learning objectives, numbered topic cards (`TopicVisitedDot`), and `LessonReview` spaced-repetition card |
| `/[moduleSlug]/[lessonSlug]/[topicSlug]` | 296 | Topic body gated by `SignInPrompt` when unauthenticated (except Module 1 Lesson 1); full interactive content when authenticated | Topic learning page with collapsible left `Rail`, right `On this page` TOC, prose, code blocks, interactive labs, `Diagram`, `Predict`, `QuickCheck`, `TopicFeedback`, and `ArrowKeys` prev/next navigation |
| `/playground` | 1 | Public | Browser-based interactive Neural Network Playground (`NetLab`) with live canvas decision boundary, training loop, feature toggles, and loss curve |
| `/interview` | 1 | First 2 questions per topic unlocked; remaining gated for unauthenticated users; all 492 unlocked when authenticated | 492 AI engineering interview questions filterable by search, level (`junior`/`mid`/`senior`), and 47 topics across 8 sections |
| `/interview/companies` | 1 | Public | 58 company interview guides categorized into AI Labs (4), Big Tech (39), and AI Startups (15) with search and category tabs |
| `/interview/companies/[slug]` | 58 | First 2 questions unlocked; remaining unlocked when authenticated | Company-specific interview loop breakdown, what they test, preparation tips, candidate-reported questions (262 total), and matched bank questions |
| `/interview/q/[slug]` | 342 | Redirects (`307`) to `/interview?q=[slug]#[slug]` | Shareable per-question deep links |
| `/glossary` | 1 | Public | 83 AI engineering terms grouped A–W with instant search, letter jump pills, definitions, and "Where this is taught" deep links |
| `/progress` & `/progress#review` | 1 | Public (local browser storage + cloud sync when authenticated) | `ProgressDashboard` (topics read, lessons finished, quick checks answered, due for review, per-module breakdown) and `ReviewSession` (Leitner 4-box spaced repetition) |
| `/account` | 1 | Redirects to `/sign-in?next=/account` when unauthenticated | User profile card, learning statistics, theme selector (`Light`/`Dark`/`System`), JSON export (`Download my progress`), and `Reset progress…` |
| `/sign-in` | 1 | Public | Authentication screen; extended in our production replica with invite-only registration (`/register`, `/invite/[token]`) and admin governance (`/admin`) |

---

## 3. Curriculum Structure (7 Modules, 41 Lessons, 296 Topics)

| # | Module Slug | Title | Lessons | Topics | Est. Time |
|---:|---|---|---:|---:|---:|
| 01 | `model-foundations` | Model Foundations | 7 | 54 | 158 min |
| 02 | `inference-optimization` | Inference and Model Optimization | 6 | 42 | 145 min |
| 03 | `prompt-context-engineering` | Prompt and Context Engineering | 6 | 43 | 122 min |
| 04 | `evaluation-experimentation` | Evaluation and Experimentation | 5 | 40 | 118 min |
| 05 | `retrieval-knowledge-systems` | Retrieval and Knowledge Systems | 5 | 35 | 108 min |
| 06 | `agents-harness-engineering` | Agents and Harness Engineering | 6 | 42 | 136 min |
| 07 | `production-ai-systems` | Production AI Systems | 6 | 40 | 134 min |
| **Total** | | | **41** | **296** | **921 min (~15.4 hrs)** |

---

## 4. Scenarios Executed & Observed Behavior

### Scenario 1: Authenticated Learner End-to-End Topic Study & Interactive Labs
- **Steps**: Loaded `/model-foundations/text-to-tokens/why-text-needs-tokenization` and subsequent topics in Module 01–07 while authenticated.
- **Observed Behavior**:
  - `TrackVisit` automatically records the topic path (`model-foundations/text-to-tokens/why-text-needs-tokenization`) with a timestamp in `localStorage["progress:v1"]` and updates `last`.
  - `ProgressSync` syncs `progress` and `review` JSON payloads to the user's cloud state (`user_state` table).
  - Left `Rail` collapses on click (`data-closed`) and expands on hover/focus (`group/rail`), showing module topics with green checkmarks for visited topics.
  - Right sidebar displays `On this page` anchor links (`#the-core-problem`, `#quick-check`, etc.).
  - Interactive labs (`TokenizerLab`, `BpeStepper`, `EmbeddingExplorer`, `CosineLab`, `AttentionExplorer`, `SamplingPlayground`, `KvCacheLab`, `PrefillDecodeChart`, `BrowserGPT2`, `GoodputLab`, `RagLab`, `AgentLab`, `RoutingLab`, etc.) execute deterministically in the browser with real encodings (`js-tiktoken` `o200k_base`, `cl100k_base`, `r50k_base`, character, byte) and real measured benchmark datasets.
  - Keyboard Left (`←`) and Right (`→`) arrows navigate to the previous/next topic when focus is outside form inputs (`ArrowKeys` component).

### Scenario 2: QuickCheck Assessment & Leitner Spaced Repetition (`review:v1`)
- **Steps**: Answered multiple-choice `QuickCheck` questions at the bottom of topic pages, then navigated to `/progress` and `/progress#review`.
- **Observed Behavior**:
  - First-try correct answers on a new question (`box === 0`) immediately promote the question to `box: 4` (`Mastered`, `due: null`).
  - Incorrect answers place the item into `box: 1` with `due = now + 1 day` (`86,400,000 ms`).
  - Subsequent reviews in `ReviewSession` promote correct answers along intervals `[0, 1, 3, 7]` days (`box 1 -> 2 (3d) -> 3 (7d) -> 4 (Mastered)`).
  - `LessonReview` on each lesson overview page shows due and mastered counts scoped to that lesson (`topicPath.startsWith(lessonPath + "/")`).

### Scenario 3: Neural Network Playground (`/playground`)
- **Steps**: Selected `Spiral` dataset, toggled input features (`x1`, `x2`, `x1²`, `x2²`, `x1x2`, `sin(x1)`, `sin(x2)`), adjusted hidden layers/neurons (`+`/`-`), clicked `Play`, `Step`, and `Reset`.
- **Observed Behavior**:
  - Real backpropagation neural network runs in `requestAnimationFrame` batches, rendering a `180×180` heatmap canvas of the decision boundary, training/test points, hidden unit feature maps, edge weights colored by sign/magnitude (mint for positive, coral for negative), and a live SVG train/test loss curve.

### Scenario 4: Global Command Palette Search (`⌘K` / `/`)
- **Steps**: Pressed `⌘K` (and clicked header `Search` button), tested preset suggestion pills (`KV cache`, `temperature`, `BPE`, `attention head`, `hallucination`, `cosine similarity`), typed custom queries, and used `↑`/`↓`/`↵`/`Esc`.
- **Observed Behavior**:
  - Loads `/search-index.json` (997 items) lazily on idle or modal open.
  - Scores matches by prefix/word-boundary hits in `title` (`+10`/`+5`), `context` (`+3`/`+1`), exact title match (`+20`), and kind priority (`Term: 3`, `Topic: 2`, `Lesson: 2`, `Module: 1`, `Section: 0`, `Question: 0`).
  - Displays up to 12 top results with color-coded kind badges (`Term`, `Lesson`, `Topic`, `Question`, `Module`, `Section`).

### Scenario 5: Interview Question Bank & Company Guides (`/interview`, `/interview/companies/[slug]`)
- **Steps**: Filtered 492 questions by level (`Junior`, `Mid`, `Senior`), searched for `KV cache`, expanded answers (`InterviewReveal`), switched to `/interview/companies`, filtered by `AI Labs`, and opened `/interview/companies/openai` and `/interview/companies/anthropic`.
- **Observed Behavior**:
  - Questions support `Show all answers` / `Hide all answers` bulk toggle as well as individual `<details>` expansion.
  - Company pages show structured interview loop stages (e.g. Coding, ML System Design, Research/Debugging, Culture), what the company specifically tests, preparation tips, candidate-reported questions with source badges, and mapped questions from the 492-question bank.

### Scenario 6: Responsive Viewports, Theme Switching & Edge Cases
- **Steps**: Tested `1440×900` (desktop), `768×1024` (tablet), and `390×844` (mobile); toggled dark/light theme; tested unauthenticated topic locks; tested `/non-existent-route-404`; tested `TopicFeedback` ("Report a mistake or suggest a fix").
- **Observed Behavior**:
  - On mobile/tablet (`< 1024px`), a sticky `BottomNav` appears with 5 tabs (`Learn`, `Practice`, `Interview`, `Progress`, `Menu`), where `Menu` opens a slide-in `<dialog class="drawer">` containing search, theme toggle, secondary links (`Playground`, `Glossary`, `Account`), and the current module's topic tree.
  - Theme toggle uses View Transitions API radial clip-path animation and persists `localStorage["theme"]` (`light` / `dark` / `system`).
  - Unauthenticated access to locked topics renders `SignInBanner` and `SignInPrompt` with `?next=<currentPath>` redirect preservation.
  - Non-existent routes render a clean 404 card (`404 — This page doesn't exist`) with links to `/` and `/curriculum`.

---

## 5. Screenshot Gallery Index (`/screenshots/`)

| File | Viewport | Theme | Route / State |
|---|---|---|---|
| `01-home-desktop.png` | 1440×900 | Dark | `/` Home landing page & interactive TokenizerLab |
| `02-curriculum-desktop.png` | 1440×900 | Dark | `/curriculum` All 7 modules & 41 lessons |
| `03-playground-desktop.png` | 1440×900 | Dark | `/playground` Neural Network Playground |
| `04-interview-desktop.png` | 1440×900 | Dark | `/interview` 492 Interview Questions hub |
| `05-interview-companies-desktop.png` | 1440×900 | Dark | `/interview/companies` 58 Company Guides |
| `06-glossary-desktop.png` | 1440×900 | Dark | `/glossary` 83 AI Engineering Glossary terms |
| `07-progress-desktop.png` | 1440×900 | Dark | `/progress` Progress Dashboard & Review Session |
| `08-account-desktop.png` | 1440×900 | Dark | `/account` Authenticated profile, stats & data export |
| `09-module-model-foundations.png` | 1440×900 | Dark | `/model-foundations` Module 01 overview |
| `10-lesson-text-to-tokens.png` | 1440×900 | Dark | `/model-foundations/text-to-tokens` Lesson 01 overview |
| `11-topic-why-text-needs-tokenization.png` | 1440×900 | Dark | Topic page with left Rail, Diagram, TokenizerLab & QuickCheck |
| `12-company-openai.png` | 1440×900 | Dark | `/interview/companies/openai` OpenAI interview guide |
| `13-search-modal-open.png` | 1440×900 | Dark | Global `⌘K` search dialog initial state |
| `14-search-modal-results.png` | 1440×900 | Dark | Global `⌘K` search results for `"attention"` |
| `15-home-light-mode.png` | 1440×900 | Light | `/` Home page in warm cream light theme (`#faf7f2`) |
| `16-home-tablet.png` | 768×1024 | Light | `/` Tablet responsive layout + bottom navigation |
| `17-home-mobile.png` | 390×844 | Light | `/` Mobile responsive layout + bottom navigation |
| `18-topic-mobile.png` | 390×844 | Light | Topic page mobile responsive layout |
| `19-mobile-menu-drawer.png` | 390×844 | Light | Mobile slide-over `Menu` drawer open |
| `20-module-02-inference-optimization.png` | 1440×900 | Dark | `/inference-optimization` Module 02 overview |
| `21-module-03-prompt-context-engineering.png` | 1440×900 | Dark | `/prompt-context-engineering` Module 03 overview |
| `22-module-04-evaluation-experimentation.png` | 1440×900 | Dark | `/evaluation-experimentation` Module 04 overview |
| `23-module-05-retrieval-knowledge-systems.png` | 1440×900 | Dark | `/retrieval-knowledge-systems` Module 05 overview |
| `24-module-06-agents-harness-engineering.png` | 1440×900 | Dark | `/agents-harness-engineering` Module 06 overview |
| `25-module-07-production-ai-systems.png` | 1440×900 | Dark | `/production-ai-systems` Module 07 overview |
| `26-topic-bpe-merges.png` | 1440×900 | Dark | Interactive `BpeStepper` lab |
| `27-topic-attention-weights.png` | 1440×900 | Dark | Interactive `AttentionExplorer` lab |
| `28-topic-temperature-top-p.png` | 1440×900 | Dark | Interactive `SamplingPlayground` lab |
| `29-topic-kv-cache.png` | 1440×900 | Dark | Interactive `KvCacheLab` lab |
| `30-playground-running.png` | 1440×900 | Dark | Neural Network Playground actively training on Spiral dataset |
| `31-interview-filtered-revealed.png` | 1440×900 | Dark | Interview bank filtered to Senior + KV cache with answer revealed |
| `32-progress-review-tab.png` | 1440×900 | Dark | `/progress#review` Spaced-repetition review queue |
| `33-404-not-found.png` | 1440×900 | Dark | Custom 404 error state |
| `34-unauth-locked-topic.png` | 1440×900 | Dark | Unauthenticated locked topic showing `SignInBanner` & `SignInPrompt` |
| `35-report-mistake-popover.png` | 1440×900 | Dark | Inline `TopicFeedback` mistake/suggestion form expanded |
