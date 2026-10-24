import { describe, expect, it, beforeEach } from "vitest";
import {
  generateInviteToken,
  hashInviteToken,
  hashPassword,
  normalizeInviteToken,
  redeemInvitationAndRegisterUser,
  validateInvitationToken,
  verifyPassword,
  writeAuditLog,
} from "@/lib/admission";
import { prisma } from "@/lib/prisma";
import {
  getAllDojoRoutePaths,
  getDojoPage,
  normalizeDojoRoutePath,
} from "@/lib/dojo-pages";

describe("LLM Dojo Route & Curriculum AST Bundle", () => {
  it("loads all 903 routes (411 curriculum/hub/company pages + 492 interview question pages) from dojo-pages.json cleanly", () => {
    const routes = getAllDojoRoutePaths();
    expect(routes.length).toBe(903);
    expect(routes).toContain("/");
    expect(routes).toContain("/curriculum");
    expect(routes).toContain("/playground");
    expect(routes).toContain("/interview");
    expect(routes).toContain("/interview/companies");
    expect(routes).toContain("/interview/companies/openai");
    expect(routes).toContain(
      "/interview/q/when-you-send-a-prompt-to-a-language-model-what-does-the"
    );
    expect(routes).toContain("/glossary");
    expect(routes).toContain("/progress");
    expect(routes).toContain(
      "/learn/model-foundations/tokenization/byte-pair-encoding"
    );
    expect(routes).toContain(
      "/learn/inference-optimization/measuring-inference/goodput"
    );
  });

  it("normalizes top-level module aliases to canonical /learn/* paths", () => {
    expect(normalizeDojoRoutePath("/model-foundations")).toBe(
      "/learn/model-foundations"
    );
    expect(
      normalizeDojoRoutePath(
        "/model-foundations/tokenization/byte-pair-encoding"
      )
    ).toBe("/learn/model-foundations/tokenization/byte-pair-encoding");
    const page = getDojoPage(
      "/model-foundations/tokenization/byte-pair-encoding"
    );
    expect(page).not.toBeNull();
    expect(page?.title).toContain("Byte pair encoding");
  });
});

describe("Invite-Only Admission, Scrypt Hashing, RBAC & Audit Logging", () => {
  beforeEach(async () => {
    await prisma.auditLog.deleteMany();
    await prisma.topicFeedbackEntry.deleteMany();
    await prisma.invitationCode.deleteMany();
    await prisma.userLearningState.deleteMany();
    await prisma.user.deleteMany();
  });

  it("hashes and verifies passwords with scrypt and timingSafeEqual", () => {
    const hash = hashPassword("CorrectHorseBatteryStaple!");
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(verifyPassword("CorrectHorseBatteryStaple!", hash)).toBe(true);
    expect(verifyPassword("WrongPassword123!", hash)).toBe(false);
  });

  it("generates DOJO-XXXX-XXXX-XXXX invitation tokens and SHA-256 hashes", () => {
    const { rawToken, codePrefix, tokenHash } = generateInviteToken();
    expect(rawToken).toMatch(/^DOJO-[2-9A-Z]{4}-[2-9A-Z]{4}-[2-9A-Z]{4}$/);
    expect(codePrefix).toBe(rawToken.slice(0, 9));
    expect(hashInviteToken(rawToken.toLowerCase())).toBe(tokenHash);
    expect(normalizeInviteToken("  dojo-abcd-1234-efgh ")).toBe(
      "DOJO-ABCD-1234-EFGH"
    );
  });

  it("enforces single-use, email-bound, expired, and revoked invitation rules with audit logs", async () => {
    const admin = await prisma.user.create({
      data: {
        email: "admin@llmdojo.test",
        name: "Test Admin",
        passwordHash: hashPassword("AdminPass123!"),
        role: "ADMIN",
        status: "ACTIVE",
      },
    });

    const { rawToken, codePrefix, tokenHash } = generateInviteToken();
    const invite = await prisma.invitationCode.create({
      data: {
        codePrefix,
        tokenHash,
        email: "alice@llmdojo.test",
        assignedRole: "INSTRUCTOR",
        status: "PENDING",
        maxUses: 1,
        useCount: 0,
        expiresAt: new Date(Date.now() + 3600_000),
        createdById: admin.id,
      },
    });

    // Wrong email should be rejected
    await expect(
      redeemInvitationAndRegisterUser({
        token: rawToken,
        email: "bob@llmdojo.test",
        password: "Password123!",
        name: "Bob",
      })
    ).rejects.toThrow(/restricted to a different email/i);

    // Valid redemption succeeds and assigns INSTRUCTOR role
    const alice = await redeemInvitationAndRegisterUser({
      token: rawToken,
      email: "alice@llmdojo.test",
      password: "Password123!",
      name: "Alice",
    });
    expect(alice.role).toBe("INSTRUCTOR");
    expect(alice.status).toBe("ACTIVE");

    // Reusing a single-use invitation is rejected
    const secondCheck = await validateInvitationToken(rawToken);
    expect(secondCheck.valid).toBe(false);
    expect(secondCheck.reason).toMatch(/already been redeemed/i);

    // Audit logs recorded both the rejection and successful redemption
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "asc" },
    });
    const actions = logs.map((l) => l.action);
    expect(actions).toContain("INVITE_REDEEM_REJECTED");
    expect(actions).toContain("INVITE_REDEEMED");

    // Expired invitation check
    const expiredGen = generateInviteToken();
    await prisma.invitationCode.create({
      data: {
        codePrefix: expiredGen.codePrefix,
        tokenHash: expiredGen.tokenHash,
        assignedRole: "USER",
        status: "PENDING",
        maxUses: 1,
        useCount: 0,
        expiresAt: new Date(Date.now() - 60_000),
        createdById: admin.id,
      },
    });
    const expiredCheck = await validateInvitationToken(expiredGen.rawToken);
    expect(expiredCheck.valid).toBe(false);
    expect(expiredCheck.reason).toMatch(/expired/i);

    // Revoked invitation check
    const revokedGen = generateInviteToken();
    await prisma.invitationCode.create({
      data: {
        codePrefix: revokedGen.codePrefix,
        tokenHash: revokedGen.tokenHash,
        assignedRole: "USER",
        status: "REVOKED",
        revokedAt: new Date(),
        maxUses: 1,
        useCount: 0,
        expiresAt: new Date(Date.now() + 3600_000),
        createdById: admin.id,
      },
    });
    const revokedCheck = await validateInvitationToken(revokedGen.rawToken);
    expect(revokedCheck.valid).toBe(false);
    expect(revokedCheck.reason).toMatch(/revoked/i);

    await writeAuditLog({
      action: "TEST_COMPLETE",
      actorId: admin.id,
      actorEmail: admin.email,
      targetId: invite.id,
    });
  });
});
