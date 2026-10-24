import { NextResponse } from "next/server";
import { redeemInvitationAndRegisterUser } from "@/lib/admission";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = String(body.token ?? "");
    const email = String(body.email ?? "");
    const password = String(body.password ?? "");
    const name = body.name ? String(body.name) : undefined;

    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const userAgent = request.headers.get("user-agent") ?? null;

    const user = await redeemInvitationAndRegisterUser({
      token,
      email,
      password,
      name,
      ipAddress,
      userAgent,
    });

    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Registration failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
