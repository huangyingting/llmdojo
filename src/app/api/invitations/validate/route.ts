import { NextResponse } from "next/server";
import { validateInvitationToken } from "@/lib/admission";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token") ?? "";
  const email = searchParams.get("email") ?? undefined;

  const result = await validateInvitationToken(token, email);
  return NextResponse.json(result, { status: result.valid ? 200 : 400 });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const token = String(body.token ?? "");
  const email = body.email ? String(body.email) : undefined;

  const result = await validateInvitationToken(token, email);
  return NextResponse.json(result, { status: result.valid ? 200 : 400 });
}
