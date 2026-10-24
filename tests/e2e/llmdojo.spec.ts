import { test, expect } from "@playwright/test";
import { execSync } from "node:child_process";
import { prisma } from "../../src/lib/prisma";

const ADMIN_EMAIL = "admin@llmdojo.local";
const ADMIN_PASS = "StrongAdminPass2026!";

test.describe.serial("LLM Dojo Full E2E Parity & Governance Suite", () => {
  test.beforeAll(async () => {
    // Clean local database tables to a fresh state with zero demo accounts, then run CLI admin bootstrap
    await prisma.auditLog.deleteMany();
    await prisma.topicFeedbackEntry.deleteMany();
    await prisma.userLearningState.deleteMany();
    await prisma.invitationCode.deleteMany();
    await prisma.user.deleteMany();

    const out = execSync(
      `npm run bootstrap:admin -- --email "${ADMIN_EMAIL}" --password "${ADMIN_PASS}" --name "Dojo Sensei"`,
      { cwd: process.cwd(), encoding: "utf8" }
    );
    expect(out).toContain("Successfully bootstrapped initial ADMIN user");

    // Verify a second bootstrap attempt is refused when an ADMIN already exists
    let secondFailed = false;
    try {
      execSync(
        `npm run bootstrap:admin -- --email "second@llmdojo.local" --password "${ADMIN_PASS}"`,
        { cwd: process.cwd(), stdio: "pipe" }
      );
    } catch {
      secondFailed = true;
    }
    expect(secondFailed).toBe(true);
  });

  test("1. Home, Curriculum, Modules, Topic Lessons, Interactive Labs & Theme Toggle", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("header")).toBeVisible();
    await expect(page.getByRole("link", { name: /LLM Dojo/i }).first()).toBeVisible();

    // Toggle theme between dark and light
    const html = page.locator("html");
    const initialTheme = await html.getAttribute("data-theme");
    const themeBtn = page.locator("header button[aria-label*='theme' i], header button[title*='theme' i]").first();
    if (await themeBtn.count()) {
      await themeBtn.click();
      const nextTheme = await html.getAttribute("data-theme");
      expect(nextTheme).not.toBe(initialTheme);
    }

    // Curriculum page
    await page.goto("/curriculum");
    await expect(page.locator("h1")).toContainText(/Curriculum/i);
    await expect(page.getByText(/Model Foundations/i).first()).toBeVisible();

    // BPE Tokenization Lesson & Interactive Lab + QuickCheck
    await page.goto("/learn/model-foundations/tokenization/byte-pair-encoding");
    await expect(page.locator("h1")).toContainText(/Byte pair encoding/i);
    await expect(page.getByText(/Quick check/i).first()).toBeVisible();

    // Token Counts / TokenizerLab lesson with real Tiktoken encodings
    await page.goto("/learn/model-foundations/tokenization/token-counts");
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.getByText(/o200k_base|cl100k_base|GPT-2/i).first()).toBeVisible();

    // Real MiniLM 384-d Embeddings Explorer (async dataset chunk)
    await page.goto("/learn/model-foundations/embeddings/explore-real-embeddings");
    await expect(page.locator("h1")).toContainText(/Explore real embeddings/i);
    await expect(page.getByText(/all-MiniLM-L6-v2|384/i).first()).toBeVisible();

    // Multi-head Attention Explorer (GPT-2 attention heatmaps)
    await page.goto("/learn/model-foundations/attention/many-heads");
    await expect(page.locator("h1")).toContainText(/Many heads/i);

    // GoodputLab lesson
    await page.goto("/learn/inference-optimization/measuring-inference/goodput");
    await expect(page.locator("h1")).toContainText(/Goodput/i);
  });

  test("2. Neural Network Playground, Interview Hub, Dedicated Question Pages, Company Guides, Glossary & Search (⌘K)", async ({
    page,
  }) => {
    // Neural Network Playground
    await page.goto("/playground");
    await expect(page.locator("h1")).toContainText(/Neural Network Playground/i);
    await expect(page.locator("canvas").first()).toBeVisible();

    // Interview Question Bank
    await page.goto("/interview");
    await expect(page.locator("h1")).toContainText(/Interview/i);
    const searchInput = page.locator("input[type='search'], input[placeholder*='Search' i]").first();
    await searchInput.fill("KV cache");
    await expect(page.getByText(/KV cache/i).first()).toBeVisible();

    // Dedicated /interview/q/[slug] standalone article pages (492 routes)
    await page.goto(
      "/interview/q/when-you-send-a-prompt-to-a-language-model-what-does-the"
    );
    await expect(page.locator("h1")).toContainText(
      /When you send a prompt to a language model/i
    );
    await expect(page.getByText(/Model answer/i).first()).toBeVisible();
    await expect(page.getByText(/integer IDs/i).first()).toBeVisible();

    // Company Guides
    await page.goto("/interview/companies");
    await expect(page.locator("h1")).toContainText(/Compan/i);
    await page.goto("/interview/companies/openai");
    await expect(page.locator("h1")).toContainText(/OpenAI/i);

    // Glossary
    await page.goto("/glossary");
    await expect(page.locator("h1")).toContainText(/Glossary/i);
    await expect(page.getByText(/Attention/i).first()).toBeVisible();

    // Global Search Dialog (⌘K button in header)
    const searchTrigger = page
      .locator("header")
      .getByRole("button", { name: /Search/i })
      .first();
    await searchTrigger.click();
    const searchDialog = page.locator("dialog[aria-label='Search']");
    const dialogInput = searchDialog.locator("input").first();
    await expect(dialogInput).toBeVisible();
    await dialogInput.fill("RoPE");
    await expect(searchDialog.getByText(/FlashAttention/i).first()).toBeVisible();
  });

  test("3. Admin Sign-In, Invite Issuance, Invite Redemption, Cloud State Sync, RBAC & Revocation", async ({
    page,
    browser,
  }) => {
    // Sign in as bootstrapped ADMIN
    await page.goto("/sign-in");
    await page.locator("input[name='email']").fill(ADMIN_EMAIL);
    await page.locator("input[name='password']").fill(ADMIN_PASS);
    await page.locator("button[type='submit']").click();
    await page.waitForURL("**/curriculum");

    // Open Admin Governance Console
    await page.goto("/admin");
    await expect(page.locator("h1")).toContainText(/LLM Dojo Admin Console/i);

    // Create two invitations: one to revoke immediately, one for a learner to redeem
    await page.getByRole("button", { name: /Generate Invite/i }).click();
    const firstToken = (
      await page.getByTestId("generated-invite-token").textContent()
    )?.trim()!;
    expect(firstToken).toMatch(/^DOJO-[2-9A-Z]{4}-[2-9A-Z]{4}-[2-9A-Z]{4}$/);

    // Revoke the first invite via the table
    const firstPrefix = firstToken.slice(0, 9);
    await page
      .getByTestId(`invite-row-${firstPrefix}`)
      .getByRole("button", { name: /Revoke/i })
      .click();
    await expect(page.getByTestId(`invite-row-${firstPrefix}`)).toContainText(
      "REVOKED"
    );

    // Issue a second invite for learner@llmdojo.local
    await page
      .locator("input[placeholder='learner@company.com']")
      .fill("learner@llmdojo.local");
    await page.getByRole("button", { name: /Generate Invite/i }).click();
    await expect(page.getByTestId("generated-invite-token")).not.toHaveText(
      firstToken
    );
    const secondToken = (
      await page.getByTestId("generated-invite-token").textContent()
    )?.trim()!;
    expect(secondToken).not.toBe(firstToken);

    // Open an isolated learner browser context
    const learnerContext = await browser.newContext();
    const learnerPage = await learnerContext.newPage();

    // Verify revoked invite is rejected on /invite/[token]
    await learnerPage.goto(`/invite/${firstToken}`);
    await expect(learnerPage.getByTestId("invite-error-banner")).toContainText(
      /revoked/i
    );

    // Redeem valid secondToken on /invite/[token]
    await learnerPage.goto(`/invite/${secondToken}`);
    await expect(learnerPage.getByTestId("invite-valid-banner")).toContainText(
      /Valid invitation/i
    );
    await learnerPage.locator("input[name='name']").fill("Ada Learner");
    await learnerPage.locator("input[name='email']").fill("learner@llmdojo.local");
    await learnerPage.locator("input[name='password']").fill("LearnerPass123!");
    await learnerPage.locator("button[type='submit']").click();
    await learnerPage.waitForURL("**/curriculum");

    // Verify single-use invite cannot be reused
    const reuseValidate = await learnerPage.request.get(
      `/api/invitations/validate?token=${encodeURIComponent(secondToken)}`
    );
    expect(reuseValidate.status()).toBe(400);

    // Verify learner can sync state via /api/user/state
    const putState = await learnerPage.request.put("/api/user/state", {
      data: {
        progress: {
          visited: { "/learn/llms/tokenization/bpe": Date.now() },
          last: "/learn/llms/tokenization/bpe",
        },
        interviewStatus: { "foundations-bias-variance": "got-it" },
      },
    });
    expect(putState.status()).toBe(200);

    const getState = await learnerPage.request.get("/api/user/state");
    expect(getState.status()).toBe(200);
    const stateJson = await getState.json();
    expect(stateJson.progress.last).toBe("/learn/llms/tokenization/bpe");
    expect(stateJson.interviewStatus["foundations-bias-variance"]).toBe(
      "got-it"
    );

    // Verify USER role is forbidden from /admin and /api/admin/users
    const userAdminApi = await learnerPage.request.get("/api/admin/users");
    expect(userAdminApi.status()).toBe(403);
    await learnerPage.goto("/admin");
    await expect(learnerPage.getByTestId("admin-forbidden")).toBeVisible();

    // Back in ADMIN session: switch to Users & Roles tab, revoke learner@llmdojo.local
    await page.getByRole("button", { name: /Users & Roles/i }).click();
    const learnerRow = page.getByTestId("user-row-learner@llmdojo.local");
    await expect(learnerRow).toBeVisible();
    await learnerRow.getByRole("button", { name: /Revoke Access/i }).click();
    await expect(learnerRow).toContainText("REVOKED");
    await expect(learnerRow).toContainText("v2");

    // Immediately verify learner's existing JWT session is invalidated (401 Unauthorized)
    const revokedStateCheck = await learnerPage.request.get("/api/user/state");
    expect(revokedStateCheck.status()).toBe(401);

    // Verify Audit Logs tab records BOOTSTRAP_ADMIN_CREATED, INVITE_CREATED, INVITE_REVOKED, INVITE_REDEEMED, USER_REVOKED
    await page.getByRole("button", { name: /Audit Logs/i }).click();
    await expect(
      page.getByTestId("audit-row-BOOTSTRAP_ADMIN_CREATED").first()
    ).toBeVisible();
    await expect(
      page.getByTestId("audit-row-INVITE_CREATED").first()
    ).toBeVisible();
    await expect(
      page.getByTestId("audit-row-INVITE_REVOKED").first()
    ).toBeVisible();
    await expect(
      page.getByTestId("audit-row-INVITE_REDEEMED").first()
    ).toBeVisible();
    await expect(
      page.getByTestId("audit-row-USER_REVOKED").first()
    ).toBeVisible();

    await learnerContext.close();
  });

  test("4. Responsive Viewports (Mobile, Tablet, Desktop), Progress, Profile, Topic Feedback & Health API", async ({
    page,
  }) => {
    // Health endpoint check
    const healthRes = await page.request.get("/api/health");
    expect(healthRes.status()).toBe(200);
    const healthJson = await healthRes.json();
    expect(healthJson.status).toBe("ok");

    // Topic feedback submission
    const feedbackRes = await page.request.post("/api/feedback", {
      data: {
        topicPath: "/learn/model-foundations/tokenization/byte-pair-encoding",
        helpful: true,
        message: "Interactive BPE merge slider is crystal clear!",
      },
    });
    expect(feedbackRes.status()).toBe(201);

    // Mobile viewport (390x844): verify bottom navigation bar is visible
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/progress");
    await expect(page.locator("h1")).toContainText(/Your progress/i);
    await expect(
      page.locator("nav[aria-label='Mobile'], nav[aria-label='Primary'], nav").last()
    ).toBeVisible();

    // Tablet viewport (768x1024): verify account page
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/account");
    await expect(page.locator("h1")).toContainText(/Profile/i);

    // Desktop viewport (1440x900): verify left rail navigation
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/learn/model-foundations/attention/queries-keys-values");
    await expect(page.locator("h1")).toContainText(/Queries, keys and values/i);
    await expect(page.locator("[data-rail]")).toBeVisible();
  });

  test("5. Interactive Lab & Feature Verification Across All 7 Modules With Zero Browser Runtime Errors", async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => {
      pageErrors.push(`${page.url()}: ${err.message}`);
    });

    const representativeLabRoutes = [
      // Module 1: Model Foundations
      "/learn/model-foundations/how-networks-learn/gradient-descent", // GradientLab
      "/learn/model-foundations/how-networks-learn/hidden-layers", // NetLab
      "/learn/model-foundations/tokenization/models-do-not-read-text", // TokenPipeline
      "/learn/model-foundations/tokenization/byte-pair-encoding", // BpeStepper + QuickCheck + Predict
      "/learn/model-foundations/embeddings/measuring-similarity", // CosineLab
      "/learn/model-foundations/embeddings/explore-real-embeddings", // EmbeddingExplorer (384-d MiniLM)
      "/learn/model-foundations/embeddings/using-embeddings", // SearchLab
      "/learn/model-foundations/attention/one-vector-is-not-enough", // AttentionMathLab
      "/learn/model-foundations/attention/many-heads", // AttentionExplorer
      "/learn/model-foundations/attention/the-cost-of-attention", // AttentionCost + RunningExample
      "/learn/model-foundations/sampling/the-generation-loop", // BranchingTree
      "/learn/model-foundations/context/the-context-window", // TokenizerLab (Tiktoken)
      "/learn/model-foundations/context/how-a-model-knows-order", // PositionSimilarity
      "/learn/model-foundations/context/kv-cache-memory", // KvCacheLab
      "/learn/model-foundations/context/what-long-context-costs", // PrefillDecodeChart
      "/learn/model-foundations/limits/probability-is-not-truth", // SamplingPlayground
      "/learn/model-foundations/limits/likely-not-true", // TokenReplay
      "/learn/model-foundations/limits/confidently-wrong", // FactCheckLab
      "/learn/model-foundations/limits/errors-that-snowball", // GenerationRuns
      "/learn/model-foundations/limits/capstone", // BrowserGPT2
      // Module 2: Inference & Optimization
      "/learn/inference-optimization/measuring-inference/measuring-a-stream", // StreamTimeline
      "/learn/inference-optimization/measuring-inference/latency-is-a-distribution", // LatencyDistribution
      "/learn/inference-optimization/measuring-inference/prompt-length-and-hardware", // LatencyCalculator
      "/learn/inference-optimization/measuring-inference/throughput", // ThroughputChart
      "/learn/inference-optimization/measuring-inference/goodput", // GoodputLab
      "/learn/inference-optimization/where-the-time-goes/the-roofline", // RooflineChart
      "/learn/inference-optimization/where-the-time-goes/batching-shares-the-read", // BatchStepChart
      "/learn/inference-optimization/where-the-time-goes/memory-sets-the-batch", // MemoryFit
      "/learn/inference-optimization/where-the-time-goes/simulating-the-strategies", // BatchingSimulator
      "/learn/inference-optimization/precision-and-quantization/fewer-bytes-per-weight", // FormatBits
      "/learn/inference-optimization/precision-and-quantization/range-and-precision", // FloatRounder
      "/learn/inference-optimization/precision-and-quantization/measuring-the-error", // QuantizerLab
      "/learn/inference-optimization/precision-and-quantization/fewer-bytes-faster-decode", // DecodeEstimate
      "/learn/inference-optimization/precision-and-quantization/more-conversations-fit", // QuantizedMemory
      "/learn/inference-optimization/cost-per-request/batching-cuts-cost", // CostByBatch
      "/learn/inference-optimization/cost-per-request/api-or-self-host", // CostCalculator
      "/learn/inference-optimization/caching-repeated-work/faster-first-token", // PrefixCacheCalculator
      "/learn/inference-optimization/caching-repeated-work/cheaper-input", // PrefixCacheBill
      "/learn/inference-optimization/caching-repeated-work/semantic-caching", // SemanticCacheLab
      "/learn/inference-optimization/benchmarks-and-capstone/same-machine-different-numbers", // RunToRunChart
      "/learn/inference-optimization/benchmarks-and-capstone/hardware-depends-on-the-workload", // HardwareRatios
      "/learn/inference-optimization/benchmarks-and-capstone/comparing-providers", // UnfairComparison
      "/learn/inference-optimization/benchmarks-and-capstone/capstone-planner", // CapstonePlanner
      // Module 3: Prompt & Context Engineering
      "/learn/prompt-context-engineering/prompt-anatomy/chat-templates", // ChatTemplateLab
      "/learn/prompt-context-engineering/prompt-anatomy/template-mismatch", // TemplateMistakes
      "/learn/prompt-context-engineering/prompt-anatomy/every-token-costs", // FormatCost
      "/learn/prompt-context-engineering/examples-and-structured-outputs/validate-and-repair", // StructuredValidator
      "/learn/prompt-context-engineering/examples-and-structured-outputs/measuring-the-parse-rate", // RetryBudget
      "/learn/prompt-context-engineering/tools-and-constrained-outputs/constraining-gpt2", // ConstrainedSampler
      "/learn/prompt-context-engineering/tools-and-constrained-outputs/arguments-are-untrusted", // ToolCallValidator
      "/learn/prompt-context-engineering/context-selection/lost-in-the-middle", // PositionCurve
      "/learn/prompt-context-engineering/context-selection/ordering-the-context", // ContextPacker
      "/learn/prompt-context-engineering/prompt-versioning/compare-case-by-case", // RegressionRunner
      "/learn/prompt-context-engineering/prompt-injection/trust-boundaries", // TrustBoundaryLab
      "/learn/prompt-context-engineering/prompt-injection/no-complete-defence", // DefencePlanner
      // Module 4: Evaluation & Experimentation
      "/learn/evaluation-experimentation/success-criteria/rubrics-with-examples", // EvalCriteriaLab
      "/learn/evaluation-experimentation/reference-scoring/exact-match", // RefScoringLab
      "/learn/evaluation-experimentation/ai-as-a-judge/check-the-judge", // JudgeLab
      "/learn/evaluation-experimentation/comparing-systems/ablations", // CompareLab
      "/learn/evaluation-experimentation/error-analysis/fix-first", // ErrorAnalysisLab
      // Module 5: Retrieval & Knowledge Systems
      "/learn/retrieval-knowledge-systems/rag-architecture/retrieval-caps-the-answer", // RagLab
      "/learn/retrieval-knowledge-systems/chunking-and-indexing/contextual-retrieval", // ChunkingLab
      "/learn/retrieval-knowledge-systems/term-and-embedding-retrieval/bm25", // TermRetrievalLab
      "/learn/retrieval-knowledge-systems/hybrid-search-and-reranking/hybrid-wrap-up", // HybridLab
      "/learn/retrieval-knowledge-systems/evaluating-rag/citations", // RagEvalLab
      // Module 6: Agents & Harness Engineering
      "/learn/agents-harness-engineering/agents-and-the-loop/compound-errors", // AgentLab
      "/learn/agents-harness-engineering/workflows-and-agents/check-the-plan", // WorkflowLab
      "/learn/agents-harness-engineering/state-and-memory/dropping-old-messages", // ContextRunLab
      "/learn/agents-harness-engineering/failures-and-recovery/backoff-and-jitter", // RecoveryLab
      "/learn/agents-harness-engineering/traces-and-evaluation/read-a-failing-trace", // AgentEvalLab
      "/learn/agents-harness-engineering/bounded-autonomy/lethal-trifecta", // AutonomyLab
      // Module 7: Production AI Systems
      "/learn/production-ai-systems/model-selection-and-routing/route-by-difficulty", // RoutingLab
      "/learn/production-ai-systems/fallbacks-and-degradation/circuit-breakers", // FallbackLab
      "/learn/production-ai-systems/budgets-and-usage-controls/a-cost-model", // BudgetLab
      "/learn/production-ai-systems/observability-and-incidents/break-it-down", // IncidentLab
      "/learn/production-ai-systems/guardrails-and-safe-deployment/canary-and-shadow", // GuardrailLab
      "/learn/production-ai-systems/when-to-fine-tune/form-or-facts", // FineTuneLab
    ];

    for (const route of representativeLabRoutes) {
      const res = await page.goto(route);
      expect(res?.status()).toBe(200);
      await expect(page.locator("h1")).toBeVisible();
    }

    expect(pageErrors).toEqual([]);
  });
});
