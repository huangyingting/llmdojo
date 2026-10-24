import { NextResponse } from "next/server";
import { getActiveServerUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const actor = await getActiveServerUser();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (actor.role !== "ADMIN" && actor.role !== "INSTRUCTOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const feedback = await prisma.topicFeedbackEntry.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      user: { select: { id: true, email: true, name: true } },
    },
  });

  return NextResponse.json({ feedback });
}
