import { NextResponse } from "next/server";

export function apiError(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

export function apiOk<T extends Record<string, unknown>>(data: T, status = 200) {
  return NextResponse.json({ ok: true, ...data }, { status });
}
