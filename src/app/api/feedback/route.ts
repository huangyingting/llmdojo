import { NextResponse } from "next/server";
import { getActiveServerUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const topicPath = String(body.topicPath ?? body.path ?? "").trim();
    const helpful = Boolean(body.helpful);
    const message = body.message ? String(body.message).trim().slice(0, 2000) : null;

    if (!topicPath) {
      return NextResponse.json(
        { error: "topicPath is required." },
        { status: 400 }
      );
    }

    const user = await getActiveServerUser();

    const entry = await prisma.topicFeedbackEntry.create({
      data: {
        userId: user?.id ?? null,
        topicPath,
        helpful,
        message,
      },
    });

    return NextResponse.json({ id: entry.id, saved: true }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Could not save feedback." },
      { status: 500 }
    );
  }
}
