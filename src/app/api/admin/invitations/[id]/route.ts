import { NextResponse } from "next/server";
import { getActiveServerUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/admission";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const actor = await getActiveServerUser();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (actor.role !== "ADMIN" && actor.role !== "INSTRUCTOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const action = String(body.action ?? "REVOKE").toUpperCase();

  if (action !== "REVOKE") {
    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  }

  const invite = await prisma.invitationCode.findUnique({ where: { id } });
  if (!invite) {
    return NextResponse.json({ error: "Invitation not found." }, { status: 404 });
  }

  const updated = await prisma.invitationCode.update({
    where: { id },
    data: {
      status: "REVOKED",
      revokedAt: new Date(),
    },
  });

  await writeAuditLog({
    action: "INVITE_REVOKED",
    actorId: actor.id,
    actorEmail: actor.email,
    targetId: updated.id,
    metadata: {
      codePrefix: updated.codePrefix,
      email: updated.email,
    },
  });

  return NextResponse.json({ invitation: updated });
}
