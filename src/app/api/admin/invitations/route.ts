import { NextResponse } from "next/server";
import { getActiveServerUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  generateInviteToken,
  VALID_ROLES,
  writeAuditLog,
  type AppRole,
} from "@/lib/admission";

export async function GET() {
  const actor = await getActiveServerUser();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (actor.role !== "ADMIN" && actor.role !== "INSTRUCTOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const invitations = await prisma.invitationCode.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { id: true, email: true, name: true } },
      redeemedBy: { select: { id: true, email: true, name: true } },
    },
  });

  return NextResponse.json({ invitations });
}

export async function POST(request: Request) {
  const actor = await getActiveServerUser();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (actor.role !== "ADMIN" && actor.role !== "INSTRUCTOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const rawEmail = body.email ? String(body.email).trim().toLowerCase() : null;
  const assignedRole = String(body.assignedRole ?? "USER").toUpperCase() as AppRole;
  const expiresInHours = Number(body.expiresInHours ?? 168);
  const maxUses = Math.max(1, Math.min(100, Number(body.maxUses ?? 1)));
  const note = body.note ? String(body.note).trim().slice(0, 500) : null;

  if (!VALID_ROLES.includes(assignedRole)) {
    return NextResponse.json({ error: "Invalid assignedRole." }, { status: 400 });
  }

  if (actor.role === "INSTRUCTOR" && assignedRole === "ADMIN") {
    return NextResponse.json(
      { error: "Instructors cannot issue ADMIN invitations." },
      { status: 403 }
    );
  }

  const { rawToken, codePrefix, tokenHash } = generateInviteToken();
  const expiresAt = new Date(
    Date.now() + Math.max(1, expiresInHours) * 60 * 60 * 1000
  );

  const invitation = await prisma.invitationCode.create({
    data: {
      codePrefix,
      tokenHash,
      email: rawEmail || null,
      assignedRole,
      status: "PENDING",
      maxUses,
      useCount: 0,
      note,
      expiresAt,
      createdById: actor.id,
    },
  });

  await writeAuditLog({
    action: "INVITE_CREATED",
    actorId: actor.id,
    actorEmail: actor.email,
    targetId: invitation.id,
    metadata: {
      codePrefix,
      email: rawEmail,
      assignedRole,
      maxUses,
      expiresAt: expiresAt.toISOString(),
    },
  });

  return NextResponse.json(
    {
      invitation,
      rawToken,
      inviteUrl: `/invite/${rawToken}`,
    },
    { status: 201 }
  );
}
