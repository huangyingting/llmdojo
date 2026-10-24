import { NextResponse } from "next/server";
import { getActiveServerUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const actor = await getActiveServerUser();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (actor.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") ?? undefined;
  const limit = Math.min(250, Math.max(1, Number(searchParams.get("limit") ?? 100)));

  const auditLogs = await prisma.auditLog.findMany({
    where: action ? { action } : undefined,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      actor: { select: { id: true, email: true, name: true } },
      targetUser: { select: { id: true, email: true, name: true } },
    },
  });

  return NextResponse.json({ auditLogs });
}
