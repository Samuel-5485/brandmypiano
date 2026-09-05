import { hasSupabaseAdmin, uploadLogo } from "@/lib/supabase/rest";

export const MAX_LOGO_BYTES = 400_000;
/** Admin logo uploads (PNG / JPG / SVG). */
export const ADMIN_MAX_LOGO_BYTES = 1_048_576;

const ALLOWED = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

function extFor(type: string): string {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/gif") return "gif";
  if (type === "image/svg+xml") return "svg";
  return "jpg";
}

function logoObjectName(contentType: string): string {
  return `logo_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}.${extFor(contentType)}`;
}

export function parseSupabaseError(raw: string, fallback: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return fallback;
  try {
    const parsed = JSON.parse(trimmed) as {
      message?: string;
      error?: string;
      statusCode?: string | number;
    };
    const parts = [parsed.message, parsed.error, parsed.statusCode]
      .filter(Boolean)
      .map(String);
    if (parts.length) return parts.join(" — ");
  } catch {
    // plain text from Supabase
  }
  return trimmed.slice(0, 500);
}

export async function uploadLogoBuffer(
  buffer: Buffer,
  contentType: string,
  maxBytes = MAX_LOGO_BYTES,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  if (!hasSupabaseAdmin()) {
    return { ok: false, error: "Logo storage is not configured (Supabase env missing)." };
  }
  if (!ALLOWED.has(contentType)) {
    return { ok: false, error: "Use PNG, JPG, WebP, GIF, or SVG." };
  }
  if (buffer.length <= 0 || buffer.length > maxBytes) {
    const limitKb = Math.round(maxBytes / 1024);
    return { ok: false, error: `Logo must be under ${limitKb}KB.` };
  }

  try {
    const url = await uploadLogo(logoObjectName(contentType), buffer, contentType);
    return { ok: true, url };
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    const error = parseSupabaseError(raw, "Logo upload failed.");
    return { ok: false, error };
  }
}
