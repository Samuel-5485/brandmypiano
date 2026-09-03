import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  adminConfigured,
  checkPassword,
  createAdminToken,
} from "@/lib/auth";
import { isRateLimited, recordFailedAttempt, clientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

function deny() {
  return NextResponse.json({ ok: false }, { status: 401 });
}

export async function POST(request: Request) {
  const ip = clientIp(request);
  const rlKey = `admin-login:${ip}`;
  if (isRateLimited(rlKey, MAX_ATTEMPTS, WINDOW_MS)) {
    return deny();
  }

  if (!adminConfigured()) {
    recordFailedAttempt(rlKey, MAX_ATTEMPTS, WINDOW_MS);
    return deny();
  }

  let body: { key?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    recordFailedAttempt(rlKey, MAX_ATTEMPTS, WINDOW_MS);
    return deny();
  }

  const candidate = String(body.key ?? body.password ?? "");
  if (!checkPassword(candidate)) {
    recordFailedAttempt(rlKey, MAX_ATTEMPTS, WINDOW_MS);
    return deny();
  }

  const token = await createAdminToken();
  if (!token) {
    return deny();
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
