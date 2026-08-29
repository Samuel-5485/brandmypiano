import { cookies } from "next/headers";

export const ADMIN_COOKIE = "bmp_admin";

function secret(): string {
  return process.env.ADMIN_PASSWORD?.trim() || "";
}

export function adminConfigured(): boolean {
  return Boolean(secret());
}

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sign(value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value),
  );
  return toHex(sig);
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

export async function createAdminToken(): Promise<string | null> {
  if (!secret()) return null;
  const payload = `ok:${Date.now()}`;
  const sig = await sign(payload);
  return `${payload}.${sig}`;
}

export async function verifyAdminToken(
  token: string | undefined | null,
): Promise<boolean> {
  if (!token || !secret()) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  const expected = await sign(payload);
  return timingSafeEqualHex(sig, expected);
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const jar = await cookies();
  return verifyAdminToken(jar.get(ADMIN_COOKIE)?.value);
}

export function checkPassword(password: string): boolean {
  const expected = secret();
  if (!expected) return false;
  if (password.length !== expected.length) return false;
  let out = 0;
  for (let i = 0; i < password.length; i++) {
    out |= password.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return out === 0;
}
