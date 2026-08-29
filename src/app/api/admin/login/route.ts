import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  adminConfigured,
  checkPassword,
  createAdminToken,
} from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!adminConfigured()) {
    return NextResponse.json(
      { error: "Set ADMIN_PASSWORD in your environment first." },
      { status: 500 },
    );
  }

  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (!checkPassword(String(body.password ?? ""))) {
    return NextResponse.json({ error: "Wrong password." }, { status: 401 });
  }

  const token = await createAdminToken();
  if (!token) {
    return NextResponse.json({ error: "Could not create session." }, { status: 500 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return res;
}
