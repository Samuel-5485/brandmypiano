import { NextResponse } from "next/server";

export function apiError(error: string, status = 400) {
  return NextResponse.json(
    { ok: false, error },
    { status, headers: { "Content-Type": "application/json; charset=utf-8" } },
  );
}

export function apiOk<T extends Record<string, unknown>>(data: T, status = 200) {
  return NextResponse.json(
    { ok: true, ...data },
    { status, headers: { "Content-Type": "application/json; charset=utf-8" } },
  );
}
