import { NextResponse } from "next/server";
import { getActiveServerUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const actor = await getActiveServerUser();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (actor.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
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
      learningState: {
        select: {
          progressJson: true,
          reviewCardsJson: true,
          interviewStatusJson: true,
          updatedAt: true,
        },
      },
    },
  });

  return NextResponse.json({ users });
}
