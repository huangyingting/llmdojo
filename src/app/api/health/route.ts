import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const userCount = await prisma.user.count();
    const dbUrl = process.env.DATABASE_URL ?? "file:./dev.db";
    const provider =
      dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://")
        ? "postgresql"
        : "sqlite";

    return NextResponse.json({
      status: "ok",
      provider,
      userCount,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        status: "error",
        message: err instanceof Error ? err.message : "Database check failed",
      },
      { status: 500 }
    );
  }
}
