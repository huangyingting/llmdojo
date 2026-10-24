import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { prisma } from "./prisma";

export type AppRole = "USER" | "INSTRUCTOR" | "ADMIN";
export type UserStatus = "ACTIVE" | "REVOKED";
export type InvitationStatus = "PENDING" | "REDEEMED" | "REVOKED" | "EXPIRED";

export const VALID_ROLES: readonly AppRole[] = ["USER", "INSTRUCTOR", "ADMIN"];

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") {
    return false;
  }
  const [, salt, hashHex] = parts;
  const derived = scryptSync(password, salt, 64);
  const expected = Buffer.from(hashHex, "hex");
  if (derived.length !== expected.length) {
    return false;
  }
  return timingSafeEqual(derived, expected);
}

export function normalizeInviteToken(rawToken: string): string {
  return rawToken.trim().toUpperCase().replace(/\s+/g, "");
}

export function hashInviteToken(rawToken: string): string {
  const normalized = normalizeInviteToken(rawToken);
  return createHash("sha256").update(normalized).digest("hex");
}

export function generateInviteToken(): {
  rawToken: string;
  codePrefix: string;
  tokenHash: string;
} {
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const bytes = randomBytes(12);
  let chars = "";
  for (let i = 0; i < 12; i++) {
    chars += alphabet[bytes[i] % alphabet.length];
  }
  const part1 = chars.slice(0, 4);
  const part2 = chars.slice(4, 8);
  const part3 = chars.slice(8, 12);
  const rawToken = `DOJO-${part1}-${part2}-${part3}`;
  const codePrefix = `DOJO-${part1}`;
  const tokenHash = hashInviteToken(rawToken);
  return { rawToken, codePrefix, tokenHash };
}

export interface AuditEventInput {
  action: string;
  actorId?: string | null;
  actorEmail?: string | null;
  targetUserId?: string | null;
  targetId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}

export async function writeAuditLog(input: AuditEventInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: input.action,
        actorId: input.actorId ?? null,
        actorEmail: input.actorEmail ?? null,
        targetUserId: input.targetUserId ?? null,
        targetId: input.targetId ?? null,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        metadataJson: JSON.stringify(input.metadata ?? {}),
      },
    });
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
}

export interface ValidatedInviteResult {
  valid: boolean;
  reason?: string;
  invitation?: {
    id: string;
    codePrefix: string;
    email: string | null;
    assignedRole: string;
    status: string;
    maxUses: number;
    useCount: number;
    expiresAt: Date;
    note: string | null;
  };
}

export async function validateInvitationToken(
  rawToken: string,
  candidateEmail?: string
): Promise<ValidatedInviteResult> {
  if (!rawToken || !rawToken.trim()) {
    return { valid: false, reason: "Invitation code is required." };
  }

  const tokenHash = hashInviteToken(rawToken);
  const invite = await prisma.invitationCode.findUnique({
    where: { tokenHash },
  });

  if (!invite) {
    return { valid: false, reason: "Invalid invitation code." };
  }

  if (invite.status === "REVOKED" || invite.revokedAt) {
    return { valid: false, reason: "This invitation code has been revoked." };
  }

  if (
    invite.status === "REDEEMED" ||
    invite.useCount >= invite.maxUses
  ) {
    return {
      valid: false,
      reason: "This invitation code has already been redeemed.",
    };
  }

  const now = new Date();
  if (invite.status === "EXPIRED" || invite.expiresAt <= now) {
    if (invite.status === "PENDING") {
      await prisma.invitationCode
        .update({
          where: { id: invite.id },
          data: { status: "EXPIRED" },
        })
        .catch(() => undefined);
    }
    return { valid: false, reason: "This invitation code has expired." };
  }

  if (
    invite.email &&
    candidateEmail &&
    invite.email.toLowerCase() !== candidateEmail.trim().toLowerCase()
  ) {
    return {
      valid: false,
      reason: "This invitation code is restricted to a different email address.",
    };
  }

  return {
    valid: true,
    invitation: {
      id: invite.id,
      codePrefix: invite.codePrefix,
      email: invite.email,
      assignedRole: invite.assignedRole,
      status: invite.status,
      maxUses: invite.maxUses,
      useCount: invite.useCount,
      expiresAt: invite.expiresAt,
      note: invite.note,
    },
  };
}

export interface RedeemInvitationInput {
  token: string;
  email: string;
  password: string;
  name?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function redeemInvitationAndRegisterUser(
  input: RedeemInvitationInput
) {
  const email = input.email.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Please provide a valid email address.");
  }

  if (!input.password || input.password.length < 8) {
    throw new Error("Password must be at least 8 characters long.");
  }

  const validation = await validateInvitationToken(input.token, email);
  if (!validation.valid || !validation.invitation) {
    await writeAuditLog({
      action: "INVITE_REDEEM_REJECTED",
      actorEmail: email,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      metadata: {
        reason: validation.reason ?? "Invalid invitation",
      },
    });
    throw new Error(validation.reason ?? "Invalid invitation code.");
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new Error("An account with this email address already exists.");
  }

  const passwordHash = hashPassword(input.password);
  const tokenHash = hashInviteToken(input.token);

  const user = await prisma.$transaction(async (tx) => {
    const freshInvite = await tx.invitationCode.findUnique({
      where: { tokenHash },
    });

    if (
      !freshInvite ||
      freshInvite.status !== "PENDING" ||
      freshInvite.useCount >= freshInvite.maxUses ||
      freshInvite.expiresAt <= new Date()
    ) {
      throw new Error("Invitation code is no longer valid or was already used.");
    }

    if (
      freshInvite.email &&
      freshInvite.email.toLowerCase() !== email
    ) {
      throw new Error("Invitation code is bound to a different email address.");
    }

    const createdUser = await tx.user.create({
      data: {
        email,
        name: input.name?.trim() || email.split("@")[0],
        passwordHash,
        role: freshInvite.assignedRole,
        status: "ACTIVE",
        sessionVersion: 1,
        learningState: {
          create: {},
        },
      },
    });

    const nextUseCount = freshInvite.useCount + 1;
    const isFullyRedeemed = nextUseCount >= freshInvite.maxUses;

    await tx.invitationCode.update({
      where: { id: freshInvite.id },
      data: {
        useCount: nextUseCount,
        status: isFullyRedeemed ? "REDEEMED" : "PENDING",
        redeemedAt: new Date(),
        redeemedById: isFullyRedeemed ? createdUser.id : freshInvite.redeemedById,
      },
    });

    await tx.auditLog.create({
      data: {
        action: "INVITE_REDEEMED",
        actorId: createdUser.id,
        actorEmail: createdUser.email,
        targetUserId: createdUser.id,
        targetId: freshInvite.id,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        metadataJson: JSON.stringify({
          codePrefix: freshInvite.codePrefix,
          assignedRole: freshInvite.assignedRole,
        }),
      },
    });

    return createdUser;
  });

  return user;
}
