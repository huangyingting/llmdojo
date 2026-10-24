import { NextResponse } from "next/server";
import { getActiveServerUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { VALID_ROLES, writeAuditLog, type AppRole } from "@/lib/admission";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const actor = await getActiveServerUser();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (actor.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const updates: {
    role?: string;
    status?: string;
    revokedAt?: Date | null;
    revokedReason?: string | null;
    sessionVersion?: { increment: number };
  } = {};

  let auditAction: string | null = null;
  const metadata: Record<string, unknown> = {};

  if (body.role !== undefined) {
    const nextRole = String(body.role).toUpperCase() as AppRole;
    if (!VALID_ROLES.includes(nextRole)) {
      return NextResponse.json({ error: "Invalid role." }, { status: 400 });
    }
    if (target.id === actor.id && nextRole !== "ADMIN") {
      return NextResponse.json(
        { error: "Administrators cannot demote their own account." },
        { status: 400 }
      );
    }
    updates.role = nextRole;
    auditAction = "USER_ROLE_CHANGED";
    metadata.previousRole = target.role;
    metadata.newRole = nextRole;
  }

  if (body.status !== undefined) {
    const nextStatus = String(body.status).toUpperCase();
    if (nextStatus !== "ACTIVE" && nextStatus !== "REVOKED") {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }
    if (target.id === actor.id && nextStatus === "REVOKED") {
      return NextResponse.json(
        { error: "Administrators cannot revoke their own account." },
        { status: 400 }
      );
    }
    updates.status = nextStatus;
    if (nextStatus === "REVOKED") {
      updates.revokedAt = new Date();
      updates.revokedReason = body.revokedReason
        ? String(body.revokedReason).slice(0, 500)
        : "Revoked by administrator";
      updates.sessionVersion = { increment: 1 };
      auditAction = "USER_REVOKED";
      metadata.reason = updates.revokedReason;
    } else {
      updates.revokedAt = null;
      updates.revokedReason = null;
      auditAction = "USER_RESTORED";
    }
  }

  const updated = await prisma.user.update({
    where: { id },
    data: updates,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      revokedAt: true,
      revokedReason: true,
      sessionVersion: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (auditAction) {
    await writeAuditLog({
      action: auditAction,
      actorId: actor.id,
      actorEmail: actor.email,
      targetUserId: updated.id,
      metadata,
    });
  }

  return NextResponse.json({ user: updated });
}
